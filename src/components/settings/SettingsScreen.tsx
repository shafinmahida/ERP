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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { getDirectoryStats, updateDataDirectoryPath, DataDirectoryStats } from '../../services/settingsService';
import { createBackup, listBackups, BackupInfo } from '../../services/backupService';
import { resetDatabaseToEmpty } from '../../db';
import { getAllAuditLogs } from '../../services/auditService';
import { getAllSeasonTypes, createSeasonType, toggleSeasonTypeActive, deleteSeasonType } from '../../services/seasonTypeService';
import { getAllSeasons, createSeason, toggleSeasonActive, deleteSeason, SeasonWithDetails } from '../../services/seasonPackageService';
import { getAgencyRegisteredState, updateAgencyRegisteredState } from '../../services/financialService';
import { AuditLog, SeasonType } from '../../db/schema';
import { HelpTooltip } from '../common/HelpTooltip';

export function SettingsScreen() {
  const [stats, setStats] = useState<DataDirectoryStats | null>(null);
  const [dirPathInput, setDirPathInput] = useState('');
  const [agencyStateInput, setAgencyStateInput] = useState('');
  const [agencyStateSuccessMsg, setAgencyStateSuccessMsg] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [seasonTypes, setSeasonTypes] = useState<SeasonType[]>([]);
  const [seasons, setSeasons] = useState<SeasonWithDetails[]>([]);

  // Operational Season Modal state
  const [showNewSeasonModal, setShowNewSeasonModal] = useState(false);
  const [newSeasonTypeId, setNewSeasonTypeId] = useState<number | null>(null);
  const [newSeasonYear, setNewSeasonYear] = useState<number>(2026);
  const [newSeasonLabel, setNewSeasonLabel] = useState<string>('Hajj 2026');

  // Database Reset Modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmPhraseInput, setConfirmPhraseInput] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // SeasonType Modal Form state
  const [showSeasonTypeModal, setShowSeasonTypeModal] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [typeDesc, setTypeDesc] = useState('');

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [saveDirSuccessMsg, setSaveDirSuccessMsg] = useState<string | null>(null);

  const reloadData = () => {
    try {
      const s = getDirectoryStats();
      setStats(s);
      setDirPathInput(s.path);
      setAgencyStateInput(getAgencyRegisteredState());
      setBackups(listBackups());
      setAuditLogs(getAllAuditLogs(50));
      const stList = getAllSeasonTypes();
      setSeasonTypes(stList);
      setSeasons(getAllSeasons());
      if (stList.length > 0 && !newSeasonTypeId) {
        setNewSeasonTypeId(stList[0].season_type_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSeasonInSettings = (e: React.FormEvent) => {
    e.preventDefault();
    let typeId = newSeasonTypeId;
    if (!typeId) {
      const freshTypes = getAllSeasonTypes();
      setSeasonTypes(freshTypes);
      if (freshTypes.length > 0) {
        typeId = freshTypes[0].season_type_id;
      }
    }
    if (!typeId) {
      alert('Please create a Season Type first in the table below.');
      return;
    }
    if (!newSeasonLabel.trim()) {
      alert('Please enter a Season Label (e.g. Hajj 2026).');
      return;
    }
    try {
      const s = createSeason(typeId, newSeasonYear, newSeasonLabel);
      setShowNewSeasonModal(false);
      setNewSeasonLabel('');
      reloadData();
      alert(`Operational Season "${s.label}" created successfully!`);
    } catch (err: any) {
      alert('Error creating season: ' + (err.message || err));
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleSaveAgencyState = () => {
    try {
      const updated = updateAgencyRegisteredState(agencyStateInput);
      setAgencyStateSuccessMsg(`Agency Registered State updated to "${updated}"`);
      setTimeout(() => setAgencyStateSuccessMsg(null), 4000);
      reloadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update agency state');
    }
  };

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
        name: typeName.trim(),
        code: typeCode.trim().toUpperCase(),
        description: typeDesc.trim(),
        is_active: 1,
      });
      setTypeName('');
      setTypeCode('');
      setTypeDesc('');
      setShowSeasonTypeModal(false);
      reloadData();
    } catch (err: any) {
      alert('Error creating season type: ' + (err.message || err));
    }
  };

  const handleExecuteDatabaseReset = () => {
    if (confirmPhraseInput.trim() !== 'DELETE ALL DATA') {
      alert('Invalid confirmation phrase. Please type "DELETE ALL DATA" exactly to proceed.');
      return;
    }

    try {
      resetDatabaseToEmpty();
      setResetSuccessMsg('Database has been completely reset to zero rows. An audit log entry was recorded.');
      setConfirmPhraseInput('');
      setShowResetModal(false);
      setTimeout(() => setResetSuccessMsg(null), 6000);
      reloadData();
    } catch (err: any) {
      alert('Failed to reset database: ' + err.message);
    }
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    setBackupSuccessMsg(null);
    try {
      const b = await createBackup();
      setBackupSuccessMsg(`Backup archive created: ${b.filename} (${(b.sizeBytes / 1024).toFixed(1)} KB)`);
      reloadData();
    } catch (err: any) {
      alert('Backup failed: ' + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Security Banner */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-6 shadow-2xs flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
            <ShieldCheck className="h-5 w-5" />
            <span>100% Offline Local Storage Architecture</span>
            <HelpTooltip text="All data is stored directly on your computer's local drive. No cloud server connection is required." />
          </div>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Customer identity profiles, registrations, package pricing, and payment receipts are stored securely in local SQLite file.
          </p>
        </div>

        <Button
          onClick={handleBackupNow}
          disabled={isBackingUp}
          className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold px-6 h-10 rounded-lg shadow-2xs cursor-pointer"
        >
          <HardDriveDownload className={`h-4 w-4 mr-2 ${isBackingUp ? 'animate-bounce' : ''}`} />
          {isBackingUp ? 'Creating Backup...' : 'Backup Data Now (.dhtt)'}
        </Button>
      </div>

      {backupSuccessMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{backupSuccessMsg}</span>
        </div>
      )}

      {/* Operational Seasons Manager */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-emerald-800" /> Operational Seasons (Hajj / Umrah Years)
              <HelpTooltip text="Each season owns package pricing and family registrations for a given year." />
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Manage tour seasons (e.g. Hajj 2026, Umrah 1447H) and toggle active status
            </p>
          </div>

          <Button
            onClick={() => setShowNewSeasonModal(true)}
            size="sm"
            className="bg-emerald-800 hover:bg-emerald-900 font-bold"
          >
            <Plus className="h-4 w-4 mr-1" />
            + New Season
          </Button>
        </div>

        <div className="rounded-lg border border-stone-200/80 overflow-hidden">
          <table className="w-full text-left text-xs text-stone-800">
            <thead className="bg-stone-50 font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200">
              <tr>
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">Season Label</th>
                <th className="px-3 py-2.5">Code</th>
                <th className="px-3 py-2.5">Year</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {seasons.length > 0 ? (
                seasons.map((s) => (
                  <tr key={s.season_id} className="hover:bg-stone-50/70">
                    <td className="px-3 py-2 text-stone-500 font-mono">#{s.season_id}</td>
                    <td className="px-3 py-2 font-bold text-stone-900">{s.label}</td>
                    <td className="px-3 py-2">
                      <Badge variant="gold" className="font-mono">
                        {s.seasonTypeCode}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-stone-700">{s.year}</td>
                    <td className="px-3 py-2">
                      <Badge variant={s.is_active ? 'emerald' : 'secondary'}>
                        {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-stone-600 hover:text-stone-900"
                        onClick={() => {
                          toggleSeasonActive(s.season_id, s.is_active ? 0 : 1);
                          reloadData();
                        }}
                      >
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-rose-600 hover:text-rose-800"
                        onClick={() => {
                          if (confirm(`Delete Season "${s.label}"?`)) {
                            try {
                              deleteSeason(s.season_id);
                              reloadData();
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-stone-500 italic">
                    No seasons configured yet. Click "+ New Season" above to add your first season.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SeasonType Master Table Manager */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-700" /> Season Types Master Code Table
              <HelpTooltip text="Defines code prefixes used in registration numbers (e.g. DH-H26 for Hajj, DH-U26 for Umrah)." />
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Defines category codes (HAJJ, UMR, RMZN) for Hajj and Umrah tour registrations
            </p>
          </div>

          <Button
            onClick={() => setShowSeasonTypeModal(true)}
            size="sm"
            className="bg-emerald-800 hover:bg-emerald-900"
          >
            <Plus className="h-4 w-4 mr-1" />
            + New Season Type
          </Button>
        </div>

        <div className="rounded-lg border border-stone-200/80 overflow-hidden">
          <table className="w-full text-left text-xs text-stone-800">
            <thead className="bg-stone-50 font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200">
              <tr>
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">Season Type Name</th>
                <th className="px-3 py-2.5">Master Code</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {seasonTypes.length > 0 ? (
                seasonTypes.map((st) => (
                  <tr key={st.season_type_id} className="hover:bg-stone-50/70">
                    <td className="px-3 py-2 text-stone-500 font-mono">#{st.season_type_id}</td>
                    <td className="px-3 py-2 font-bold text-stone-900">{st.name}</td>
                    <td className="px-3 py-2">
                      <Badge variant="gold" className="font-mono">
                        {st.code}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-stone-600">{st.description || '-'}</td>
                    <td className="px-3 py-2">
                      <Badge variant={st.is_active ? 'emerald' : 'secondary'}>
                        {st.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-stone-600 hover:text-stone-900"
                        onClick={() => {
                          toggleSeasonTypeActive(st.season_type_id, st.is_active ? 0 : 1);
                          reloadData();
                        }}
                      >
                        {st.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-rose-600 hover:text-rose-800"
                        onClick={() => {
                          if (confirm(`Delete Season Type "${st.name}" (${st.code})?`)) {
                            try {
                              deleteSeasonType(st.season_type_id);
                              reloadData();
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-stone-500 italic">
                    No season types configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Grid: Directory Settings & Agency Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Agency State Settings */}
          <Card className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-800" /> Agency Registered State (GST Calculation Baseline)
              <HelpTooltip text="Used to suggest CGST+SGST (Same State) or IGST (Other State) tax calculation." />
            </h3>
            <p className="text-xs text-stone-500">
              Defines your office state location to automatically suggest correct tax splits on invoices.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <Input
                value={agencyStateInput}
                onChange={(e) => setAgencyStateInput(e.target.value)}
                placeholder="e.g. Maharashtra, Gujarat, Delhi"
                className="text-xs flex-1"
              />
              <Button onClick={handleSaveAgencyState} className="bg-emerald-800 hover:bg-emerald-900 text-xs font-bold">
                <Save className="h-3.5 w-3.5 mr-1.5" /> Save State
              </Button>
            </div>
            {agencyStateSuccessMsg && (
              <p className="text-xs text-emerald-800 font-semibold">{agencyStateSuccessMsg}</p>
            )}
          </Card>

          {/* Directory Path Configuration */}
          <Card className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-700" /> Local Data Directory Storage Path
            </h3>
            <p className="text-xs text-stone-500">
              Path where SQLite database, backups, and passport vault files are saved:
            </p>

            <div className="flex items-center gap-3 pt-1">
              <Input
                value={dirPathInput}
                onChange={(e) => setDirPathInput(e.target.value)}
                className="font-mono text-xs flex-1"
              />
              <Button onClick={handleSaveDirectory} className="bg-emerald-800 hover:bg-emerald-900 text-xs font-bold">
                <Save className="h-3.5 w-3.5 mr-1.5" /> Save Path
              </Button>
            </div>
            {saveDirSuccessMsg && (
              <p className="text-xs text-emerald-800 font-semibold">{saveDirSuccessMsg}</p>
            )}
          </Card>
        </div>

        {/* Right Col: Backups List */}
        <div>
          <Card className="h-full flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                  <Archive className="h-4 w-4 text-amber-700" /> Backup Archives
                </h3>
                <Badge variant="gold">{backups.length} Files</Badge>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {backups.length > 0 ? (
                  backups.map((b, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-stone-200 bg-stone-50/70 p-3 text-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-mono font-bold text-amber-900">{b.filename}</p>
                        <p className="text-[10px] text-stone-500 mt-0.5">{b.createdAt?.slice(0, 19).replace('T', ' ') || '-'}</p>
                      </div>
                      <span className="font-mono text-[10px] text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200">
                        {(b.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-500 text-center py-8 italic">
                    No backups generated yet. Click "Backup Data Now" above.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-800" /> Audit Trail (Recent Actions Log)
          </h3>
          <Badge variant="secondary">{auditLogs.length} Events</Badge>
        </div>

        <div className="rounded-lg border border-stone-200/80 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs text-stone-800">
              <thead className="bg-stone-50 sticky top-0 font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-3 py-2.5">ID</th>
                  <th className="px-3 py-2.5">Entity</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Notes</th>
                  <th className="px-3 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-stone-50/70">
                    <td className="px-3 py-2 text-stone-500">#{log.log_id}</td>
                    <td className="px-3 py-2 font-bold text-stone-900">{log.entity_type}</td>
                    <td className="px-3 py-2">
                      <Badge variant={log.action === 'Created' ? 'emerald' : log.action === 'Updated' ? 'gold' : 'destructive'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-stone-700 max-w-md truncate font-sans">{log.notes || '-'}</td>
                    <td className="px-3 py-2 text-stone-500 text-[11px]">
                      {log.timestamp?.slice(0, 19).replace('T', ' ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* New Season Modal */}
      <Dialog open={showNewSeasonModal} onOpenChange={setShowNewSeasonModal}>
        <DialogContent className="max-w-md bg-white border-stone-200 text-stone-900 p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-stone-900">Add Operational Season</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSeasonInSettings} className="space-y-4 pt-2">
            <div>
              <Label>Season Type *</Label>
              <select
                value={newSeasonTypeId || ''}
                onChange={(e) => setNewSeasonTypeId(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                required
              >
                {seasonTypes.map((st) => (
                  <option key={st.season_type_id} value={st.season_type_id}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Operational Year *</Label>
              <Input
                type="number"
                value={newSeasonYear}
                onChange={(e) => setNewSeasonYear(Number(e.target.value))}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Season Label *</Label>
              <Input
                placeholder="e.g. Hajj 2026, Umrah 1447H"
                value={newSeasonLabel}
                onChange={(e) => setNewSeasonLabel(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewSeasonModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-800 hover:bg-emerald-900 font-bold">
                Save Season
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New SeasonType Modal */}
      <Dialog open={showSeasonTypeModal} onOpenChange={setShowSeasonTypeModal}>
        <DialogContent className="max-w-md bg-white border-stone-200 text-stone-900 p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-stone-900">Add Season Type</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSeasonType} className="space-y-4 pt-2">
            <div>
              <Label>Type Name *</Label>
              <Input
                placeholder="e.g. Hajj, Umrah, Ramadan"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Master Code (e.g. HAJJ, UMR, RMZN) *</Label>
              <Input
                placeholder="e.g. HAJJ, UMR, RMZN"
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
                className="mt-1 uppercase font-mono"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowSeasonTypeModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-800 hover:bg-emerald-900 font-bold">
                Save Season Type
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
