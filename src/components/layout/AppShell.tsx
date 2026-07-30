import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
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
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/card';
import { getAllSeasons, SeasonWithDetails } from '../../services/seasonPackageService';

export type ActiveTab = 'home' | 'customers' | 'registrations' | 'operations' | 'documents' | 'payments' | 'settings';

interface AppShellProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  children: React.ReactNode;
  activeContextRegNumber?: string | null;
  onOpenNewCustomer: () => void;
  onOpenNewRegistration: () => void;
  onQuickBackup: () => void;
  onToggleGuide: () => void;
  showGuide: boolean;
  onWipeDatabase?: () => void;
}

export function AppShell({
  activeTab,
  setActiveTab,
  children,
  activeContextRegNumber,
  onOpenNewCustomer,
  onOpenNewRegistration,
  onQuickBackup,
  onToggleGuide,
  showGuide,
  onWipeDatabase,
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
    {
      id: 'home' as ActiveTab,
      label: 'Home Workspace',
      subtitle: 'Minimal starting point & active work',
      icon: LayoutDashboard,
      active: true,
    },
    {
      id: 'customers' as ActiveTab,
      label: 'Pilgrim Directory',
      subtitle: 'Manage customer profiles & passports',
      icon: Users,
      active: true,
    },
    {
      id: 'registrations' as ActiveTab,
      label: 'Pilgrim Registrations',
      subtitle: 'Book family Hajj & Umrah groups',
      icon: FileCheck2,
      active: true,
    },
    {
      id: 'operations' as ActiveTab,
      label: 'Travel Operations',
      subtitle: 'Visa batches, flights, PNR & hotels',
      icon: Building2,
      active: true,
    },
    {
      id: 'payments' as ActiveTab,
      label: 'Payments & Ledger',
      subtitle: 'Track receipts, GST & balances',
      icon: CreditCard,
      active: true,
    },
    {
      id: 'documents' as ActiveTab,
      label: 'Documents Vault',
      subtitle: 'View attached passports & visas',
      icon: FolderOpen,
      active: true,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      subtitle: 'Business, documents & data backup',
      icon: SettingsIcon,
      active: true,
    },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#F7F4EC] text-[#1E1A16] antialiased overflow-hidden select-none font-sans">
      {/* Light Theme Executive Sidebar Navigation */}
      <aside className="w-72 flex-shrink-0 border-r border-[#E2D7C3] bg-[#F3ECE0] text-[#1E1A16] flex flex-col justify-between p-4 shadow-2xs">
        <div className="space-y-4">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-1 border-b border-[#E2D7C3] pb-3.5">
            <div className="h-10 w-10 rounded-xl bg-[#856936] text-white flex items-center justify-center shadow-2xs shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-[#1E1A16] flex items-center gap-1">
                DAYAR-E-HABIB <Sparkles className="h-3 w-3 text-[#856936]" />
              </h1>
              <p className="text-[10px] text-[#685E52] font-semibold">Serving Pilgrims Since 1986</p>
            </div>
          </div>

          {/* Active Season Banner */}
          <div className="rounded-xl border border-[#E2D7C3] bg-white p-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-[#856936] shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase font-bold tracking-wider text-[#685E52]">Active Season</p>
                <p className="text-xs font-bold text-[#1E1A16] truncate">
                  {activeSeason ? `${activeSeason.label} (${activeSeason.year})` : 'No Active Season'}
                </p>
              </div>
            </div>
            {activeSeason && <Badge variant="gold">{activeSeason.seasonTypeCode}</Badge>}
          </div>

          {/* Active Context Memory Indicator (The Context Rule) */}
          {activeContextRegNumber && (
            <div className="rounded-xl border border-[#856936]/30 bg-[#F5EFE2] p-2.5 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[9px] uppercase font-extrabold tracking-wider text-[#856936]">Active Context</p>
                <p className="text-xs font-bold text-[#1E1A16] truncate">
                  {activeContextRegNumber}
                </p>
              </div>
              <span className="h-2 w-2 rounded-full bg-[#856936] animate-pulse" />
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-[#8A7C6B] mb-2">Office Workspaces</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className={`w-full flex items-start text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E5DAC6] text-[#1E1A16] font-bold border-l-4 border-[#856936] shadow-2xs'
                      : 'text-[#4A4238] hover:bg-[#EAE1D2] hover:text-[#1E1A16]'
                  }`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 mr-3 shrink-0 ${isSelected ? 'text-[#856936]' : 'text-[#7C7060]'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-tight">{item.label}</p>
                    <p className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-[#685E52] font-medium' : 'text-[#7C7060]'}`}>
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Local Storage Indicator */}
        <div className="rounded-xl border border-[#E2D7C3] bg-white p-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[#856936] font-bold">
              <span className="h-2 w-2 rounded-full bg-[#856936] animate-pulse" />
              100% Offline Mode
            </span>
            <ShieldCheck className="h-4 w-4 text-[#856936]" />
          </div>
          <p className="text-[10px] text-[#685E52] leading-tight">
            Local SQLite • The Calm ERP Engine
          </p>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 flex-shrink-0 border-b border-[#E2D7C3] bg-white px-6 flex items-center justify-between shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#1E1A16] capitalize">
                {activeTab === 'home' && 'Home Office Workspace'}
                {activeTab === 'customers' && 'Pilgrim Directory & Passports'}
                {activeTab === 'registrations' && 'Pilgrim Registrations'}
                {activeTab === 'operations' && 'Travel Operations & Execution'}
                {activeTab === 'documents' && 'Documents Vault'}
                {activeTab === 'payments' && 'Payments & Ledger'}
                {activeTab === 'settings' && 'System Settings'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F5EFE2] text-[#856936] border border-[#E2D7C3]">
                {activeTab.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[#685E52]">
              {activeTab === 'home' && 'Quiet starting point for active registrations, quick search, and pending work'}
              {activeTab === 'customers' && 'Find pilgrim profiles, passport numbers, and active registration links'}
              {activeTab === 'registrations' && 'Manage family registrations, itineraries, rooming, and printable A4 forms'}
              {activeTab === 'operations' && 'Visa embassy batches, flight PNRs, airline tickets, and hotel rooming allocations'}
              {activeTab === 'documents' && 'Store and inspect passport scans and visa attachments securely'}
              {activeTab === 'payments' && 'Record payment receipts, track GST, and review pilgrim credit balances'}
              {activeTab === 'settings' && 'Configure seasons, package pricing, letterhead, audit logs, and data backups'}
            </p>
          </div>

          {/* Header Action Buttons — Single Gold Action, Discrete Help Button */}
          <div className="flex items-center gap-3">
            {onWipeDatabase && (
              <Button
                variant="outline"
                size="sm"
                onClick={onWipeDatabase}
                className="text-xs border-red-200 text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-300 font-semibold"
                title="Wipe all client records and registrations clean"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1 text-red-600" />
                Wipe Client Data
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onToggleGuide}
              className="text-xs border-[#E2D7C3] text-[#685E52] hover:bg-[#F5EFE2]"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1 text-[#856936]" />
              ? Help
            </Button>

            <Button variant="default" size="sm" onClick={onOpenNewRegistration} className="text-xs font-bold bg-[#856936] text-white hover:bg-[#6E562B]">
              <Plus className="h-3.5 w-3.5 mr-1" />
              + New Registration
            </Button>
          </div>
        </header>

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F7F4EC]">
          {children}
        </main>
      </div>
    </div>
  );
}
