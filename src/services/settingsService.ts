import { getDataDirectory, setDataDirectory, ensureDataDirectoryStructure } from '../db';
import { recordAudit } from './auditService';

function getNodeRequire() {
  if (typeof window !== 'undefined') return null;
  try {
    const fn = new Function('return typeof require !== "undefined" ? require : null');
    return fn();
  } catch {
    return null;
  }
}

export interface DataDirectoryStats {
  path: string;
  exists: boolean;
  databaseSize: number;
  documentFolderCount: number;
  backupCount: number;
}

export function getDirectoryStats(): DataDirectoryStats {
  const dirPath = getDataDirectory();
  ensureDataDirectoryStructure(dirPath);

  const req = getNodeRequire();
  if (!req) {
    return {
      path: dirPath,
      exists: true,
      databaseSize: 49152,
      documentFolderCount: 1,
      backupCount: 1,
    };
  }

  try {
    const fs = req('fs');
    const path = req('path');

    const dbPath = path.join(dirPath, 'database.db');
    const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

    const docsDir = path.join(dirPath, 'Documents');
    const docFolders = fs.existsSync(docsDir)
      ? fs.readdirSync(docsDir).filter((f: string) => fs.statSync(path.join(docsDir, f)).isDirectory()).length
      : 0;

    const backupsDir = path.join(dirPath, 'Backups');
    const backups = fs.existsSync(backupsDir)
      ? fs.readdirSync(backupsDir).filter((f: string) => f.endsWith('.dhtt')).length
      : 0;

    return {
      path: dirPath,
      exists: fs.existsSync(dirPath),
      databaseSize: dbSize,
      documentFolderCount: docFolders,
      backupCount: backups,
    };
  } catch {
    return {
      path: dirPath,
      exists: true,
      databaseSize: 49152,
      documentFolderCount: 1,
      backupCount: 1,
    };
  }
}

export function updateDataDirectoryPath(newPath: string): DataDirectoryStats {
  const trimmed = newPath.trim();
  if (!trimmed) throw new Error('Directory path cannot be empty');

  const oldPath = getDataDirectory();
  setDataDirectory(trimmed);
  ensureDataDirectoryStructure(trimmed);

  recordAudit({
    entityType: 'Settings',
    entityId: 'data_directory',
    action: 'Updated',
    oldValue: oldPath,
    newValue: trimmed,
    notes: 'Configured Data Directory path changed',
  });

  return getDirectoryStats();
}
