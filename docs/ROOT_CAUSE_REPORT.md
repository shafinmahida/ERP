# ROOT CAUSE DIAGNOSTIC REPORT

> **Staff Engineer Root Cause Analysis for Environment & Execution Divergence**

---

## 1. Divergence: Vite Browser Mode vs Tauri Desktop Mode

### Symptom
- Browser mode (`npm run dev`) loaded customer list and registrations differently than Tauri desktop mode (`npx tauri dev`).

### Root Cause
1. **Dual Storage Engines**: 
   - Browser mode uses `WebStorageDiskStore` reading/writing to browser `localStorage` key `dayar_e_habib_db`.
   - Desktop mode uses `node:sqlite` reading physical file `Documents/Dayar-E-Habib Data/database.db`.
2. **Missing SQL Matchers**: `WebStorageDiskStore.prepare(sql).all()` lacked query pattern matchers for `FROM registration_pax WHERE registration_id = ?` and `SELECT registration_id FROM registration`. This caused `getRegistrationPaxList()` to return `[]` in browser mode, resulting in 0 registrations showing in the UI.
3. **Seed Discrepancy**: Browser mode seeded data only when `localStorage` was completely empty, leaving stale 10-customer records when updated. Desktop mode seeded data only when `customer` table had 0 records.

### Unified Solution
- Updated `WebStorageDiskStore` SQL matchers to support all `FROM registration_pax` and `FROM registration` queries flexibly.
- Updated both `WebStorageDiskStore` and `initDdl(nativeDb)` to automatically verify and populate the complete **20-Pilgrim Directory** and **3 Multi-PAX Registrations** (`DH-2026-HAJ-000001`, `DH-2026-UMR-000002`, `DH-2026-UMR-000003`) on launch.

---

## 2. Divergence: GitHub Actions CI Runner Failure

### Symptom
- CI pipeline failed on Node 20 runner with `table season has no column named is_active`.

### Root Cause
1. **Schema Timing Bug**: The initial `CREATE TABLE IF NOT EXISTS season` DDL omitted `is_active`, `created_at`, and `updated_at`, expecting migration `ALTER TABLE` statements to add them later.
2. **Execution Order**: On a fresh runner where `database.db` did not exist, `INSERT INTO season (..., is_active, ...)` ran immediately after `CREATE TABLE` and *before* `ALTER TABLE`, causing SQLite to throw `ERR_SQLITE_ERROR`.
3. **Cascading Test Failure**: Because season seeding failed, `getAllSeasons()` returned `[]`, making `testSeason` `undefined` and failing Scenario 2.

### Unified Solution
- Updated `CREATE TABLE IF NOT EXISTS season` (as well as `customer`, `package`, and `registration`) to define all columns upfront.
- Updated `.github/workflows/ci.yml` to run under Node 24.
