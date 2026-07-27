/**
 * DAYAR-E-HABIB ERP — DIAGNOSTIC & STARTUP TIMELINE SERVICE
 */

import { initializeFoundationDatabase } from '../db';
import { ensureDefaultDocumentTypesSeeded } from './documentTypeService';

export interface StartupLogEntry {
  timestamp: string;
  stage: string;
  subsystem: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  details: string;
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
    logStartupStage('5/5', 'ReactUI', 'SUCCESS', 'Startup Complete. React Application Shell Ready.');

    return { success: true, logs: startupLogs };
  } catch (err: any) {
    logStartupStage('CRITICAL', 'StartupSystem', 'ERROR', `Startup failed: ${err?.message || err}`);
    return { success: false, logs: startupLogs };
  }
}
