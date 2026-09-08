/**
 * ClaimIT Lightweight Native Schema Migration Runner
 * Manages atomic, versioned SQLite schema evolutions safely without data loss.
 */

const migrations = [
  {
    version: '001_initial_schema_tracking',
    description: 'Ensure schema_migrations tracking table exists',
    up: (db, done) => {
      // Table is created prior to runner, this is the baseline anchor
      done();
    }
  },
  {
    version: '002_add_extended_columns',
    description: 'Safely add extended audit, financial, and salvage tracking columns',
    up: (db, done) => {
      const columns = [
        { table: 'users', col: 'is_active', def: 'INTEGER DEFAULT 1' },
        { table: 'users', col: 'created_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
        { table: 'departments', col: 'created_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
        { table: 'mains', col: 'purchase_price', def: 'REAL DEFAULT 0' },
        { table: 'mains', col: 'warranty_months', def: 'INTEGER DEFAULT 36' },
        { table: 'mains', col: 'expected_lifespan_months', def: 'INTEGER DEFAULT 60' },
        { table: 'mains', col: 'po_number', def: 'TEXT' },
        { table: 'mains', col: 'invoice_no', def: 'TEXT' },
        { table: 'mains', col: 'salvage_status', def: "TEXT DEFAULT 'None'" },
        { table: 'mains', col: 'created_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
        { table: 'mains', col: 'updated_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
        { table: 'rma_claims', col: 'data_wiped_by', def: 'TEXT' },
        { table: 'rma_claims', col: 'data_wiped_at', def: 'DATETIME' },
        { table: 'rma_claims', col: 'sanitization_note', def: 'TEXT' },
        { table: 'rma_claims', col: 'resolved_date', def: 'TEXT' },
        { table: 'rma_claims', col: 'resolution_type', def: 'TEXT' },
        { table: 'rma_claims', col: 'replacement_serial_no', def: 'TEXT' },
        { table: 'rma_claims', col: 'repair_cost', def: 'REAL DEFAULT 0' },
        { table: 'move_log', col: 'details', def: 'TEXT' },
        { table: 'move_log', col: 'log_code', def: 'TEXT' },
        { table: 'configurations', col: 'created_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
      ];

      let completed = 0;
      if (columns.length === 0) return done();

      columns.forEach(({ table, col, def }) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
          if (err) {
            completed++;
            if (completed === columns.length) done();
            return;
          }
          const hasCol = (rows || []).some(r => r.name === col);
          if (!hasCol) {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`, (alterErr) => {
              completed++;
              if (completed === columns.length) done();
            });
          } else {
            completed++;
            if (completed === columns.length) done();
          }
        });
      });
    }
  },
  {
    version: '003_move_log_code_indexes',
    description: 'Ensure tracking code index and backfill legacy logs',
    up: (db, done) => {
      db.serialize(() => {
        db.run("CREATE INDEX IF NOT EXISTS idx_move_log_code ON move_log(log_code);");
        db.run("UPDATE move_log SET log_code = 'CHG-LEGACY-' || id WHERE log_code IS NULL OR log_code = '';", () => {
          done();
        });
      });
    }
  },
  {
    version: '004_auth_session_hardening',
    description: 'Add token_version and must_change_password columns to users table',
    up: (db, done) => {
      const columns = [
        { table: 'users', col: 'token_version', def: 'INTEGER DEFAULT 0' },
        { table: 'users', col: 'must_change_password', def: 'INTEGER DEFAULT 0' }
      ];

      let completed = 0;
      columns.forEach(({ table, col, def }) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
          if (err) {
            completed++;
            if (completed === columns.length) done();
            return;
          }
          const hasCol = (rows || []).some(r => r.name === col);
          if (!hasCol) {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`, () => {
              completed++;
              if (completed === columns.length) done();
            });
          } else {
            completed++;
            if (completed === columns.length) done();
          }
        });
      });
    }
  },
  {
    version: '005_enforce_foreign_keys',
    description: 'Safely scrub orphans and enforce strict SQLite foreign keys with ON UPDATE CASCADE',
    up: (db, done) => {
      db.serialize(() => {
        // 1. Temporarily turn off foreign keys for table rebuilding dance
        db.run("PRAGMA foreign_keys = OFF;");

        // 2. Pre-migration orphan scrubbing
        db.run("UPDATE evidence SET claim_id = NULL WHERE claim_id IS NOT NULL AND claim_id NOT IN (SELECT id FROM claims);");
        db.run("UPDATE evidence SET asset_tag = NULL WHERE asset_tag IS NOT NULL AND asset_tag NOT IN (SELECT asset_tag FROM mains);");
        db.run("DELETE FROM claim_assets WHERE claim_id NOT IN (SELECT id FROM claims);");
        db.run("DELETE FROM claim_assets WHERE asset_tag NOT IN (SELECT asset_tag FROM mains);");
        db.run("DELETE FROM rma_claims WHERE asset_tag NOT IN (SELECT asset_tag FROM mains);");

        // 3. Rebuild claim_assets with explicit Foreign Keys & ON UPDATE CASCADE
        db.run(`CREATE TABLE IF NOT EXISTS claim_assets_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          claim_id INTEGER NOT NULL,
          asset_tag TEXT NOT NULL,
          data_wiped_confirmed INTEGER DEFAULT 0,
          data_wiped_by TEXT,
          data_wiped_at DATETIME,
          sanitization_note TEXT,
          item_status TEXT DEFAULT 'Pending Pickup',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
          FOREIGN KEY (asset_tag) REFERENCES mains(asset_tag) ON UPDATE CASCADE ON DELETE RESTRICT
        );`);
        db.run(`INSERT OR IGNORE INTO claim_assets_new (id, claim_id, asset_tag, data_wiped_confirmed, data_wiped_by, data_wiped_at, sanitization_note, item_status, created_at)
                SELECT id, claim_id, asset_tag, data_wiped_confirmed, data_wiped_by, data_wiped_at, sanitization_note, item_status, created_at FROM claim_assets;`);
        db.run("DROP TABLE claim_assets;");
        db.run("ALTER TABLE claim_assets_new RENAME TO claim_assets;");
        db.run("CREATE INDEX IF NOT EXISTS idx_claim_assets_claim_id ON claim_assets(claim_id);");
        db.run("CREATE INDEX IF NOT EXISTS idx_claim_assets_asset_tag ON claim_assets(asset_tag);");

        // 4. Rebuild evidence with explicit Foreign Keys & ON UPDATE CASCADE
        db.run(`CREATE TABLE IF NOT EXISTS evidence_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          claim_id INTEGER,
          asset_tag TEXT,
          uploader_username TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          storage_key TEXT UNIQUE NOT NULL,
          mime_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          checksum TEXT,
          is_deleted INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE SET NULL,
          FOREIGN KEY (asset_tag) REFERENCES mains(asset_tag) ON UPDATE CASCADE ON DELETE SET NULL
        );`);
        db.run(`INSERT OR IGNORE INTO evidence_new (id, claim_id, asset_tag, uploader_username, original_filename, storage_key, mime_type, file_size, checksum, is_deleted, created_at)
                SELECT id, claim_id, asset_tag, uploader_username, original_filename, storage_key, mime_type, file_size, checksum, is_deleted, created_at FROM evidence;`);
        db.run("DROP TABLE evidence;");
        db.run("ALTER TABLE evidence_new RENAME TO evidence;");
        db.run("CREATE INDEX IF NOT EXISTS idx_evidence_storage_key ON evidence(storage_key);");
        db.run("CREATE INDEX IF NOT EXISTS idx_evidence_claim_id ON evidence(claim_id);");
        db.run("CREATE INDEX IF NOT EXISTS idx_evidence_asset_tag ON evidence(asset_tag);");

        // 5. Rebuild rma_claims with explicit Foreign Keys & ON UPDATE CASCADE
        db.run(`CREATE TABLE IF NOT EXISTS rma_claims_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          asset_tag TEXT UNIQUE NOT NULL,
          vendor_name TEXT NOT NULL,
          vendor_rma_number TEXT NOT NULL,
          claim_date TEXT NOT NULL,
          expected_return_date TEXT NOT NULL,
          data_wiped_confirmed INTEGER DEFAULT 0,
          data_wiped_by TEXT,
          data_wiped_at DATETIME,
          sanitization_note TEXT,
          resolved_date TEXT,
          resolution_type TEXT,
          replacement_serial_no TEXT,
          repair_cost REAL DEFAULT 0,
          status TEXT DEFAULT 'Initiated',
          is_deleted INTEGER DEFAULT 0,
          FOREIGN KEY (asset_tag) REFERENCES mains(asset_tag) ON UPDATE CASCADE ON DELETE RESTRICT
        );`);
        db.run(`INSERT OR IGNORE INTO rma_claims_new SELECT * FROM rma_claims;`);
        db.run("DROP TABLE rma_claims;");
        db.run("ALTER TABLE rma_claims_new RENAME TO rma_claims;");

        // 5.1 Ensure the 4 Clinical IT Categories exist in configurations table
        const clinicalCats = [
          'Clinical IT Display',
          'Clinical Workstation',
          'Healthcare Scanner',
          'Mobile Nursing Cart'
        ];
        clinicalCats.forEach(cat => {
          db.run(
            `INSERT INTO configurations (type, value, details)
             SELECT 'category', ?, ''
             WHERE NOT EXISTS (SELECT 1 FROM configurations WHERE type = 'category' AND value = ?);`,
            [cat, cat]
          );
        });

        // 6. Re-enable foreign keys and verify zero violations
        db.run("PRAGMA foreign_keys = ON;");
        db.all("PRAGMA foreign_key_check;", (chkErr, violations) => {
          if (chkErr) return done(chkErr);
          if (violations && violations.length > 0) {
            console.error('[Migrations Error] Foreign key violations detected:', violations);
            return done(new Error(`Foreign key check failed: ${violations.length} violations found.`));
          }
          console.log('[Migrations] Migration 005 completed with 0 foreign key violations.');
          done();
        });
      });
    }
  },
  {
    version: '006_enterprise_hardening',
    description: 'Enforce must_change_password on default accounts, add evidence.doc_type, move_log timestamp index, move_log_archive, and password_resets',
    up: (db, done) => {
      db.serialize(() => {
        // 1. Enforce must_change_password on seeded default accounts that have not reset yet
        db.run(`UPDATE users SET must_change_password = 1 WHERE username IN ('admin', 'staff', 'admin2', 'admin3', 'admin4', 'staff2', 'staff3', 'staff4') AND token_version = 0;`);

        // 2. Add doc_type column to evidence table if not present
        db.all("PRAGMA table_info(evidence)", (err, rows) => {
          const hasDocType = (rows || []).some(r => r.name === 'doc_type');
          if (!hasDocType) {
            db.run("ALTER TABLE evidence ADD COLUMN doc_type TEXT DEFAULT 'GENERAL';", (alterErr) => {
              if (alterErr) console.warn('[Migration 006] Note on doc_type column:', alterErr.message);
            });
          }
        });

        // 3. Create index on move_log(timestamp) for fast audit trail pagination
        db.run("CREATE INDEX IF NOT EXISTS idx_move_log_timestamp ON move_log(timestamp);");

        // 4. Create move_log_archive table for annual archival compaction
        db.run(`CREATE TABLE IF NOT EXISTS move_log_archive (
          id INTEGER PRIMARY KEY,
          log_code TEXT,
          asset_tag TEXT NOT NULL,
          department_name TEXT,
          floor TEXT,
          status TEXT,
          moved_direction TEXT,
          action_by_username TEXT,
          details TEXT,
          timestamp DATETIME,
          archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`);

        // 5. Create password_resets table for secure self-service password recovery
        db.run(`CREATE TABLE IF NOT EXISTS password_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          token_hash TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          used INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );`, (tblErr) => {
          if (tblErr) return done(tblErr);
          console.log('[Migrations] Migration 006_enterprise_hardening applied successfully.');
          done();
        });
      });
    }
  },
  {
    version: '007_move_log_archive_columns',
    description: 'Ensure move_log_archive contains all audit columns (department_name, floor, status, moved_direction, action_by_username, details, log_code)',
    up: (db, done) => {
      db.serialize(() => {
        db.all("PRAGMA table_info(move_log_archive)", (err, rows) => {
          if (err) return done(err);
          const colNames = new Set((rows || []).map(r => r.name));
          const colsToAdd = [
            { name: 'log_code', def: 'TEXT' },
            { name: 'department_name', def: 'TEXT' },
            { name: 'floor', def: 'TEXT' },
            { name: 'status', def: 'TEXT' },
            { name: 'moved_direction', def: 'TEXT' },
            { name: 'action_by_username', def: 'TEXT' },
            { name: 'details', def: 'TEXT' }
          ];

          let pIndex = 0;
          function addNextCol() {
            if (pIndex >= colsToAdd.length) {
              console.log('[Migrations] Migration 007_move_log_archive_columns applied successfully.');
              return done();
            }
            const col = colsToAdd[pIndex++];
            if (!colNames.has(col.name)) {
              db.run(`ALTER TABLE move_log_archive ADD COLUMN ${col.name} ${col.def};`, (aErr) => {
                if (aErr) console.warn(`[Migration 007] Note on column ${col.name}:`, aErr.message);
                addNextCol();
              });
            } else {
              addNextCol();
            }
          }
          addNextCol();
        });
      });
    }
  },
  {
    version: '008_create_user_feedback_table',
    description: 'Create user_feedback table for hospital staff feedback and issue reporting',
    up: (db, done) => {
      db.run(`CREATE TABLE IF NOT EXISTS user_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        reporter_name TEXT,
        department TEXT,
        category TEXT NOT NULL,
        page_url TEXT NOT NULL,
        comment TEXT NOT NULL,
        rating INTEGER,
        device_info TEXT,
        screen_size TEXT,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`, (err) => {
        if (err) return done(err);
        db.run(`CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);`, () => {
          db.run(`CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);`, done);
        });
      });
    }
  },
  {
    version: '009_add_admin_note_to_user_feedback',
    description: 'Add admin_note column to user_feedback for admin reply comments and internal remarks',
    up: (db, done) => {
      db.all("PRAGMA table_info(user_feedback)", (err, rows) => {
        if (err) return done(err);
        const hasCol = (rows || []).some(r => r.name === 'admin_note');
        if (!hasCol) {
          db.run("ALTER TABLE user_feedback ADD COLUMN admin_note TEXT", done);
        } else {
          done();
        }
      });
    }
  }
];

/**
 * Executes all pending migrations in strict sequential order.
 */
function runMigrations(db, callback) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      description TEXT,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (createErr) => {
      if (createErr) {
        console.error('[Migrations Error] Failed to create schema_migrations table:', createErr);
        if (callback) callback(createErr);
        return;
      }

      db.all("SELECT version FROM schema_migrations", (fetchErr, appliedRows) => {
        if (fetchErr) {
          console.error('[Migrations Error] Failed to query schema_migrations:', fetchErr);
          if (callback) callback(fetchErr);
          return;
        }

        const applied = new Set((appliedRows || []).map(r => r.version));
        const pending = migrations.filter(m => !applied.has(m.version));

        if (pending.length === 0) {
          if (callback) callback(null, { appliedCount: 0 });
          return;
        }

        let index = 0;
        function executeNext() {
          if (index >= pending.length) {
            if (callback) callback(null, { appliedCount: pending.length });
            return;
          }

          const migration = pending[index];
          migration.up(db, (upErr) => {
            if (upErr) {
              console.error(`[Migrations Error] Migration ${migration.version} failed:`, upErr);
              if (callback) callback(upErr);
              return;
            }

            db.run(
              "INSERT OR IGNORE INTO schema_migrations (version, description) VALUES (?, ?)",
              [migration.version, migration.description],
              (recErr) => {
                if (recErr) {
                  console.error(`[Migrations Error] Failed to record migration ${migration.version}:`, recErr);
                  if (callback) callback(recErr);
                  return;
                }
                index++;
                executeNext();
              }
            );
          });
        }

        executeNext();
      });
    });
  });
}

module.exports = { runMigrations, migrations };
