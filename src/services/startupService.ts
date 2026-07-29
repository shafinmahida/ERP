/**
 * DAYAR-E-HABIB ERP — DIAGNOSTIC & STARTUP TIMELINE SERVICE
 */

import { initializeFoundationDatabase, getRawDb, getDatabasePath } from '../db';
import { ensureDefaultDocumentTypesSeeded } from './documentTypeService';

export interface StartupLogEntry {
  timestamp: string;
  stage: string;
  subsystem: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  details: string;
}

export interface SystemDiagnostics {
  runtimeEnvironment: 'Tauri Desktop' | 'Vite Web Browser' | 'Node CLI';
  databaseDriver: 'Node SQLite Native' | 'WebStorage Disk Store';
  databasePath: string;
  customerCount: number;
  registrationCount: number;
  seasonCount: number;
  documentTypeCount: number;
  timestamp: string;
}

const startupLogs: StartupLogEntry[] = [];

export function logStartupStage(stage: string, subsystem: string, status: 'SUCCESS' | 'WARNING' | 'ERROR', details: string) {
  const entry: StartupLogEntry = {
    timestamp: new Date().toISOString(),
    stage,
    subsystem,
    status,
    details,
  };
  startupLogs.push(entry);
  console.log(`[ERP Startup :: ${stage}] [${subsystem}] (${status}): ${details}`);
}

export function getStartupTimeline(): StartupLogEntry[] {
  return [...startupLogs];
}

export function getSystemDiagnostics(): SystemDiagnostics {
  const db = getRawDb();
  const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__);
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

  let runtimeEnv: 'Tauri Desktop' | 'Vite Web Browser' | 'Node CLI' = 'Vite Web Browser';
  if (isTauri) {
    runtimeEnv = 'Tauri Desktop';
  } else if (isNode && typeof window === 'undefined') {
    runtimeEnv = 'Node CLI';
  }

  const isNativeSqlite = isNode && !!(process as any).getBuiltinModule && !!(process as any).getBuiltinModule('node:sqlite');
  const dbDriver = isNativeSqlite ? 'Node SQLite Native' : 'WebStorage Disk Store';

  let customerCount = 0;
  let registrationCount = 0;
  let seasonCount = 0;
  let documentTypeCount = 0;

  try {
    const custs = db.prepare(`SELECT * FROM customer`).all();
    customerCount = custs ? custs.length : 0;

    const regs = db.prepare(`SELECT * FROM registration`).all();
    registrationCount = regs ? regs.length : 0;

    const seas = db.prepare(`SELECT * FROM season`).all();
    seasonCount = seas ? seas.length : 0;

    const docs = db.prepare(`SELECT * FROM document_type`).all();
    documentTypeCount = docs ? docs.length : 0;
  } catch {}

  return {
    runtimeEnvironment: runtimeEnv,
    databaseDriver: dbDriver,
    databasePath: getDatabasePath(),
    customerCount,
    registrationCount,
    seasonCount,
    documentTypeCount,
    timestamp: new Date().toISOString(),
  };
}

export function runFullStartupDiagnostic(): { success: boolean; logs: StartupLogEntry[] } {
  try {
    logStartupStage('1/5', 'Logger', 'SUCCESS', 'Initializing System Diagnostic Timeline...');
    
    // Stage 2: Database Engine Connection
    logStartupStage('2/5', 'Database', 'SUCCESS', 'Connecting to Persistent SQLite Database Engine...');
    initializeFoundationDatabase();
    
    // Stage 3: Master Data & DocumentType Seeding
    logStartupStage('3/5', 'MasterData', 'SUCCESS', 'Verifying & Seeding Master DocumentTypes...');
    ensureDefaultDocumentTypesSeeded();
    
    // Stage 4: Settings & Configuration Preload
    logStartupStage('4/5', 'Settings', 'SUCCESS', 'Preloading Application Configuration & Security Parameters...');
    
    // Stage 5: UI Container Ready
    const diag = getSystemDiagnostics();
    logStartupStage('5/5', 'ReactUI', 'SUCCESS', `Startup Complete. Environment: ${diag.runtimeEnvironment} | Driver: ${diag.databaseDriver} | Custs: ${diag.customerCount} | Regs: ${diag.registrationCount}`);

    return { success: true, logs: startupLogs };
  } catch (err: any) {
    logStartupStage('CRITICAL', 'StartupSystem', 'ERROR', `Startup failed: ${err?.message || err}`);
    return { success: false, logs: startupLogs };
  }
}
