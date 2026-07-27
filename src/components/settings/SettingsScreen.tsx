import React, { useState, useEffect } from 'react';
import {
  Folder,
  HardDriveDownload,
  ShieldCheck,
  Archive,
  History,
  FolderTree,
  Save,
  CheckCircle2,
  Tag,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, Badge, Label } from '../ui/card';
import { getDirectoryStats, updateDataDirectoryPath, DataDirectoryStats } from '../../services/settingsService';
import { createBackup, listBackups, BackupInfo } from '../../services/backupService';
import { getAllAuditLogs } from '../../services/auditService';
import { getAllSeasonTypes, createSeasonType } from '../../services/seasonTypeService';
import { getAllDocumentTypes, createDocumentType, OwnerScope } from '../../services/documentTypeService';
import { AuditLog, SeasonType, DocumentTypeEntity } from '../../db/schema';

export function SettingsScreen() {
  const [stats, setStats] = useState<DataDirectoryStats | null>(null);
  const [dirPathInput, setDirPathInput] = useState('');
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [seasonTypes, setSeasonTypes] = useState<SeasonType[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeEntity[]>([]);

  // SeasonType Modal Form state
  const [showSeasonTypeModal, setShowSeasonTypeModal] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [typeDesc, setTypeDesc] = useState('');

  // DocumentType Modal Form state
  const [showDocTypeModal, setShowDocTypeModal] = useState(false);
  const [docTypeName, setDocTypeName] = useState('');
  const [docTypeCode, setDocTypeCode] = useState('');
  const [docOwnerScope, setDocOwnerScope] = useState<OwnerScope>('REGISTRATION');
  const [docReqExpiry, setDocReqExpiry] = useState(false);
  const [docReqNumber, setDocReqNumber] = useState(false);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [saveDirSuccessMsg, setSaveDirSuccessMsg] = useState<string | null>(null);

  const reloadData = () => {
    try {
      const s = getDirectoryStats();
      setStats(s);
      setDirPathInput(s.path);
      setBackups(listBackups());
      setAuditLogs(getAllAuditLogs(50));
      setSeasonTypes(getAllSeasonTypes());
      setDocumentTypes(getAllDocumentTypes());
    } catch (e) {
      console.error(e);
    }
  };


  useEffect(() => {
    reloadData();
  }, []);

  const handleSaveDirectory = () => {
    try {
      const updated = updateDataDirectoryPath(dirPathInput);
      setStats(updated);
      setSaveDirSuccessMsg('Data Directory updated successfully!');
      setTimeout(() => setSaveDirSuccessMsg(null), 4000);
      reloadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update data directory');
    }
  };

  const handleCreateSeasonType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim() || !typeCode.trim()) return;
    try {
      createSeasonType({
        name: typeName,
        code: typeCode,
        description: typeDesc,
        is_active: 1,
      });
      setTypeName('');
      setTypeCode('');
      setTypeDesc('');
      setShowSeasonTypeModal(false);
      reloadData();
    } catch (err: any) {
      alert('Error creating season type: ' + err.message);
    }
  };

  const handleCreateDocumentType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTypeName.trim() || !docTypeCode.trim()) return;
    try {
      createDocumentType({
        name: docTypeName,
        code: docTypeCode,
        owner_scope: docOwnerScope,
        requires_expiry: docReqExpiry,
        requires_number: docReqNumber,
      });
      setDocTypeName('');
      setDocTypeCode('');
      setDocReqExpiry(false);
      setDocReqNumber(false);
      setShowDocTypeModal(false);
      reloadData();
    } catch (err: any) {
      alert('Error creating document type: ' + err.message);
    }
  };

  const handleBackupNow = async () => {

    setIsBackingUp(true);
    setBackupSuccessMsg(null);
    try {
      const b = await createBackup();
      setBackupSuccessMsg(`Backup created successfully: ${b.filename} (${(b.sizeBytes / 1024).toFixed(1)} KB)`);
      reloadData();
    } catch (err: any) {
      alert('Backup failed: ' + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner: Local Security & Backup Action */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <ShieldCheck className="h-5 w-5" />
            <span>Fully Offline Local Storage Architecture</span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Business data, pilgrim registrations, and identities live in a self-contained local SQLite database.
            No cloud services or network connection required.
          </p>
        </div>

        <Button
          onClick={handleBackupNow}
          disabled={isBackingUp}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 h-11 rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer"
        >
          <HardDriveDownload className={`h-4 w-4 mr-2 ${isBackingUp ? 'animate-bounce' : ''}`} />
          {isBackingUp ? 'Compressing Backup...' : 'Backup Now (.dhtt)'}
        </Button>
      </div>

      {backupSuccessMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 flex items-center gap-2 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{backupSuccessMsg}</span>
        </div>
      )}

      {/* SeasonType Master Table Manager */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-400" /> SeasonType Master Table (Operator Managed)
            </h3>
            <p className="text-xs text-slate-400">
              Defines standard Season Codes used in 6-digit registration numbers (e.g. Hajj/HAJJ, Umrah/UMR, Ramadan/RMZN).
            </p>
          </div>

          <Button
            onClick={() => setShowSeasonTypeModal(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            + New Season Type
          </Button>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">Season Type Name</th>
                <th className="px-3 py-2.5">Master Code</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {seasonTypes.length > 0 ? (
                seasonTypes.map((st) => (
                  <tr key={st.season_type_id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 text-slate-500 font-mono">#{st.season_type_id}</td>
                    <td className="px-3 py-2 font-bold text-slate-100">{st.name}</td>
                    <td className="px-3 py-2">
                      <Badge variant="gold" className="font-mono">
                        {st.code}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-400">{st.description}</td>
                    <td className="px-3 py-2">
                      <Badge variant={st.is_active ? 'default' : 'secondary'}>
                        {st.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500 italic">
                    No Season Types configured yet. Click "+ New Season Type" above to add your first type (e.g. Hajj/HAJJ).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Grid Layout: Configurable Data Directory & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Directory Path & Structure */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Directory Config */}
          <Card className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-400" /> Configurable Data Directory Path
            </h3>

            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                Application binary and business data are completely separated. Set the directory where database files, flat documents, backups, and logs will be stored:
              </p>

              <div className="flex items-center gap-3 pt-1">
                <Input
                  value={dirPathInput}
                  onChange={(e) => setDirPathInput(e.target.value)}
                  className="font-mono text-xs bg-slate-950 border-slate-800 text-slate-100 flex-1"
                />

                <Button onClick={handleSaveDirectory} className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="h-4 w-4 mr-2" />
                  Save Path
                </Button>
              </div>

              {saveDirSuccessMsg && (
                <p className="text-xs text-emerald-400 pt-1 font-medium">{saveDirSuccessMsg}</p>
              )}
            </div>
          </Card>

          {/* Card: Directory Structure Inspector */}
          <Card className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-emerald-400" /> Data Folder Contents
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-slate-400">Database File</p>
                <p className="font-mono font-bold text-slate-200 text-sm mt-1">database.db</p>
                <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                  {stats ? (stats.databaseSize / 1024).toFixed(1) : 0} KB
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-slate-400">Documents Vault</p>
                <p className="font-mono font-bold text-slate-200 text-sm mt-1">Documents/</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {stats?.documentFolderCount || 0} Reg Folders
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-slate-400">Backups Archive</p>
                <p className="font-mono font-bold text-slate-200 text-sm mt-1">Backups/</p>
                <p className="text-[11px] text-amber-400 mt-0.5">
                  {stats?.backupCount || 0} .dhtt Files
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-slate-400">System Audit Logs</p>
                <p className="font-mono font-bold text-slate-200 text-sm mt-1">Logs/</p>
                <p className="text-[11px] text-emerald-400 mt-0.5">Auto-Logged</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Backup History List */}
        <div>
          <Card className="h-full flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Archive className="h-4 w-4 text-amber-400" /> Backup Archives
                </h3>
                <Badge variant="gold">{backups.length} Total</Badge>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {backups.length > 0 ? (
                  backups.map((b, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-mono font-bold text-amber-300">{b.filename}</p>
                        <p className="text-[10px] text-slate-500">{b.createdAt.slice(0, 19).replace('T', ' ')}</p>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {(b.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-8 italic">
                    No backup archives generated yet. Click "Backup Now" above.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Audit Log Table Viewer */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-400" /> Automated System Audit Logs (Last 50 Actions)
          </h3>
          <Badge variant="secondary">{auditLogs.length} Events</Badge>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 sticky top-0 font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">ID</th>
                  <th className="px-3 py-2.5">Entity</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Notes</th>
                  <th className="px-3 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-800/30 font-mono">
                    <td className="px-3 py-2 text-slate-500">#{log.log_id}</td>
                    <td className="px-3 py-2 text-slate-200 font-semibold">{log.entity_type}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'Created'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : log.action === 'Updated'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-300 max-w-md truncate">{log.notes || '-'}</td>
                    <td className="px-3 py-2 text-slate-500 text-[11px]">
                      {log.timestamp.slice(0, 19).replace('T', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* New SeasonType Modal */}
      {showSeasonTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSeasonType} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-100 text-base">Add New Season Type (Master Code)</h3>

            <div>
              <Label>Type Name *</Label>
              <Input
                placeholder="e.g. Hajj, Umrah, Ramadan"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                required
              />
            </div>

            <div>
              <Label>Master Code (Uppercase, No spaces) *</Label>
              <Input
                placeholder="e.g. HAJJ, UMR, RMZN"
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1 uppercase font-mono"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                placeholder="e.g. Annual Hajj season registrations"
                value={typeDesc}
                onChange={(e) => setTypeDesc(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowSeasonTypeModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600">
                Save Season Type
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
