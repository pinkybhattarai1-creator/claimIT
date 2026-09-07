const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * Creates an atomic timestamped backup of the SQLite database.
 * Uses SQLite VACUUM INTO for online hot backups with zero downtime.
 */
function performBackup(sourcePath, backupDir, maxRetained = 30) {
    return new Promise((resolve, reject) => {
        const source = sourcePath || process.env.DB_PATH || path.join(__dirname, '..', 'database.db');
        const targetDir = backupDir || process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

        if (!fs.existsSync(source)) {
            return reject(new Error(`Source database file not found at: ${source}`));
        }

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
        const backupFileName = `claimit_backup_${timestamp}.db`;
        const targetPath = path.resolve(targetDir, backupFileName);

        const db = new sqlite3.Database(source, async (err) => {
            if (err) return reject(err);

            // Optional quarantine purge during backup
            try {
                const { purgeOldQuarantinedEvidence } = require('../services/evidenceService');
                purgeOldQuarantinedEvidence(90);
            } catch (pErr) {}

            // Archive audit logs older than 365 days into move_log_archive
            await archiveOldAuditLogs(db, 365);

            // Run database optimization PRAGMAs
            db.run("PRAGMA optimize;");

            // Force WAL checkpoint to flush all uncommitted WAL data into main DB file
            db.run("PRAGMA wal_checkpoint(TRUNCATE)", (walErr) => {
                if (walErr) {
                    console.warn('[Backup WAL Checkpoint Warning]:', walErr.message);
                }

                const escapedPath = targetPath.replace(/'/g, "''");
                db.run(`VACUUM INTO '${escapedPath}'`, (vacuumErr) => {
                    db.close((closeErr) => {
                        const finalize = () => {
                            rotateBackups(targetDir, maxRetained);

                            // Optional Secondary/Off-site Backup destination (NAS / Network share)
                            const secondaryDir = process.env.BACKUP_SECONDARY_DIR || process.env.BACKUP_OFFSITE_DIR;
                            if (secondaryDir) {
                                try {
                                    if (!fs.existsSync(secondaryDir)) {
                                        fs.mkdirSync(secondaryDir, { recursive: true });
                                    }
                                    const secondaryPath = path.resolve(secondaryDir, backupFileName);
                                    fs.copyFileSync(targetPath, secondaryPath);
                                    rotateBackups(secondaryDir, maxRetained);
                                    console.log(`[Backup Offsite] Mirrored backup to: ${secondaryPath}`);
                                } catch (secErr) {
                                    console.error('[Backup Offsite Warning]: Failed to mirror to secondary destination:', secErr.message);
                                }
                            }

                            resolve({ backupPath: targetPath, fileName: backupFileName });
                        };

                        if (vacuumErr) {
                            try {
                                fs.copyFileSync(source, targetPath);
                                finalize();
                            } catch (copyErr) {
                                reject(vacuumErr || copyErr);
                            }
                        } else {
                            finalize();
                        }
                    });
                });
            });
        });
    });
}

function rotateBackups(targetDir, maxRetained) {
    try {
        const files = fs.readdirSync(targetDir)
            .filter(f => f.startsWith('claimit_backup_') && f.endsWith('.db'))
            .map(f => ({
                name: f,
                path: path.join(targetDir, f),
                time: fs.statSync(path.join(targetDir, f)).mtimeMs
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length > maxRetained) {
            const toDelete = files.slice(maxRetained);
            toDelete.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                    console.log(`[Backup Rotation] Removed old backup: ${file.name}`);
                } catch (e) {}
            });
        }
    } catch (err) {
        console.error('[Backup Rotation Warning]:', err.message);
    }
}

function archiveOldAuditLogs(db, retentionDays = 365) {
    return new Promise((resolve) => {
        db.run(
            `INSERT INTO move_log_archive (log_code, asset_tag, department_name, floor, status, moved_direction, action_by_username, details, timestamp)
             SELECT COALESCE(log_code, 'CHG-LEGACY-' || id), asset_tag, department_name, floor, status, moved_direction, action_by_username, details, timestamp
             FROM move_log
             WHERE timestamp < datetime('now', '-${retentionDays} days')`,
            function(err) {
                if (err) {
                    console.warn('[Audit Archive Warning]:', err.message);
                    return resolve({ archivedCount: 0 });
                }
                const count = this.changes || 0;
                if (count > 0) {
                    db.run(`DELETE FROM move_log WHERE timestamp < datetime('now', '-${retentionDays} days')`, () => {
                        console.log(`[Audit Archive] Successfully archived ${count} audit entries older than ${retentionDays} days.`);
                        resolve({ archivedCount: count });
                    });
                } else {
                    resolve({ archivedCount: 0 });
                }
            }
        );
    });
}

if (require.main === module) {
    console.log('[ClaimIT Backup] Initiating database backup...');
    performBackup()
        .then(res => {
            console.log(`[ClaimIT Backup] Backup successfully created at: ${res.backupPath}`);
            process.exit(0);
        })
        .catch(err => {
            console.error(`[ClaimIT Backup Error]:`, err.message);
            process.exit(1);
        });
}

module.exports = { performBackup, archiveOldAuditLogs };
