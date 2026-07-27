import React, { useState, useEffect } from 'react';
import {
  Users,
  FileCheck2,
  CreditCard,
  Receipt,
  FolderOpen,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  HardDriveDownload,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/card';
import { getAllSeasons, SeasonWithDetails } from '../../services/seasonPackageService';

export type ActiveTab = 'customers' | 'registrations' | 'documents' | 'settings';

interface AppShellProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  children: React.ReactNode;
  onOpenNewCustomer: () => void;
  onOpenNewRegistration: () => void;
  onQuickBackup: () => void;
}

export function AppShell({
  activeTab,
  setActiveTab,
  children,
  onOpenNewCustomer,
  onOpenNewRegistration,
  onQuickBackup,
}: AppShellProps) {
  const [seasons, setSeasons] = useState<SeasonWithDetails[]>([]);
  const [activeSeason, setActiveSeason] = useState<SeasonWithDetails | null>(null);

  useEffect(() => {
    try {
      const sList = getAllSeasons();
      setSeasons(sList);
      if (sList.length > 0) {
        setActiveSeason(sList[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

  const navItems = [
    { id: 'customers' as ActiveTab, label: 'Customers & Passports', icon: Users, active: true },
    { id: 'registrations' as ActiveTab, label: 'Pilgrim Registrations', icon: FileCheck2, active: true },
    { id: 'documents' as ActiveTab, label: 'Documents Vault', icon: FolderOpen, active: true },
    { id: 'payments', label: 'Payments', icon: CreditCard, active: false, badge: 'Phase 2' },
    { id: 'receipts', label: 'Receipts & Vouchers', icon: Receipt, active: false, badge: 'Phase 2' },
    { id: 'reports', label: 'Analytics & Reports', icon: BarChart3, active: false, badge: 'Phase 2' },
    { id: 'settings' as ActiveTab, label: 'Settings & Data Backup', icon: SettingsIcon, active: true },
  ];


  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 antialiased overflow-hidden select-none">
      {/* Sidebar Navigation */}
      <aside className="w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900/90 flex flex-col justify-between p-4">
        <div className="space-y-6">
          {/* App Branding */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Building2 className="h-6 w-6 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
                DAYAR-E-HABIB <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              </h1>
              <p className="text-xs text-slate-400">Hajj & Umrah ERP 2026</p>
            </div>
          </div>

          {/* Active Season Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Season</p>
                <p className="text-xs font-semibold text-slate-200">
                  {activeSeason ? `${activeSeason.label} (${activeSeason.year})` : 'No Season Selected'}
                </p>
              </div>
            </div>
            {activeSeason && <Badge variant="gold">{activeSeason.seasonTypeCode}</Badge>}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Main Modules</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              if (item.active) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as ActiveTab)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-900/30'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              }

              return (
                <div
                  key={item.id}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 cursor-not-allowed opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-slate-600" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {item.badge}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Offline Security Footer */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Offline Mode
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Local SQLite Database • C:\DayarEHabibERP
          </p>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 capitalize">
              {activeTab === 'customers' && 'Customer Directory'}
              {activeTab === 'registrations' && 'Pilgrim Registrations'}
              {activeTab === 'settings' && 'System Settings & Season Types'}
            </h2>
            <p className="text-xs text-slate-400">
              {activeTab === 'customers' && 'Manage customers, identity records, and duplicate detection'}
              {activeTab === 'registrations' && 'Manage pilgrim registrations with 6-digit sequence numbers'}
              {activeTab === 'settings' && 'SeasonType Master Table, data directory path, audit logs, and backups'}
            </p>
          </div>

          {/* Quick Actions Header Buttons */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onQuickBackup} className="border-slate-700 text-slate-200 hover:bg-slate-800">
              <HardDriveDownload className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
              Backup Now
            </Button>

            <Button variant="outline" size="sm" onClick={onOpenNewCustomer} className="border-slate-700 text-slate-200 hover:bg-slate-800">
              <Plus className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              + Customer
            </Button>

            <Button variant="default" size="sm" onClick={onOpenNewRegistration} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              + Registration
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/80">
          {children}
        </main>
      </div>
    </div>
  );
}
