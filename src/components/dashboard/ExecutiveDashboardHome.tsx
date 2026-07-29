import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Users,
  Search,
  ArrowRight,
  Plus,
  Clock,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';

interface HomeOfficeWorkspaceProps {
  customerCount: number;
  registrationCount: number;
  recentRegistrations: any[];
  interruptedDraft?: any | null;
  onNavigateToTab: (tab: 'home' | 'customers' | 'registrations' | 'payments' | 'documents' | 'settings') => void;
  onOpenNewRegistration: () => void;
  onOpenRegistrationWorkspace: (regId: number) => void;
}

export function ExecutiveDashboardHome({
  customerCount,
  registrationCount,
  recentRegistrations = [],
  interruptedDraft = null,
  onNavigateToTab,
  onOpenNewRegistration,
  onOpenRegistrationWorkspace,
}: HomeOfficeWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [greeting, setGreeting] = useState('Good Day');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigateToTab('customers');
    }
  };

  // Find 1 interrupted draft if none passed
  const activeDraft = interruptedDraft || recentRegistrations.find((r) => r.status === 'Draft' || r.status === 'Incomplete') || recentRegistrations[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 font-sans">
      {/* 1. MINIMAL CONTEXTUAL GREETING & PRIMARY ACTIONS */}
      <div className="bg-white border border-[#E2D7C3] rounded-2xl p-8 shadow-2xs space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[#856936] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#856936]" /> Dayar-E-Habib Office Workspace
          </p>
          <h1 className="text-2xl font-bold text-[#1E1A16] tracking-tight">
            {greeting}. What would you like to do?
          </h1>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button
            onClick={onOpenNewRegistration}
            className="bg-[#856936] text-white hover:bg-[#6E562B] text-xs font-bold px-6 py-3 h-auto rounded-xl flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            + New Registration
          </Button>

          <Button
            variant="outline"
            onClick={() => onNavigateToTab('customers')}
            className="border-[#E2D7C3] text-[#1E1A16] hover:bg-[#F5EFE2] text-xs font-bold px-6 py-3 h-auto rounded-xl flex items-center gap-2 cursor-pointer"
          >
            <Search className="h-4 w-4 text-[#856936]" />
            Find Customer / Registration
          </Button>
        </div>

        {/* Quick Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative pt-2">
          <Search className="absolute left-4 top-5.5 h-4 w-4 text-[#856936]" />
          <input
            type="text"
            placeholder="Type Name, Passport Number, Mobile, or Registration #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl pl-11 pr-24 py-3 text-xs text-[#1E1A16] font-semibold placeholder-[#8A7C6B] focus:outline-none focus:ring-2 focus:ring-[#856936]/30 shadow-2xs"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1.5 top-3.5 h-8 text-xs font-bold bg-[#856936] text-white hover:bg-[#6E562B]"
          >
            Search
          </Button>
        </form>
      </div>

      {/* 2. INTERRUPTION RECOVERY CARD (IF DRAFT EXISTS) */}
      {activeDraft && (
        <div className="bg-white border border-[#E2D7C3] rounded-2xl p-6 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#856936] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#856936]" /> Continue Working
            </span>
            <span className="text-[11px] text-[#685E52] font-semibold">Interrupted Draft</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div>
              <h3 className="text-sm font-bold text-[#1E1A16]">
                Registration #{activeDraft.registration_number || 'DH-U26-003'} — {activeDraft.primaryPilgrimName || activeDraft.customer_name || 'Mohammed Javeed Khan'}
              </h3>
              <p className="text-xs text-[#685E52] mt-0.5">
                {activeDraft.paxCount || 5} PAX Family • {activeDraft.packageName || 'Umrah Deluxe'}
              </p>
            </div>

            <Button
              onClick={() => onOpenRegistrationWorkspace(activeDraft.registration_id || 1)}
              className="bg-[#856936] text-white hover:bg-[#6E562B] text-xs font-bold px-4 py-2 h-auto rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              Resume Registration
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* 3. NEEDS YOUR ATTENTION QUEUE */}
      <div className="bg-white border border-[#E2D7C3] rounded-2xl p-6 shadow-2xs space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#856936] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[#856936]" /> Needs Your Attention
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F4EC] border border-[#E2D7C3]">
            <span className="font-semibold text-[#1E1A16]">
              • 1 Registration waiting for passport document upload
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToTab('registrations')}
              className="text-xs font-bold text-[#856936] hover:bg-[#EAE1D2]"
            >
              Review Registration →
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F4EC] border border-[#E2D7C3]">
            <span className="font-semibold text-[#1E1A16]">
              • 2 Payments awaiting receipt confirmation
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToTab('payments')}
              className="text-xs font-bold text-[#856936] hover:bg-[#EAE1D2]"
            >
              Open Payments →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
