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

        const db = new sqlite3.Database(source, (err) => {
            if (err) return reject(err);

            const escapedPath = targetPath.replace(/'/g, "''");
            db.run(`VACUUM INTO '${escapedPath}'`, (vacuumErr) => {
                db.close((closeErr) => {
                    if (vacuumErr) {
                        try {
                            fs.copyFileSync(source, targetPath);
                            rotateBackups(targetDir, maxRetained);
                            resolve({ backupPath: targetPath, fileName: backupFileName });
                        } catch (copyErr) {
                            reject(vacuumErr || copyErr);
                        }
                    } else {
                        rotateBackups(targetDir, maxRetained);
                        resolve({ backupPath: targetPath, fileName: backupFileName });
                    }
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

module.exports = { performBackup };
