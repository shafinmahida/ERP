/**
 * DAYAR-E-HABIB ERP — ENVIRONMENT-SAFE PERSISTENCE ENGINE
 * 
 * AUDIT & COMPLIANCE RULES:
 * 1. ZERO Node-only imports (fs, path, node:sqlite) in Webview/Browser runtime.
 * 2. Webview / Browser runtime uses safe Web Storage IPC disk fallback.
 * 3. Node environment (CLI, test scripts, IPC backend) uses `node:sqlite` DatabaseSync targeting `database.db`.
 * 4. 100% Single Active Database Path: `C:\Users\Asus\Documents\Dayar-E-Habib Data\database.db`.
 */

function getHomeDir(): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\Asus';
  }
  return 'C:\\Users\\Asus';
}

export const DEFAULT_DATA_DIR = `${getHomeDir()}\\Documents\\Dayar-E-Habib Data`;

let currentDataDir = DEFAULT_DATA_DIR;
let dbInstance: any = null;

export function getDataDirectory(): string {
  return currentDataDir;
}

export function setDataDirectory(newPath: string): void {
  currentDataDir = newPath;
  if (dbInstance && typeof dbInstance.close === 'function') {
    try { dbInstance.close(); } catch {}
  }
  dbInstance = null;
}

function getNodeModule(name: string) {
  if (typeof window !== 'undefined') return null;
  try {
    if (typeof process !== 'undefined' && typeof (process as any).getBuiltinModule === 'function') {
      return (process as any).getBuiltinModule(name);
    }
  } catch {}
  return null;
}

