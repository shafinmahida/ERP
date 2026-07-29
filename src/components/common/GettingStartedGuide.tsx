import React from 'react';
import { Sparkles, Calendar, UserPlus, FileCheck2, X, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';

interface GettingStartedGuideProps {
  onDismiss: () => void;
  onNavigateToTab: (tab: 'settings' | 'customers' | 'registrations') => void;
  hasSeasons: boolean;
  hasCustomers: boolean;
  hasRegistrations: boolean;
}

export function GettingStartedGuide({
  onDismiss,
  onNavigateToTab,
  hasSeasons,
  hasCustomers,
  hasRegistrations,
}: GettingStartedGuideProps) {
  return (
    <div className="mb-6 rounded-2xl border border-[#E2D7C3] bg-gradient-to-r from-white via-[#FAF6EE] to-[#F5EFE2] p-5 shadow-2xs relative overflow-hidden">
      {/* Deco Background Accent */}
      <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
        <Sparkles className="w-48 h-48 text-[#856936]" />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F5EFE2] text-[#856936] border border-[#E2D7C3] flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-[#856936]" /> Sacred Stewardship Workflow
            </span>
            <span className="text-xs text-[#685E52] font-medium">• Serving Pilgrims Since 1986</span>
          </div>
          <h3 className="text-base font-bold text-[#1E1A16]">Dayar-E-Habib Office Workflow Guide</h3>
          <p className="text-xs text-[#685E52] max-w-2xl leading-relaxed mt-0.5">
            Follow this calm, 3-step guide to configure operational seasons, record pilgrim identity profiles, and manage Hajj & Umrah family group registrations.
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="text-[#9E9282] hover:text-[#1E1A16] p-1 rounded-lg hover:bg-[#EAE0CF] transition-colors cursor-pointer"
          title="Dismiss Guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 3 Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {/* Step 1 */}
        <div
          className={`rounded-xl p-3.5 border transition-all ${
            hasSeasons
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-white border-[#E2D7C3] shadow-2xs hover:border-[#856936]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#856936] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#856936]" /> Step 1: Season Setup
            </span>
            {hasSeasons ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-800" />
            ) : (
              <span className="text-[10px] font-bold bg-[#F5EFE2] text-[#856936] px-1.5 py-0.5 rounded border border-[#E2D7C3]">Step 1</span>
            )}
          </div>
          <p className="text-xs font-bold text-[#1E1A16] mb-1">Operational Season & Packages</p>
          <p className="text-[11px] text-[#685E52] mb-3 leading-snug">
            Add Hajj 2026 or Umrah 1447H with pricing packages.
          </p>
          <Button
            variant={hasSeasons ? 'outline' : 'default'}
            size="sm"
            className="w-full text-xs h-7"
            onClick={() => onNavigateToTab('settings')}
          >
            {hasSeasons ? 'Manage Seasons' : 'Add First Season'}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Step 2 */}
        <div
          className={`rounded-xl p-3.5 border transition-all ${
            hasCustomers
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-white border-[#E2D7C3] shadow-2xs hover:border-[#856936]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#856936] flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-[#856936]" /> Step 2: Pilgrim Records
            </span>
            {hasCustomers ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-800" />
            ) : (
              <span className="text-[10px] font-bold bg-[#F2ECE0] text-[#685E52] px-1.5 py-0.5 rounded border border-[#E2D7C3]">Step 2</span>
            )}
          </div>
          <p className="text-xs font-bold text-[#1E1A16] mb-1">Pilgrim Identity Profiles</p>
          <p className="text-[11px] text-[#685E52] mb-3 leading-snug">
            Record customer passports with 10-yr auto-expiry calculation.
          </p>
          <Button
            variant={hasCustomers ? 'outline' : 'default'}
            size="sm"
            className="w-full text-xs h-7"
            onClick={() => onNavigateToTab('customers')}
          >
            {hasCustomers ? 'View Customers' : '+ Add Pilgrim Profile'}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Step 3 */}
        <div
          className={`rounded-xl p-3.5 border transition-all ${
            hasRegistrations
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-white border-[#E2D7C3] shadow-2xs hover:border-[#856936]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#856936] flex items-center gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5 text-[#856936]" /> Step 3: Group Booking
            </span>
            {hasRegistrations ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-800" />
            ) : (
              <span className="text-[10px] font-bold bg-[#F2ECE0] text-[#685E52] px-1.5 py-0.5 rounded border border-[#E2D7C3]">Step 3</span>
            )}
          </div>
          <p className="text-xs font-bold text-[#1E1A16] mb-1">Hajj & Umrah Group Booking</p>
          <p className="text-[11px] text-[#685E52] mb-3 leading-snug">
            Link family members, flight tickets, hotels, and print booking forms.
          </p>
          <Button
            variant={hasRegistrations ? 'outline' : 'default'}
            size="sm"
            className="w-full text-xs h-7"
            onClick={() => onNavigateToTab('registrations')}
          >
            {hasRegistrations ? 'View Registrations' : '+ Start Group Booking'}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
