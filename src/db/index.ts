/**
 * DAYAR-E-HABIB ERP — PERSISTENCE & MIGRATION ENGINE
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
        if (
          !this.tables['customer_identity'] ||
          !this.tables['registration'] ||
          this.tables['registration'].length < 3 ||
          !this.tables['customer'] ||
          this.tables['customer'].length < 20
        ) {
          this.tables = {};
          this.autoIds = {};
        }
      }

      this.ensureDemoSeed();
    } catch {
      this.tables = {};
      this.autoIds = {};
      this.ensureDemoSeed();
    }
  }

  private ensureDemoSeed() {
    const now = new Date().toISOString();
    if (!this.tables['season_type'] || this.tables['season_type'].length === 0) {
      this.tables['season_type'] = [
        { season_type_id: 1, name: 'Hajj', code: 'HAJJ', description: 'Annual Hajj Pilgrimage Season', is_active: 1 },
        { season_type_id: 2, name: 'Umrah', code: 'UMR', description: 'Regular Umrah Season', is_active: 1 },
        { season_type_id: 3, name: 'Ramadan Umrah', code: 'RAM', description: 'Ramadan Special Umrah Package', is_active: 1 },
      ];
      this.autoIds['season_type'] = 3;
    }

    if (!this.tables['season'] || this.tables['season'].length === 0) {
      this.tables['season'] = [
        { season_id: 1, season_type_id: 1, year: 2026, label: 'Hajj 2026', is_active: 1, created_at: now, updated_at: now },
        { season_id: 2, season_type_id: 2, year: 2026, label: 'Umrah 2026 Executive', is_active: 1, created_at: now, updated_at: now },
      ];
      this.autoIds['season'] = 2;
    }

    if (!this.tables['package'] || this.tables['package'].length === 0) {
      this.tables['package'] = [
        { package_id: 1, season_id: 1, name: 'Hajj Deluxe Package', description: 'Full Board 5-Star Accommodations', base_price_paise: 45000000 },
        { package_id: 2, season_id: 1, name: 'Hajj Standard Package', description: '4-Star Hotels with Meals', base_price_paise: 35000000 },
        { package_id: 3, season_id: 2, name: 'Umrah Executive Deluxe', description: '5-Star Clock Tower Makkah', base_price_paise: 15000000 },
        { package_id: 4, season_id: 2, name: 'Umrah Economy Saver', description: '3-Star Accommodations near Haram', base_price_paise: 8500000 },
      ];
      this.autoIds['package'] = 4;
    }

    const demoCusts = [
      ['Shafin Suleman Mahida', 'Suleman Yusuf Mahida', '2006-04-11', 'Male', 'Indian', '+917016490230', 'Maharashtra', 'Q123456', '2024-01-10', '2034-01-09', 'Mumbai'],
      ['Rashid Ahmed Khan', 'Ahmed Noor Khan', '1985-06-15', 'Male', 'Indian', '+919820011223', 'Maharashtra', 'Z9876541', '2022-03-01', '2032-02-28', 'Mumbai'],
      ['Fatima Rashid Khan', 'Rashid Ahmed Khan', '1990-08-20', 'Female', 'Indian', '+919820011224', 'Maharashtra', 'Z9876542', '2022-03-01', '2032-02-28', 'Mumbai'],
      ['Yusuf Rashid Khan', 'Rashid Ahmed Khan', '2015-11-10', 'Male', 'Indian', '+919820011223', 'Maharashtra', 'Z9876543', '2023-01-15', '2028-01-14', 'Mumbai'],
      ['Amina Rashid Khan', 'Rashid Ahmed Khan', '2018-02-05', 'Female', 'Indian', '+919820011223', 'Maharashtra', 'Z9876544', '2023-01-15', '2028-01-14', 'Mumbai'],
      ['Zainab Qasim Merchant', 'Qasim Merchant', '1988-12-12', 'Female', 'Indian', '+919666555444', 'Gujarat', 'P1900001', '2021-05-20', '2031-05-19', 'Ahmedabad'],
      ['Ibrahim Qasim Merchant', 'Qasim Merchant', '1982-04-18', 'Male', 'Indian', '+919666555445', 'Gujarat', 'P1900002', '2021-05-20', '2031-05-19', 'Ahmedabad'],
      ['Bilal Suhail Khan', 'Suhail Khan', '1992-09-09', 'Male', 'Indian', '+919811122233', 'Delhi', 'P1500001', '2020-10-10', '2030-10-09', 'Delhi'],
      ['Tariq Mahmood Shaikh', 'Mahmood Shaikh', '1979-01-25', 'Male', 'Indian', '+919700088899', 'Karnataka', 'K8877112', '2019-07-04', '2029-07-03', 'Bangalore'],
      ['Sana Tariq Shaikh', 'Tariq Mahmood Shaikh', '1984-03-30', 'Female', 'Indian', '+919700088899', 'Karnataka', 'K8877113', '2019-07-04', '2029-07-03', 'Bangalore'],
      ['Omar Farooq Al-Siddīqī', 'Farooq Al-Siddīqī', '1975-05-05', 'Male', 'Indian', '+919444455555', 'Telangana', 'T5544332', '2023-08-12', '2033-08-11', 'Hyderabad'],
      ['Khadija Omar Al-Siddīqī', 'Omar Al-Siddīqī', '1978-07-14', 'Female', 'Indian', '+919444455555', 'Telangana', 'T5544333', '2023-08-12', '2033-08-11', 'Hyderabad'],
      ['Usman Ali Ansari', 'Ali Ansari', '1995-11-22', 'Male', 'Indian', '+919111122222', 'Uttar Pradesh', 'U1122334', '2024-02-01', '2034-01-31', 'Lucknow'],
      ['Hafsa Usman Ansari', 'Usman Ali Ansari', '1997-02-14', 'Female', 'Indian', '+919111122222', 'Uttar Pradesh', 'U1122335', '2024-02-01', '2034-01-31', 'Lucknow'],
      ['Hamza Zubair Sayyed', 'Zubair Sayyed', '1987-10-10', 'Male', 'Indian', '+919333344444', 'Maharashtra', 'M3344556', '2021-11-11', '2031-11-10', 'Pune'],
      ['Mariam Hamza Sayyed', 'Hamza Zubair Sayyed', '1991-04-04', 'Female', 'Indian', '+919333344444', 'Maharashtra', 'M3344557', '2021-11-11', '2031-11-10', 'Pune'],
      ['Zayd Hamza Sayyed', 'Hamza Zubair Sayyed', '2016-06-06', 'Male', 'Indian', '+919333344444', 'Maharashtra', 'M3344558', '2022-06-06', '2027-06-05', 'Pune'],
      ['Suhail Akram Choudhury', 'Akram Choudhury', '1980-08-08', 'Male', 'Indian', '+919555566666', 'West Bengal', 'W5566778', '2020-05-05', '2030-05-04', 'Kolkata'],
      ['Nabila Suhail Choudhury', 'Suhail Choudhury', '1983-09-09', 'Female', 'Indian', '+919555566666', 'West Bengal', 'W5566779', '2020-05-05', '2030-05-04', 'Kolkata'],
      ['Zubair Hassan Patel', 'Hassan Patel', '1991-01-01', 'Male', 'Indian', '+919777788888', 'Gujarat', 'G7788990', '2024-03-15', '2034-03-14', 'Surat'],
    ];

    if (!this.tables['customer'] || this.tables['customer'].length < 20) {
      this.tables['customer'] = [];
      this.tables['customer_identity'] = [];

      demoCusts.forEach((c, idx) => {
        const cId = idx + 1;
        this.tables['customer'].push({
          customer_id: cId,
          full_name: c[0],
          father_name: c[1],
          date_of_birth: c[2],
          gender: c[3],
          nationality: c[4],
          mobile_number: c[5],
          state: c[6],
          created_at: now,
          updated_at: now,
        });

        this.tables['customer_identity'].push({
          identity_id: idx + 1,
          customer_id: cId,
          passport_number: c[7],
          issue_date: c[8],
          expiry_date: c[9],
          place_of_issue: c[10],
          identity_status: 'ACTIVE',
          created_at: now,
        });
      });

      this.autoIds['customer'] = demoCusts.length;
      this.autoIds['customer_identity'] = demoCusts.length;
    }

    if (!this.tables['registration'] || this.tables['registration'].length === 0) {
      this.tables['registration'] = [
        {
          registration_id: 1,
          registration_number: 'DH-2026-HAJ-000001',
          customer_id: 1,
          season_id: 1,
          package_id: 1,
          status: 'Visa Approved',
          payment_status: 'Advance Received',
          package_name_snapshot: 'Hajj Deluxe Package',
          package_price_snapshot: 45000000,
          season_label_snapshot: 'Hajj 2026',
          season_type_code_snapshot: 'HAJJ',
          representative: 'Fayyaz Khan',
          tour_name: 'VIP Hajj Group A',
          booking_date: '2026-01-15',
          airline: 'Saudia Airlines',
          sector: 'BOM - JED - BOM',
          flight_number: 'SV-741',
          pnr: 'PNR-998811',
          saudi_agent: 'Al-Bait Guest Services',
          departure_date: '2026-06-01',
          arrival_date: '2026-06-20',
          room_preference: 'Double Sharing',
          remarks: 'VIP Hajj Pilgrim - Single Pax',
          created_at: now,
          updated_at: now,
        },
        {
          registration_id: 2,
          registration_number: 'DH-2026-UMR-000002',
          customer_id: 2,
          season_id: 2,
          package_id: 3,
          status: 'Travel Ready',
          payment_status: 'Fully Paid',
          package_name_snapshot: 'Umrah Executive Deluxe',
          package_price_snapshot: 15000000,
          season_label_snapshot: 'Umrah 2026 Executive',
          season_type_code_snapshot: 'UMR',
          representative: 'Suleman Mahida',
          tour_name: 'Executive Umrah Group 4',
          booking_date: '2026-02-10',
          airline: 'Saudia Airlines',
          sector: 'BOM - JED - BOM',
          flight_number: 'SV-743',
          pnr: 'PNR-FAM444',
          saudi_agent: 'Makkah Clock Tower Host',
          departure_date: '2026-03-10',
          arrival_date: '2026-03-24',
          room_preference: '4 Sharing Quad Room',
          remarks: 'Family of 4 Booking',
          created_at: now,
          updated_at: now,
        },
        {
          registration_id: 3,
          registration_number: 'DH-2026-UMR-000003',
          customer_id: 6,
          season_id: 2,
          package_id: 4,
          status: 'Documents Pending',
          payment_status: 'Partially Paid',
          package_name_snapshot: 'Umrah Economy Saver',
          package_price_snapshot: 8500000,
          season_label_snapshot: 'Umrah 2026 Executive',
          season_type_code_snapshot: 'UMR',
          representative: 'Fayyaz Khan',
          booking_date: '2026-02-20',
          created_at: now,
          updated_at: now,
        },
      ];

      this.tables['registration_pax'] = [
        { pax_id: 1, registration_id: 1, customer_id: 1, is_primary: 1, pax_sequence: 1, relationship: 'Primary', pax_status: 'ACTIVE', created_at: now, updated_at: now },
        { pax_id: 2, registration_id: 2, customer_id: 2, is_primary: 1, pax_sequence: 1, relationship: 'Primary', pax_status: 'ACTIVE', created_at: now, updated_at: now },
        { pax_id: 3, registration_id: 2, customer_id: 3, is_primary: 0, pax_sequence: 2, relationship: 'Spouse', pax_status: 'ACTIVE', created_at: now, updated_at: now },
        { pax_id: 4, registration_id: 2, customer_id: 4, is_primary: 0, pax_sequence: 3, relationship: 'Child', pax_status: 'ACTIVE', created_at: now, updated_at: now },
        { pax_id: 5, registration_id: 2, customer_id: 5, is_primary: 0, pax_sequence: 4, relationship: 'Child', pax_status: 'ACTIVE', created_at: now, updated_at: now },
        { pax_id: 6, registration_id: 3, customer_id: 6, is_primary: 1, pax_sequence: 1, relationship: 'Primary', pax_status: 'ACTIVE', created_at: now, updated_at: now },
        { pax_id: 7, registration_id: 3, customer_id: 7, is_primary: 0, pax_sequence: 2, relationship: 'Brother', pax_status: 'ACTIVE', created_at: now, updated_at: now },
      ];

      this.tables['registration_charge'] = [
        { charge_id: 1, registration_id: 1, charge_type: 'Adult', rate_inr_paise: 45000000, quantity: 1, amount_paise: 45000000, created_at: now, updated_at: now },
        { charge_id: 2, registration_id: 2, charge_type: 'Adult', rate_inr_paise: 15000000, quantity: 2, amount_paise: 30000000, created_at: now, updated_at: now },
        { charge_id: 3, registration_id: 2, charge_type: 'ChildWithBed', rate_inr_paise: 9000000, quantity: 2, amount_paise: 18000000, created_at: now, updated_at: now },
        { charge_id: 4, registration_id: 3, charge_type: 'Adult', rate_inr_paise: 8500000, quantity: 2, amount_paise: 17000000, created_at: now, updated_at: now },
      ];

      this.tables['payment'] = [
        { payment_id: 1, registration_id: 1, amount_paise: 10000000, payment_type: 'Cash', payment_date: '2026-01-15', created_at: now },
        { payment_id: 2, registration_id: 2, amount_paise: 48000000, payment_type: 'Bank Transfer', reference_number: 'NEFT-88991122', payment_date: '2026-02-12', created_at: now },
        { payment_id: 3, registration_id: 3, amount_paise: 5000000, payment_type: 'Cheque', cheque_number: 'CHQ-445566', bank_name: 'HDFC Bank', payment_date: '2026-02-20', created_at: now },
      ];

      this.autoIds['registration'] = 3;
      this.autoIds['registration_pax'] = 7;
      this.autoIds['registration_charge'] = 4;
      this.autoIds['payment'] = 3;
    }
    this.save();
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
        if (sql.includes('SELECT * FROM customer')) {
          if (sql.includes('DESC')) {
            return [...(store.tables['customer'] || [])].reverse();
          }
          return [...(store.tables['customer'] || [])];
        }
        if (sql.includes('FROM customer_identity WHERE customer_id = ?')) {
          const id = params[0];
          return (store.tables['customer_identity'] || []).filter((i) => Number(i.customer_id) === Number(id));
        }
        if (sql.includes('FROM customer_identity')) {
          return [...(store.tables['customer_identity'] || [])];
        }
        if (sql.includes('FROM customer')) {
          if (sql.includes('DESC')) {
            return [...(store.tables['customer'] || [])].reverse();
          }
          return [...(store.tables['customer'] || [])];
        }
        if (sql.includes('FROM season_type')) {
          return [...(store.tables['season_type'] || [])];
        }
        if (sql.includes('FROM season')) {
          return [...(store.tables['season'] || [])];
        }
        if (sql.includes('FROM package WHERE season_id = ?')) {
          const sId = params[0];
          return (store.tables['package'] || []).filter((p) => Number(p.season_id) === Number(sId));
        }
        if (sql.includes('FROM package')) {
          return [...(store.tables['package'] || [])];
        }
        if (sql.includes('FROM registration_pax WHERE registration_id = ?')) {
          const regId = params[0];
          return (store.tables['registration_pax'] || []).filter((p) => Number(p.registration_id) === Number(regId));
        }
        if (sql.includes('FROM registration_pax')) {
          return [...(store.tables['registration_pax'] || [])];
        }
        if (sql.includes('FROM registration')) {
          return [...(store.tables['registration'] || [])].reverse();
        }
        if (sql.includes('FROM registration_charge WHERE registration_id = ?')) {
          const regId = params[0];
          return (store.tables['registration_charge'] || []).filter((c) => Number(c.registration_id) === Number(regId));
        }
        if (sql.includes('FROM registration_tax WHERE registration_id = ?')) {
          const regId = params[0];
          return (store.tables['registration_tax'] || []).filter((t) => Number(t.registration_id) === Number(regId));
        }
        if (sql.includes('FROM payment WHERE registration_id = ?')) {
          const regId = params[0];
          return (store.tables['payment'] || []).filter((p) => Number(p.registration_id) === Number(regId));
        }
        if (sql.includes('FROM company_settings')) {
          return [...(store.tables['company_settings'] || [])];
        }
        if (sql.includes('FROM document_type')) {
          return [...(store.tables['document_type'] || [])];
        }
        if (sql.includes('FROM audit_log')) {
          return [...(store.tables['audit_log'] || [])].reverse();
        }
        return [];
      },
      get(...params: any[]) {
        store.load();
        if (sql.includes('SELECT * FROM customer WHERE customer_id = ?')) {
          const id = params[0];
          return (store.tables['customer'] || []).find((c) => c.customer_id === id);
        }
        if (sql.includes('SELECT * FROM season_type WHERE season_type_id = ?')) {
          const id = params[0];
          return (store.tables['season_type'] || []).find((st) => st.season_type_id === id);
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
        if (sql.includes('SELECT * FROM registration_charge WHERE charge_id = ?')) {
          const id = params[0];
          return (store.tables['registration_charge'] || []).find((c) => c.charge_id === id);
        }
        if (sql.includes('SELECT * FROM registration_tax WHERE tax_id = ?')) {
          const id = params[0];
          return (store.tables['registration_tax'] || []).find((t) => t.tax_id === id);
        }
        if (sql.includes('SELECT * FROM payment WHERE payment_id = ?')) {
          const id = params[0];
          return (store.tables['payment'] || []).find((p) => p.payment_id === id);
        }
        if (sql.includes('SELECT * FROM company_settings WHERE setting_key = ?')) {
          const key = params[0];
          return (store.tables['company_settings'] || []).find((s) => s.setting_key === key);
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
            state: params[6] || 'Maharashtra',
            created_at: params[7],
            updated_at: params[8],
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
            identity_status: params[5] || 'ACTIVE',
            created_at: params[6],
          };
          if (!store.tables['customer_identity']) store.tables['customer_identity'] = [];
          store.tables['customer_identity'].push(obj);
        } else if (sql.includes('UPDATE customer_identity SET identity_status')) {
          const status = params[0];
          const custId = params[1];
          (store.tables['customer_identity'] || []).forEach((id) => {
            if (id.customer_id === custId && id.identity_status === 'ACTIVE') {
              id.identity_status = status;
            }
          });
        } else if (sql.includes('INSERT INTO season_type (')) {
          lastId = (store.autoIds['season_type'] || 0) + 1;
          store.autoIds['season_type'] = lastId;
          const obj = {
            season_type_id: lastId,
            name: params[0],
            code: params[1],
            description: params[2] || '',
            is_active: params[3] !== undefined ? params[3] : 1,
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
            is_active: params[3] !== undefined ? params[3] : 1,
            created_at: params[4] || new Date().toISOString(),
            updated_at: params[5] || new Date().toISOString(),
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
            description: params[2] || '',
            base_price_paise: params[3] || 0,
          };
          if (!store.tables['package']) store.tables['package'] = [];
          store.tables['package'].push(obj);
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
        } else if (sql.includes('INSERT INTO registration_charge (')) {
          lastId = (store.autoIds['registration_charge'] || 0) + 1;
          store.autoIds['registration_charge'] = lastId;
          const obj = {
            charge_id: lastId,
            registration_id: params[0],
            charge_type: params[1],
            rate_inr_paise: params[2],
            rate_usd_cents: params[3],
            exchange_rate_used: params[4],
            quantity: params[5],
            amount_paise: params[6],
            created_at: params[7],
            updated_at: params[8],
          };
          if (!store.tables['registration_charge']) store.tables['registration_charge'] = [];
          store.tables['registration_charge'].push(obj);
        } else if (sql.includes('INSERT INTO registration_tax (')) {
          lastId = (store.autoIds['registration_tax'] || 0) + 1;
          store.autoIds['registration_tax'] = lastId;
          const obj = {
            tax_id: lastId,
            registration_id: params[0],
            tax_type: params[1],
            rate_percent: params[2],
            amount_paise: params[3],
            created_at: params[4],
          };
          if (!store.tables['registration_tax']) store.tables['registration_tax'] = [];
          store.tables['registration_tax'].push(obj);
        } else if (sql.includes('INSERT INTO payment (')) {
          lastId = (store.autoIds['payment'] || 0) + 1;
          store.autoIds['payment'] = lastId;
          const obj = {
            payment_id: lastId,
            registration_id: params[0],
            amount_paise: params[1],
            payment_type: params[2],
            cheque_number: params[3],
            bank_name: params[4],
            reference_number: params[5],
            payment_date: params[6],
            created_at: params[7],
          };
          if (!store.tables['payment']) store.tables['payment'] = [];
          store.tables['payment'].push(obj);
        } else if (sql.includes('INSERT INTO registration (')) {
          lastId = (store.autoIds['registration'] || 0) + 1;
          store.autoIds['registration'] = lastId;
          const obj = {
            registration_id: lastId,
            registration_number: params[0],
            customer_id: params[1],
            season_id: params[2],
            package_id: params[3],
            status: params[4] || 'Draft',
            payment_status: params[5] || 'Pending',
            created_at: params[6],
            updated_at: params[7],
          };
          if (!store.tables['registration']) store.tables['registration'] = [];
          store.tables['registration'].push(obj);
        } else if (sql.includes('UPDATE customer')) {
          const fn = params[0];
          const fa = params[1];
          const dob = params[2];
          const gen = params[3];
          const nat = params[4];
          const mob = params[5];
          const st = params[6];
          const upAt = params[7];
          const id = params[8];
          const cust = (store.tables['customer'] || []).find((c) => c.customer_id === id);
          if (cust) {
            if (fn) cust.full_name = fn;
            if (fa) cust.father_name = fa;
            if (dob) cust.date_of_birth = dob;
            if (gen) cust.gender = gen;
            if (nat) cust.nationality = nat;
            if (mob) cust.mobile_number = mob;
            if (st) cust.state = st;
            cust.updated_at = upAt;
          }
        } else if (sql.includes('UPDATE season_type SET is_active')) {
          const isActive = params[0];
          const stId = params[1];
          const st = (store.tables['season_type'] || []).find((s) => s.season_type_id === stId);
          if (st) st.is_active = isActive;
        } else if (sql.includes('UPDATE season SET is_active')) {
          const isActive = params[0];
          const sId = params[1];
          const s = (store.tables['season'] || []).find((s) => s.season_id === sId);
          if (s) s.is_active = isActive;
        } else if (sql.includes('UPDATE season')) {
          const stId = params[0];
          const yr = params[1];
          const lbl = params[2];
          const upAt = params[3];
          const sId = params[4];
          const s = (store.tables['season'] || []).find((s) => s.season_id === sId);
          if (s) {
            s.season_type_id = stId;
            s.year = yr;
            s.label = lbl;
            s.updated_at = upAt;
          }
        } else if (sql.includes('DELETE FROM season_type WHERE season_type_id = ?')) {
          const id = params[0];
          if (store.tables['season_type']) {
            store.tables['season_type'] = store.tables['season_type'].filter(s => s.season_type_id !== id);
          }
        } else if (sql.includes('DELETE FROM season WHERE season_id = ?')) {
          const id = params[0];
          if (store.tables['season']) {
            store.tables['season'] = store.tables['season'].filter(s => s.season_id !== id);
          }
        } else if (sql.includes('DELETE FROM registration_charge WHERE charge_id = ?')) {
          const id = params[0];
          if (store.tables['registration_charge']) {
            store.tables['registration_charge'] = store.tables['registration_charge'].filter(c => c.charge_id !== id);
          }
        } else if (sql.includes('DELETE FROM registration_tax WHERE tax_id = ?')) {
          const id = params[0];
          if (store.tables['registration_tax']) {
            store.tables['registration_tax'] = store.tables['registration_tax'].filter(t => t.tax_id !== id);
          }
        } else if (sql.includes('DELETE FROM payment WHERE payment_id = ?')) {
          const id = params[0];
          if (store.tables['payment']) {
            store.tables['payment'] = store.tables['payment'].filter(p => p.payment_id !== id);
          }
        } else if (sql.includes('UPDATE registration SET payment_status')) {
          const payStatus = params[0];
          const updatedAt = params[1];
          const regId = params[2];
          const reg = (store.tables['registration'] || []).find((r) => r.registration_id === regId);
          if (reg) {
            reg.payment_status = payStatus;
            reg.updated_at = updatedAt;
          }
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
      nationality TEXT NOT NULL DEFAULT 'Indian',
      mobile_number TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'Maharashtra',
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
      payment_status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS registration_charge (
      charge_id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      charge_type TEXT NOT NULL,
      rate_inr_paise INTEGER NOT NULL DEFAULT 0,
      rate_usd_cents INTEGER,
      exchange_rate_used REAL,
      quantity REAL NOT NULL DEFAULT 1,
      amount_paise INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS registration_tax (
      tax_id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      tax_type TEXT NOT NULL,
      rate_percent REAL NOT NULL,
      amount_paise INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      amount_paise INTEGER NOT NULL,
      payment_type TEXT NOT NULL,
      cheque_number TEXT,
      bank_name TEXT,
      reference_number TEXT,
      payment_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS document_sequence (
      sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_type TEXT NOT NULL,
      year INTEGER NOT NULL,
      last_number INTEGER NOT NULL DEFAULT 0,
      UNIQUE(document_type, year)
    );

    CREATE TABLE IF NOT EXISTS registration_pax (
      pax_id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      pax_sequence INTEGER NOT NULL DEFAULT 1,
      relationship TEXT NOT NULL DEFAULT 'Primary',
      room_preference TEXT,
      bus_assignment TEXT,
      pax_status TEXT NOT NULL DEFAULT 'ACTIVE',
      remarks TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (registration_id) REFERENCES registration(registration_id),
      FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
    );

    CREATE TABLE IF NOT EXISTS visa_operation (
      visa_id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      pax_id INTEGER,
      visa_status TEXT NOT NULL DEFAULT 'Pending',
      embassy_reference TEXT,
      visa_number TEXT,
      submission_date TEXT,
      approval_date TEXT,
      rejection_reason TEXT,
      batch_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flight_operation (
      flight_op_id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      pax_id INTEGER,
      airline TEXT,
      flight_number TEXT,
      pnr TEXT,
      departure_airport TEXT,
      arrival_airport TEXT,
      departure_date TEXT,
      arrival_date TEXT,
      ticket_number TEXT,
      ticket_document_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hotel_operation (
      hotel_op_id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      city TEXT NOT NULL,
      hotel_name TEXT NOT NULL,
      room_type TEXT NOT NULL,
      room_number TEXT,
      occupancy_count INTEGER NOT NULL DEFAULT 1,
      checkin_date TEXT,
      checkout_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default SeasonTypes (HAJJ, UMR), Seasons, Packages, and 20 Demo Customers if empty
  try {
    const existingSt = db.prepare(`SELECT * FROM season_type`).all();
    if (!existingSt || existingSt.length === 0) {
      db.exec(`
        INSERT INTO season_type (name, code, description, is_active) VALUES
        ('Hajj', 'HAJJ', 'Annual Hajj Pilgrimage Season', 1),
        ('Umrah', 'UMR', 'Regular Umrah Season', 1),
        ('Ramadan Umrah', 'RAM', 'Ramadan Special Umrah Package', 1);
      `);
    }

    const existingSeas = db.prepare(`SELECT * FROM season`).all();
    if (!existingSeas || existingSeas.length === 0) {
      const now = new Date().toISOString();
      db.exec(`
        INSERT INTO season (season_type_id, year, label, is_active, created_at, updated_at) VALUES
        (1, 2026, 'Hajj 2026', 1, '${now}', '${now}'),
        (2, 2026, 'Umrah 2026 Executive', 1, '${now}', '${now}');
      `);

      db.exec(`
        INSERT INTO package (season_id, name, description, base_price_paise) VALUES
        (1, 'Hajj Deluxe Package', 'Full Board 5-Star Accommodations & VVIP Transfers', 45000000),
        (1, 'Hajj Standard Package', '4-Star Hotels with Meals & Guided Ziyarat', 35000000),
        (2, 'Umrah Executive Deluxe', '5-Star Clock Tower Makkah & Madinah Front', 15000000),
        (2, 'Umrah Economy Saver', '3-Star Accommodations near Haram', 8500000);
      `);
    }

    const existingCust = db.prepare(`SELECT * FROM customer`).all();
    if (!existingCust || existingCust.length < 20) {
      const now = new Date().toISOString();
      const demoCusts = [
        ['Shafin Suleman Mahida', 'Suleman Yusuf Mahida', '2006-04-11', 'Male', 'Indian', '+917016490230', 'Maharashtra', 'Q123456', '2024-01-10', '2034-01-09', 'Mumbai'],
        ['Rashid Ahmed Khan', 'Ahmed Noor Khan', '1985-06-15', 'Male', 'Indian', '+919820011223', 'Maharashtra', 'Z9876541', '2022-03-01', '2032-02-28', 'Mumbai'],
        ['Fatima Rashid Khan', 'Rashid Ahmed Khan', '1990-08-20', 'Female', 'Indian', '+919820011224', 'Maharashtra', 'Z9876542', '2022-03-01', '2032-02-28', 'Mumbai'],
        ['Yusuf Rashid Khan', 'Rashid Ahmed Khan', '2015-11-10', 'Male', 'Indian', '+919820011223', 'Maharashtra', 'Z9876543', '2023-01-15', '2028-01-14', 'Mumbai'],
        ['Amina Rashid Khan', 'Rashid Ahmed Khan', '2018-02-05', 'Female', 'Indian', '+919820011223', 'Maharashtra', 'Z9876544', '2023-01-15', '2028-01-14', 'Mumbai'],
        ['Zainab Qasim Merchant', 'Qasim Merchant', '1988-12-12', 'Female', 'Indian', '+919666555444', 'Gujarat', 'P1900001', '2021-05-20', '2031-05-19', 'Ahmedabad'],
        ['Ibrahim Qasim Merchant', 'Qasim Merchant', '1982-04-18', 'Male', 'Indian', '+919666555445', 'Gujarat', 'P1900002', '2021-05-20', '2031-05-19', 'Ahmedabad'],
        ['Bilal Suhail Khan', 'Suhail Khan', '1992-09-09', 'Male', 'Indian', '+919811122233', 'Delhi', 'P1500001', '2020-10-10', '2030-10-09', 'Delhi'],
        ['Tariq Mahmood Shaikh', 'Mahmood Shaikh', '1979-01-25', 'Male', 'Indian', '+919700088899', 'Karnataka', 'K8877112', '2019-07-04', '2029-07-03', 'Bangalore'],
        ['Sana Tariq Shaikh', 'Tariq Mahmood Shaikh', '1984-03-30', 'Female', 'Indian', '+919700088899', 'Karnataka', 'K8877113', '2019-07-04', '2029-07-03', 'Bangalore'],
        ['Omar Farooq Al-Siddīqī', 'Farooq Al-Siddīqī', '1975-05-05', 'Male', 'Indian', '+919444455555', 'Telangana', 'T5544332', '2023-08-12', '2033-08-11', 'Hyderabad'],
        ['Khadija Omar Al-Siddīqī', 'Omar Al-Siddīqī', '1978-07-14', 'Female', 'Indian', '+919444455555', 'Telangana', 'T5544333', '2023-08-12', '2033-08-11', 'Hyderabad'],
        ['Usman Ali Ansari', 'Ali Ansari', '1995-11-22', 'Male', 'Indian', '+919111122222', 'Uttar Pradesh', 'U1122334', '2024-02-01', '2034-01-31', 'Lucknow'],
        ['Hafsa Usman Ansari', 'Usman Ali Ansari', '1997-02-14', 'Female', 'Indian', '+919111122222', 'Uttar Pradesh', 'U1122335', '2024-02-01', '2034-01-31', 'Lucknow'],
        ['Hamza Zubair Sayyed', 'Zubair Sayyed', '1987-10-10', 'Male', 'Indian', '+919333344444', 'Maharashtra', 'M3344556', '2021-11-11', '2031-11-10', 'Pune'],
        ['Mariam Hamza Sayyed', 'Hamza Zubair Sayyed', '1991-04-04', 'Female', 'Indian', '+919333344444', 'Maharashtra', 'M3344557', '2021-11-11', '2031-11-10', 'Pune'],
        ['Zayd Hamza Sayyed', 'Hamza Zubair Sayyed', '2016-06-06', 'Male', 'Indian', '+919333344444', 'Maharashtra', 'M3344558', '2022-06-06', '2027-06-05', 'Pune'],
        ['Suhail Akram Choudhury', 'Akram Choudhury', '1980-08-08', 'Male', 'Indian', '+919555566666', 'West Bengal', 'W5566778', '2020-05-05', '2030-05-04', 'Kolkata'],
        ['Nabila Suhail Choudhury', 'Suhail Choudhury', '1983-09-09', 'Female', 'Indian', '+919555566666', 'West Bengal', 'W5566779', '2020-05-05', '2030-05-04', 'Kolkata'],
        ['Zubair Hassan Patel', 'Hassan Patel', '1991-01-01', 'Male', 'Indian', '+919777788888', 'Gujarat', 'G7788990', '2024-03-15', '2034-03-14', 'Surat'],
      ];

      demoCusts.forEach((c, idx) => {
        const cId = idx + 1;
        const exists = db.prepare(`SELECT customer_id FROM customer WHERE customer_id = ?`).get(cId);
        if (!exists) {
          db.prepare(`
            INSERT INTO customer (customer_id, full_name, father_name, date_of_birth, gender, nationality, mobile_number, state, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(cId, c[0], c[1], c[2], c[3], c[4], c[5], c[6], now, now);

          db.prepare(`
            INSERT INTO customer_identity (identity_id, customer_id, passport_number, issue_date, expiry_date, place_of_issue, identity_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
          `).run(cId, cId, c[7], c[8], c[9], c[10], now);
        }
      });
    }

    const existingReg = db.prepare(`SELECT * FROM registration`).all();
    if (!existingReg || existingReg.length < 3) {
      const now = new Date().toISOString();
      const r1Exists = db.prepare(`SELECT registration_id FROM registration WHERE registration_id = 1`).get();
      if (!r1Exists) {
        db.prepare(`
          INSERT INTO registration (registration_id, registration_number, customer_id, season_id, package_id, status, payment_status, package_name_snapshot, package_price_snapshot, season_label_snapshot, season_type_code_snapshot, representative, tour_name, booking_date, airline, sector, flight_number, pnr, saudi_agent, departure_date, arrival_date, room_preference, remarks, created_at, updated_at)
          VALUES (1, 'DH-2026-HAJ-000001', 1, 1, 1, 'Visa Approved', 'Advance Received', 'Hajj Deluxe Package', 45000000, 'Hajj 2026', 'HAJJ', 'Fayyaz Khan', 'VIP Hajj Group A', '2026-01-15', 'Saudia Airlines', 'BOM - JED - BOM', 'SV-741', 'PNR-998811', 'Al-Bait Guest Services', '2026-06-01', '2026-06-20', 'Double Sharing', 'VIP Hajj Pilgrim - Single Pax', ?, ?)
        `).run(now, now);

        db.prepare(`INSERT INTO registration_pax (pax_id, registration_id, customer_id, is_primary, pax_sequence, relationship, pax_status, created_at, updated_at) VALUES (1, 1, 1, 1, 1, 'Primary', 'ACTIVE', ?, ?)`).run(now, now);
        db.prepare(`INSERT INTO registration_charge (charge_id, registration_id, charge_type, rate_inr_paise, quantity, amount_paise, created_at, updated_at) VALUES (1, 1, 'Adult', 45000000, 1, 45000000, ?, ?)`).run(now, now);
        db.prepare(`INSERT INTO payment (payment_id, registration_id, amount_paise, payment_type, payment_date, created_at) VALUES (1, 1, 10000000, 'Cash', '2026-01-15', ?)`).run(now);
      }

      const r2Exists = db.prepare(`SELECT registration_id FROM registration WHERE registration_id = 2`).get();
      if (!r2Exists) {
        db.prepare(`
          INSERT INTO registration (registration_id, registration_number, customer_id, season_id, package_id, status, payment_status, package_name_snapshot, package_price_snapshot, season_label_snapshot, season_type_code_snapshot, representative, tour_name, booking_date, airline, sector, flight_number, pnr, saudi_agent, departure_date, arrival_date, room_preference, remarks, created_at, updated_at)
          VALUES (2, 'DH-2026-UMR-000002', 2, 2, 3, 'Travel Ready', 'Fully Paid', 'Umrah Executive Deluxe', 15000000, 'Umrah 2026 Executive', 'UMR', 'Suleman Mahida', 'Executive Umrah Group 4', '2026-02-10', 'Saudia Airlines', 'BOM - JED - BOM', 'SV-743', 'PNR-FAM444', 'Makkah Clock Tower Host', '2026-03-10', '2026-03-24', '4 Sharing Quad Room', 'Family of 4 Booking', ?, ?)
        `).run(now, now);

        db.prepare(`INSERT INTO registration_pax (pax_id, registration_id, customer_id, is_primary, pax_sequence, relationship, pax_status, created_at, updated_at) VALUES (2, 2, 2, 1, 1, 'Primary', 'ACTIVE', ?, ?)`).run(now, now);
        db.prepare(`INSERT INTO registration_pax (pax_id, registration_id, customer_id, is_primary, pax_sequence, relationship, pax_status, created_at, updated_at) VALUES (3, 2, 3, 0, 2, 'Spouse', 'ACTIVE', ?, ?)`).run(now, now);
        db.prepare(`INSERT INTO registration_pax (pax_id, registration_id, customer_id, is_primary, pax_sequence, relationship, pax_status, created_at, updated_at) VALUES (4, 2, 4, 0, 3, 'Child', 'ACTIVE', ?, ?)`).run(now, now);
        db.prepare(`INSERT INTO registration_pax (pax_id, registration_id, customer_id, is_primary, pax_sequence, relationship, pax_status, created_at, updated_at) VALUES (5, 2, 5, 0, 4, 'Child', 'ACTIVE', ?, ?)`).run(now, now);

        db.prepare(`INSERT INTO registration_charge (charge_id, registration_id, charge_type, rate_inr_paise, quantity, amount_paise, created_at, updated_at) VALUES (2, 2, 'Adult', 15000000, 2, 30000000, ?, ?)`).run(now, now);
        db.prepare(`INSERT INTO registration_charge (charge_id, registration_id, charge_type, rate_inr_paise, quantity, amount_paise, created_at, updated_at) VALUES (3, 2, 'ChildWithBed', 9000000, 2, 18000000, ?, ?)`).run(now, now);
        db.prepare(`INSERT INTO payment (payment_id, registration_id, amount_paise, payment_type, reference_number, payment_date, created_at) VALUES (2, 2, 48000000, 'Bank Transfer', 'NEFT-88991122', '2026-02-12', ?)`).run(now);
      }

      const r3Exists = db.prepare(`SELECT registration_id FROM registration WHERE registration_id = 3`).get();
      if (!r3Exists) {
        db.prepare(`
          INSERT INTO registration (registration_id, registration_number, customer_id, season_id, package_id, status, payment_status, package_name_snapshot, package_price_snapshot, season_label_snapshot, season_type_code_snapshot, representative, booking_date, created_at, updated_at)
          VALUES (3, 'DH-2026-UMR-000003', 6, 2, 4, 'Documents Pending', 'Partially Paid', 'Umrah Economy Saver', 8500000, 'Umrah 2026 Executive', 'UMR', 'Fayyaz Khan', '2026-02-20', ?, ?)
        `).run(now, now);

        db.prepare(`INSERT INTO registration_pax (pax_id, registration_id, customer_id, is_primary, pax_sequence, relationship, pax_status, created_at, updated_at) VALUES (6, 3, 6, 1, 1, 'Primary', 'ACTIVE', ?, ?)`).run(now, now);
        db.prepare(`INSERT INTO registration_pax (pax_id, registration_id, customer_id, is_primary, pax_sequence, relationship, pax_status, created_at, updated_at) VALUES (7, 3, 7, 0, 2, 'Brother', 'ACTIVE', ?, ?)`).run(now, now);

        db.prepare(`INSERT INTO registration_charge (charge_id, registration_id, charge_type, rate_inr_paise, quantity, amount_paise, created_at, updated_at) VALUES (4, 3, 'Adult', 8500000, 2, 17000000, ?, ?)`).run(now, now);
        db.prepare(`INSERT INTO payment (payment_id, registration_id, amount_paise, payment_type, cheque_number, bank_name, payment_date, created_at) VALUES (3, 3, 5000000, 'Cheque', 'CHQ-445566', 'HDFC Bank', '2026-02-20', ?)`).run(now);
      }
    }
  } catch (e) {
    console.error('Failed to seed default database records:', e);
  }

  // Migration 1: Add payment_status to registration table if missing
  try { db.exec(`ALTER TABLE registration ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Pending';`); } catch {}

  // Migration 2: Add state and address columns to customer table if missing
  try { db.exec(`ALTER TABLE customer ADD COLUMN state TEXT NOT NULL DEFAULT 'Maharashtra';`); } catch {}
  try { db.exec(`ALTER TABLE customer ADD COLUMN address_line1 TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE customer ADD COLUMN address_line2 TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE customer ADD COLUMN area_locality TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE customer ADD COLUMN city TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE customer ADD COLUMN district TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE customer ADD COLUMN pin_code TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE customer ADD COLUMN country TEXT DEFAULT 'India';`); } catch {}
  try { db.exec(`ALTER TABLE customer ADD COLUMN email TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE customer ADD COLUMN phone_landline TEXT;`); } catch {}

  // Migration 3: Add is_active and timestamp columns to season table if missing
  try { db.exec(`ALTER TABLE season ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`); } catch {}
  try { db.exec(`ALTER TABLE season ADD COLUMN created_at TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE season ADD COLUMN updated_at TEXT;`); } catch {}

  // Migration 4: Add base_price_paise to package if missing
  try { db.exec(`ALTER TABLE package ADD COLUMN base_price_paise INTEGER DEFAULT 0;`); } catch {}

  // Migration 5: Add immutability snapshots & operational columns to registration if missing
  try { db.exec(`ALTER TABLE registration ADD COLUMN package_name_snapshot TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN package_price_snapshot INTEGER;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN season_label_snapshot TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN season_type_code_snapshot TEXT;`); } catch {}

  try { db.exec(`ALTER TABLE registration ADD COLUMN representative TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN tour_name TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN booking_date TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN airline TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN sector TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN flight_number TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN pnr TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN saudi_agent TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN departure_date TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN arrival_date TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN room_preference TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN bus_number TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN remarks TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN makkah_hotel TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN madinah_hotel TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN makkah_checkin TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN makkah_checkout TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN madinah_checkin TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN madinah_checkout TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN meal_plan TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN room_type TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN room_number TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE registration ADD COLUMN accommodation_notes TEXT;`); } catch {}

  // Migration 6: Add paise & exchange rate columns to registration_charge if missing
  try { db.exec(`ALTER TABLE registration_charge ADD COLUMN rate_inr_paise INTEGER NOT NULL DEFAULT 0;`); } catch {}
  try { db.exec(`ALTER TABLE registration_charge ADD COLUMN rate_usd_cents INTEGER;`); } catch {}
  try { db.exec(`ALTER TABLE registration_charge ADD COLUMN exchange_rate_used REAL;`); } catch {}
  try { db.exec(`ALTER TABLE registration_charge ADD COLUMN amount_paise INTEGER NOT NULL DEFAULT 0;`); } catch {}

  // Migrate old float amount/rate to paise if float columns existed
  try {
    db.exec(`UPDATE registration_charge SET amount_paise = ROUND(amount * 100), rate_inr_paise = ROUND(rate_inr * 100) WHERE amount_paise = 0 AND amount IS NOT NULL;`);
  } catch {}

  // Migration 7: Add amount_paise to registration_tax if missing
  try { db.exec(`ALTER TABLE registration_tax ADD COLUMN amount_paise INTEGER NOT NULL DEFAULT 0;`); } catch {}
  try { db.exec(`UPDATE registration_tax SET amount_paise = ROUND(amount * 100) WHERE amount_paise = 0 AND amount IS NOT NULL;`); } catch {}

  // Migration 8: Add amount_paise to payment if missing
  try { db.exec(`ALTER TABLE payment ADD COLUMN amount_paise INTEGER NOT NULL DEFAULT 0;`); } catch {}
  try { db.exec(`UPDATE payment SET amount_paise = ROUND(amount * 100) WHERE amount_paise = 0 AND amount IS NOT NULL;`); } catch {}

  // Migration 9: Auto-migrate existing single-customer registrations to registration_pax rows
  try {
    const existingRegs = db.prepare(`SELECT registration_id, customer_id, created_at FROM registration`).all() as any[];
    const insertPaxStmt = db.prepare(`
      INSERT INTO registration_pax (registration_id, customer_id, is_primary, pax_sequence, relationship, created_at, updated_at)
      VALUES (?, ?, 1, 1, 'Primary', ?, ?)
    `);

    for (const r of existingRegs) {
      const alreadyHasPax = db.prepare(`SELECT pax_id FROM registration_pax WHERE registration_id = ? AND customer_id = ?`).get(r.registration_id, r.customer_id);
      if (!alreadyHasPax) {
        insertPaxStmt.run(r.registration_id, r.customer_id, r.created_at, r.created_at);
      }
    }
  } catch (e) {
    console.error('Data migration to registration_pax notice:', e);
  }

  // Auto-seed default agency registered state if missing
  try {
    const existing = db.prepare(`SELECT * FROM company_settings WHERE setting_key = 'agency_registered_state'`).get();
    if (!existing) {
      db.prepare(`INSERT INTO company_settings (setting_key, setting_value, updated_at) VALUES ('agency_registered_state', 'Maharashtra', ?)`).run(new Date().toISOString());
    }
  } catch {}
}

/**
 * FULL DATABASE RESET (Part A1 Requirement)
 * Wipes all transactional data (customers, identities, registrations, charges, taxes, payments, documents).
 * Preserves/re-seeds system settings & master structures.
 * Records an AuditLog entry with timestamp.
 */
export function resetDatabaseToEmpty(): void {
  const db = getRawDb();
  const now = new Date().toISOString();

  db.exec(`
    DELETE FROM payment;
    DELETE FROM registration_tax;
    DELETE FROM registration_charge;
    DELETE FROM registration_pax;
    DELETE FROM registration;
    DELETE FROM document_version;
    DELETE FROM document;
    DELETE FROM customer_identity;
    DELETE FROM customer;
    DELETE FROM document_sequence;
  `);

  // Insert AuditLog entry recording full database reset
  try {
    db.prepare(`
      INSERT INTO audit_log (entity_type, entity_id, action, timestamp, notes)
      VALUES ('System', 0, 'DATABASE_RESET', ?, 'Full database reset executed by operator. All transactional data wiped clean.')
    `).run(now);
  } catch (e) {
    console.error('Failed to log database reset audit entry:', e);
  }
}