export function ensureDataDirectoryStructure(dirPath: string = currentDataDir): void {
  const fsMod = getNodeModule('fs');
  const pathMod = getNodeModule('path');

  if (fsMod && pathMod) {
    try {
      if (!fsMod.existsSync(dirPath)) fsMod.mkdirSync(dirPath, { recursive: true });
      const docsDir = pathMod.join(dirPath, 'Documents');
      const backupsDir = pathMod.join(dirPath, 'Backups');
      const logsDir = pathMod.join(dirPath, 'Logs');

      if (!fsMod.existsSync(docsDir)) fsMod.mkdirSync(docsDir, { recursive: true });
      if (!fsMod.existsSync(backupsDir)) fsMod.mkdirSync(backupsDir, { recursive: true });
      if (!fsMod.existsSync(logsDir)) fsMod.mkdirSync(logsDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create data directory structure:', e);
    }
  }
}

export function getDatabasePath(): string {
  ensureDataDirectoryStructure(currentDataDir);
  return `${currentDataDir}\\database.db`;
}

export function getRawDb(): any {
  if (dbInstance) return dbInstance;

  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

  if (isNode) {
    const nodeSqlite = getNodeModule('node:sqlite');
    if (nodeSqlite && nodeSqlite.DatabaseSync) {
      const dbPath = getDatabasePath();
      console.log(`[SQLite Disk Engine] Opening Node SQLite persistent file: "${dbPath}"`);
      const nativeDb = new nodeSqlite.DatabaseSync(dbPath);
      initDdl(nativeDb);
      dbInstance = createSqliteWrapper(nativeDb);
      return dbInstance;
    }
  }

  console.log('[SQLite Disk Engine] Initializing Web Storage Persistent Database Driver...');
  const webStore = new WebStorageDiskStore('dayar_e_habib_db');
  initDdl(webStore);
  dbInstance = webStore;
  return dbInstance;
}

export function initializeFoundationDatabase(): any {
  return getRawDb();
}

function normalizeRow(row: any) {
  if (!row) return row;
  const normalized: any = {};
  for (const key of Object.keys(row)) {
    const val = row[key];
    normalized[key] = typeof val === 'bigint' ? Number(val) : val;
  }
  return normalized;
}

function createSqliteWrapper(nativeDb: any) {
  return {
    exec(sql: string) {
      nativeDb.exec(sql);
    },
    prepare(sql: string) {
      const stmt = nativeDb.prepare(sql);
      return {
        all(...params: any[]) {
          const rows = stmt.all(...params);
          return rows.map((r: any) => normalizeRow(r));
        },
        get(...params: any[]) {
          const row = stmt.get(...params);
          return normalizeRow(row);
        },
        run(...params: any[]) {
          const info = stmt.run(...params);
          return { lastInsertRowid: Number(info.lastInsertRowid) };
        },
      };
    },
    close() {
      if (typeof nativeDb.close === 'function') {
        nativeDb.close();
      }
    },
  };
}

class WebStorageDiskStore {
  private key: string;
  private tables: Record<string, any[]> = {};
  private autoIds: Record<string, number> = {};

  constructor(key: string) {
    this.key = key;
    this.load();
  }

  private load() {
    try {
      let content: string | null = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        content = window.localStorage.getItem(this.key);
      } else {
        const fsMod = getNodeModule('fs');
        const dbPath = getDatabasePath();
        if (fsMod && fsMod.existsSync(dbPath)) {
          content = fsMod.readFileSync(dbPath, 'utf-8');
        }
      }

      if (content) {
        const parsed = JSON.parse(content);
        this.tables = parsed.tables || {};
        this.autoIds = parsed.autoIds || {};
      }
    } catch {
      this.tables = {};
      this.autoIds = {};
    }
  }

  private save() {
    try {
      const dataStr = JSON.stringify({ tables: this.tables, autoIds: this.autoIds });
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.key, dataStr);
      } else {
        const fsMod = getNodeModule('fs');
        const pathMod = getNodeModule('path');
        const dbPath = getDatabasePath();
        if (fsMod && pathMod) {
          const dir = pathMod.dirname(dbPath);
          if (!fsMod.existsSync(dir)) fsMod.mkdirSync(dir, { recursive: true });
          fsMod.writeFileSync(dbPath, dataStr, 'utf-8');
        }
      }
    } catch (e) {
      console.error('Failed to save persistence store:', e);
    }
  }

  exec(sql: string) {
    const cleanSql = sql.trim();
    if (cleanSql.toUpperCase().startsWith('CREATE TABLE')) {
      const match = cleanSql.match(/CREATE TABLE IF NOT EXISTS ([a-z_]+)/i) || cleanSql.match(/CREATE TABLE ([a-z_]+)/i);
      if (match) {
        const tblName = match[1];
        if (!this.tables[tblName]) {
          this.tables[tblName] = [];
          this.autoIds[tblName] = 1;
        }
      }
    }
    this.save();
  }

  prepare(sql: string) {
    const store = this;
    return {
      all(...params: any[]) {
        store.load();
        if (sql.includes('SELECT * FROM customer ORDER BY customer_id DESC')) {
          return [...(store.tables['customer'] || [])].reverse();
        }
        if (sql.includes('SELECT * FROM customer_identity WHERE customer_id = ?')) {
          const id = params[0];
          return (store.tables['customer_identity'] || []).filter((i) => i.customer_id === id);
        }
        if (sql.includes('SELECT * FROM customer_identity')) {
          return [...(store.tables['customer_identity'] || [])];
        }
        if (sql.includes('SELECT * FROM season_type')) {
          return [...(store.tables['season_type'] || [])];
        }
        if (sql.includes('SELECT * FROM season')) {
          return [...(store.tables['season'] || [])];
        }
        if (sql.includes('SELECT * FROM package')) {
          return [...(store.tables['package'] || [])];
        }
        if (sql.includes('SELECT * FROM registration')) {
          return [...(store.tables['registration'] || [])].reverse();
        }
        if (sql.includes('SELECT * FROM document_type')) {
          return [...(store.tables['document_type'] || [])];
        }
        if (sql.includes('SELECT * FROM document WHERE identity_id = ?')) {
          const id = params[0];
          return (store.tables['document'] || []).filter((d) => d.identity_id === id);
        }
        if (sql.includes('SELECT * FROM document WHERE registration_id = ?')) {
          const id = params[0];
          return (store.tables['document'] || []).filter((d) => d.registration_id === id);
        }
        if (sql.includes('SELECT * FROM document ORDER BY document_id DESC')) {
          return [...(store.tables['document'] || [])].reverse();
        }
        if (sql.includes('SELECT * FROM document_version WHERE document_id = ?')) {
          const id = params[0];
          return (store.tables['document_version'] || []).filter((v) => v.document_id === id);
        }
        if (sql.includes('SELECT * FROM audit_log')) {
          return [...(store.tables['audit_log'] || [])].reverse();
        }
        return [];
      },
      get(...params: any[]) {
        store.load();
        if (sql.includes('SELECT COUNT(*) as count FROM document_type')) {
          return { count: (store.tables['document_type'] || []).length };
        }
        if (sql.includes('SELECT COUNT(*) as count FROM season_type')) {
          return { count: (store.tables['season_type'] || []).length };
        }
        if (sql.includes('SELECT * FROM customer WHERE customer_id = ?')) {
          const id = params[0];
          return (store.tables['customer'] || []).find((c) => c.customer_id === id);
        }
        if (sql.includes('SELECT * FROM customer_identity WHERE identity_id = ?')) {
          const id = params[0];
          return (store.tables['customer_identity'] || []).find((i) => i.identity_id === id);
        }
        if (sql.includes('SELECT * FROM season_type WHERE season_type_id = ?')) {
          const id = params[0];
          return (store.tables['season_type'] || []).find((st) => st.season_type_id === id);
        }
        if (sql.includes('SELECT * FROM season_type WHERE code = ?')) {
          const code = params[0];
          return (store.tables['season_type'] || []).find((st) => st.code === code);
        }
        if (sql.includes('SELECT * FROM season WHERE season_id = ?')) {
          const id = params[0];
          return (store.tables['season'] || []).find((s) => s.season_id === id);
        }
        if (sql.includes('SELECT * FROM package WHERE package_id = ?')) {
          const id = params[0];
          return (store.tables['package'] || []).find((p) => p.package_id === id);
        }
        if (sql.includes('SELECT * FROM registration WHERE registration_id = ?')) {
          const id = params[0];
          return (store.tables['registration'] || []).find((r) => r.registration_id === id);
        }
        if (sql.includes('SELECT * FROM document_type WHERE document_type_id = ?')) {
          const id = params[0];
          return (store.tables['document_type'] || []).find((dt) => dt.document_type_id === id);
        }
        if (sql.includes('SELECT * FROM document_type WHERE code = ?')) {
          const code = params[0];
          return (store.tables['document_type'] || []).find((dt) => dt.code === code);
        }
        if (sql.includes('SELECT * FROM document WHERE document_id = ?')) {
          const id = params[0];
          return (store.tables['document'] || []).find((d) => d.document_id === id);
        }
        if (sql.includes('SELECT * FROM document_version WHERE checksum = ?')) {
          const hash = params[0];
          return (store.tables['document_version'] || []).find((v) => v.checksum === hash);
        }
        return undefined;
      },
      run(...params: any[]) {
        store.load();
        let lastId = 1;
        if (sql.includes('INSERT INTO customer (')) {
          lastId = (store.autoIds['customer'] || 0) + 1;
          store.autoIds['customer'] = lastId;
          const obj = {
            customer_id: lastId,
            full_name: params[0],
            father_name: params[1],
            date_of_birth: params[2],
            gender: params[3],
            nationality: params[4],
            mobile_number: params[5],
            created_at: params[6],
            updated_at: params[7],
          };
          if (!store.tables['customer']) store.tables['customer'] = [];
          store.tables['customer'].push(obj);
        } else if (sql.includes('INSERT INTO customer_identity (')) {
          lastId = (store.autoIds['customer_identity'] || 0) + 1;
          store.autoIds['customer_identity'] = lastId;
          const obj = {
            identity_id: lastId,
            customer_id: params[0],
            passport_number: params[1],
            issue_date: params[2],
            expiry_date: params[3],
            place_of_issue: params[4],
            identity_status: params[5],
            created_at: params[6],
          };
          if (!store.tables['customer_identity']) store.tables['customer_identity'] = [];
          store.tables['customer_identity'].push(obj);
        } else if (sql.includes('INSERT INTO season_type (')) {
          lastId = (store.autoIds['season_type'] || 0) + 1;
          store.autoIds['season_type'] = lastId;
          const obj = {
            season_type_id: lastId,
            name: params[0],
            code: params[1],
            description: params[2],
            is_active: params[3],
          };
          if (!store.tables['season_type']) store.tables['season_type'] = [];
          store.tables['season_type'].push(obj);
        } else if (sql.includes('INSERT INTO season (')) {
          lastId = (store.autoIds['season'] || 0) + 1;
          store.autoIds['season'] = lastId;
          const obj = {
            season_id: lastId,
            season_type_id: params[0],
            year: params[1],
            label: params[2],
          };
          if (!store.tables['season']) store.tables['season'] = [];
          store.tables['season'].push(obj);
        } else if (sql.includes('INSERT INTO package (')) {
          lastId = (store.autoIds['package'] || 0) + 1;
          store.autoIds['package'] = lastId;
          const obj = {
            package_id: lastId,
            season_id: params[0],
            name: params[1],
            description: params[2],
          };
          if (!store.tables['package']) store.tables['package'] = [];
          store.tables['package'].push(obj);
        } else if (sql.includes('INSERT INTO registration (')) {
          lastId = (store.autoIds['registration'] || 0) + 1;
          store.autoIds['registration'] = lastId;
          const obj = {
            registration_id: lastId,
            registration_number: params[0],
            customer_id: params[1],
            season_id: params[2],
            package_id: params[3],
            status: params[4],
            created_at: params[5],
            updated_at: params[6],
          };
          if (!store.tables['registration']) store.tables['registration'] = [];
          store.tables['registration'].push(obj);
        } else if (sql.includes('INSERT INTO document_type (')) {
          lastId = (store.autoIds['document_type'] || 0) + 1;
          store.autoIds['document_type'] = lastId;
          const obj = {
            document_type_id: lastId,
            name: params[0],
            code: params[1],
            owner_scope: params[2],
            requires_expiry: params[3],
            requires_number: params[4],
            is_active: params[5],
            sort_order: params[6],
          };
          if (!store.tables['document_type']) store.tables['document_type'] = [];
          store.tables['document_type'].push(obj);
        } else if (sql.includes('INSERT INTO document (')) {
          lastId = (store.autoIds['document'] || 0) + 1;
          store.autoIds['document'] = lastId;
          const obj = {
            document_id: lastId,
            identity_id: params[0],
            registration_id: params[1],
            document_type_id: params[2],
            document_number: params[3],
            issue_date: params[4],
            expiry_date: params[5],
            status: params[6],
            created_at: params[7],
          };
          if (!store.tables['document']) store.tables['document'] = [];
          store.tables['document'].push(obj);
        } else if (sql.includes('INSERT INTO document_version (')) {
          lastId = (store.autoIds['document_version'] || 0) + 1;
          store.autoIds['document_version'] = lastId;
          const obj = {
            version_id: lastId,
            document_id: params[0],
            version_number: params[1],
            stored_filename: params[2],
            original_filename: params[3],
            relative_path: params[4],
            checksum: params[5],
            file_size: params[6],
            mime_type: params[7],
            uploaded_at: params[8],
            created_at: params[9],
            reason_for_replacement: params[10],
          };
          if (!store.tables['document_version']) store.tables['document_version'] = [];
          store.tables['document_version'].push(obj);
        } else if (sql.includes('INSERT INTO audit_log (')) {
          lastId = (store.autoIds['audit_log'] || 0) + 1;
          store.autoIds['audit_log'] = lastId;
          const obj = {
            log_id: lastId,
            entity_type: params[0],
            entity_id: params[1],
            action: params[2],
            field_changed: params[3],
            old_value: params[4],
            new_value: params[5],
            timestamp: params[6],
            notes: params[7],
          };
          if (!store.tables['audit_log']) store.tables['audit_log'] = [];
          store.tables['audit_log'].push(obj);
        } else if (sql.includes('UPDATE registration SET status')) {
          const status = params[0];
          const updatedAt = params[1];
          const regId = params[2];
          const reg = (store.tables['registration'] || []).find((r) => r.registration_id === regId);
          if (reg) {
            reg.status = status;
            reg.updated_at = updatedAt;
          }
        }
        store.save();
        return { lastInsertRowid: lastId };
      },
    };
  }

  close() {
    this.save();
  }
}

function initDdl(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer (
      customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      father_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL,
      nationality TEXT NOT NULL DEFAULT 'Pakistani',
      mobile_number TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_identity (
      identity_id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      passport_number TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      place_of_issue TEXT NOT NULL,
      identity_status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS season_type (
      season_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS season (
      season_id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_type_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS package (
      package_id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS registration (
      registration_id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      season_id INTEGER NOT NULL,
      package_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_type TEXT NOT NULL,
      cheque_number TEXT,
      bank_name TEXT,
      reference_number TEXT,
      payment_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_type (
      document_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      owner_scope TEXT NOT NULL,
      requires_expiry INTEGER DEFAULT 0 NOT NULL,
      requires_number INTEGER DEFAULT 0 NOT NULL,
      is_active INTEGER DEFAULT 1 NOT NULL,
      sort_order INTEGER DEFAULT 0 NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document (
      document_id INTEGER PRIMARY KEY AUTOINCREMENT,
      identity_id INTEGER,
      registration_id INTEGER,
      document_type_id INTEGER NOT NULL,
      document_number TEXT,
      issue_date TEXT,
      expiry_date TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_version (
      version_id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      stored_filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      checksum TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      uploaded_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reason_for_replacement TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      field_changed TEXT,
      old_value TEXT,
      new_value TEXT,
      timestamp TEXT NOT NULL,
      notes TEXT
    );
  `);
}
