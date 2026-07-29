import React, { useState, useEffect, useMemo } from 'react';
import { FileCheck2, User, Calendar, Plus, Check, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/card';
import { CustomerWithIdentity } from '../../services/customerService';
import { SeasonWithDetails, getPackagesBySeason, createSeason, createPackage } from '../../services/seasonPackageService';
import { getActiveSeasonTypes } from '../../services/seasonTypeService';
import { generateRegistrationNumber, RegistrationStatus, REGISTRATION_STATUSES } from '../../services/registrationService';
import { SeasonType, Package } from '../../db/schema';

interface RegistrationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerWithIdentity[];
  seasons: SeasonWithDetails[];
  preselectedCustomer?: CustomerWithIdentity | null;
  onSubmitRegistration: (data: {
    customer_id: number;
    season_id: number;
    package_id: number;
    status: RegistrationStatus;
  }) => void;
  onOpenQuickAddCustomer: () => void;
  onRefreshSeasons: () => void;
}

export function RegistrationFormModal({
  isOpen,
  onClose,
  customers,
  seasons,
  preselectedCustomer,
  onSubmitRegistration,
  onOpenQuickAddCustomer,
  onRefreshSeasons,
}: RegistrationFormModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [status, setStatus] = useState<RegistrationStatus>('Draft');

  // Season Types list
  const [seasonTypes, setSeasonTypes] = useState<SeasonType[]>([]);

  // Inline Season Creation Modal state
  const [showNewSeasonModal, setShowNewSeasonModal] = useState(false);
  const [newSeasonTypeId, setNewSeasonTypeId] = useState<number | null>(null);
  const [newSeasonYear, setNewSeasonYear] = useState<number>(2026);
  const [newSeasonLabel, setNewSeasonLabel] = useState<string>('Hajj 2026');

  // Inline Package Creation Modal state
  const [showNewPackageModal, setShowNewPackageModal] = useState(false);
  const [newPackageName, setNewPackageName] = useState<string>('');
  const [newPackageDesc, setNewPackageDesc] = useState<string>('');

  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomerId(preselectedCustomer.customer_id);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].customer_id);
    }
  }, [preselectedCustomer, customers]);

  useEffect(() => {
    if (seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(seasons[0].season_id);
    }
  }, [seasons]);

  useEffect(() => {
    try {
      const stList = getActiveSeasonTypes();
      setSeasonTypes(stList);
      if (stList.length > 0 && !newSeasonTypeId) {
        setNewSeasonTypeId(stList[0].season_type_id);
      }
    } catch (e) {
      console.error(e);
    }
  }, [showNewSeasonModal]);

  useEffect(() => {
    if (selectedSeasonId) {
      const pkgs = getPackagesBySeason(selectedSeasonId);
      setPackages(pkgs);
      if (pkgs.length > 0) {
        setSelectedPackageId(pkgs[0].package_id);
      } else {
        setSelectedPackageId(null);
      }
    }
  }, [selectedSeasonId]);

  // Live Registration Number Preview
  const regNumberPreview = useMemo(() => {
    if (!selectedSeasonId) return 'DH-H26-001';
    try {
      return generateRegistrationNumber(selectedSeasonId);
    } catch {
      return 'DH-H26-001';
    }
  }, [selectedSeasonId]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.father_name.toLowerCase().includes(q) ||
        (c.currentPassport || '').toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const selectedCustomerObj = useMemo(
    () => customers.find((c) => c.customer_id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const handleCreateSeason = () => {
    let typeId = newSeasonTypeId;
    if (!typeId && seasonTypes.length > 0) {
      typeId = seasonTypes[0].season_type_id;
    }
    if (!typeId) {
      alert('Please select a valid Season Type (or create one in Settings if none exist).');
      return;
    }
    if (!newSeasonLabel.trim()) {
      alert('Please enter a Season Label (e.g. Hajj 2026).');
      return;
    }

    try {
      const s = createSeason(typeId, newSeasonYear, newSeasonLabel);
      onRefreshSeasons();
      setSelectedSeasonId(s.season_id);
      setShowNewSeasonModal(false);
    } catch (err: any) {
      alert('Failed to create Season: ' + err.message);
    }
  };

  const handleCreatePackage = () => {
    if (!selectedSeasonId || !newPackageName.trim()) return;
    const p = createPackage(selectedSeasonId, newPackageName, newPackageDesc);
    const updatedPkgs = getPackagesBySeason(selectedSeasonId);
    setPackages(updatedPkgs);
    setSelectedPackageId(p.package_id);
    setNewPackageName('');
    setNewPackageDesc('');
    setShowNewPackageModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedSeasonId || !selectedPackageId) {
      alert('Please select a customer, season, and package.');
      return;
    }

    onSubmitRegistration({
      customer_id: selectedCustomerId,
      season_id: selectedSeasonId,
      package_id: selectedPackageId,
      status,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border-[#E2D7C3] text-[#1E1A16] p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-[#1E1A16]">
            <FileCheck2 className="h-5 w-5 text-[#856936]" />
            Create New Pilgrim Registration
          </DialogTitle>
        </DialogHeader>

        {/* Live Auto-Generated Registration Number Preview Banner */}
        <div className="rounded-xl border border-[#E2D7C3] bg-[#F7F4EC] p-4 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#685E52]">
              Auto-Generated Registration Number
            </p>
            <p className="text-xl font-mono font-black text-[#856936] tracking-wider">
              {regNumberPreview}
            </p>
          </div>
          <span className="text-xs bg-[#F5EFE2] text-[#856936] font-mono px-3 py-1 rounded-full border border-[#E2D7C3] font-bold">
            System Assigned
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Step 1: Customer Selection */}
          <div className="space-y-3 rounded-xl border border-[#E2D7C3] bg-[#F7F4EC] p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-[#856936] font-bold">
                <User className="h-4 w-4" /> 1. Select Primary Customer / Pilgrim *
              </Label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenQuickAddCustomer}
                className="h-7 text-xs font-bold"
              >
                <Plus className="h-3 w-3 mr-1 text-[#856936]" />
                + Quick Add New Customer
              </Button>
            </div>

            {selectedCustomerObj ? (
              <div className="rounded-lg border border-[#E2D7C3] bg-white p-3 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="font-bold text-sm text-[#1E1A16]">{selectedCustomerObj.full_name}</p>
                  <p className="text-xs text-[#685E52]">
                    S/O {selectedCustomerObj.father_name} • Passport: {selectedCustomerObj.currentPassport || 'None'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomerId(null)}
                  className="text-xs text-[#685E52] hover:text-[#1E1A16]"
                >
                  Change Customer
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#948877]" />
                  <Input
                    placeholder="Search existing customer by name, father name, passport #..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 bg-white border-[#E2D7C3]"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-[#E2D7C3] rounded-lg p-1 bg-white">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.customer_id}
                      type="button"
                      onClick={() => setSelectedCustomerId(c.customer_id)}
                      className="w-full text-left p-2 rounded-md hover:bg-[#F5EFE2] text-xs flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-bold text-[#1E1A16]">{c.full_name}</span>{' '}
                        <span className="text-[#685E52]">(S/O {c.father_name})</span>
                      </div>
                      <span className="font-mono text-[#856936] font-semibold">{c.currentPassport || 'No Passport'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Season & Package Selection */}
          <div className="space-y-4 rounded-xl border border-[#E2D7C3] bg-[#F7F4EC] p-4 shadow-2xs">
            <Label className="flex items-center gap-1.5 text-[#856936] font-bold">
              <Calendar className="h-4 w-4" /> 2. Season & Package Selection *
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Season</Label>
                  <button
                    type="button"
                    onClick={() => setShowNewSeasonModal(true)}
                    className="text-[11px] text-[#856936] hover:underline font-bold"
                  >
                    + Create Season
                  </button>
                </div>
                <select
                  value={selectedSeasonId || ''}
                  onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-[#E2D7C3] bg-white px-3 text-xs font-bold text-[#1E1A16] focus:outline-none focus:ring-2 focus:ring-[#856936]/30 cursor-pointer"
                >
                  {seasons.length > 0 ? (
                    seasons.map((s) => (
                      <option key={s.season_id} value={s.season_id}>
                        {s.label} ({s.year}) — [{s.seasonTypeCode}]
                      </option>
                    ))
                  ) : (
                    <option value="">No Seasons Created Yet</option>
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Package (Filtered by Season)</Label>
                  <button
                    type="button"
                    onClick={() => setShowNewPackageModal(true)}
                    className="text-[11px] text-[#856936] hover:underline font-bold"
                  >
                    + Create Package
                  </button>
                </div>
                <select
                  value={selectedPackageId || ''}
                  onChange={(e) => setSelectedPackageId(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-[#E2D7C3] bg-white px-3 text-xs font-bold text-[#1E1A16] focus:outline-none focus:ring-2 focus:ring-[#856936]/30 cursor-pointer"
                >
                  {packages.length > 0 ? (
                    packages.map((p) => (
                      <option key={p.package_id} value={p.package_id}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No Packages for this Season</option>
                  )}
                </select>
              </div>
            </div>

            {/* Step 3: Status selection */}
            <div className="pt-2">
              <Label>Initial Status (Defaults to Draft)</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RegistrationStatus)}
                className="h-9 w-full rounded-md border border-[#E2D7C3] bg-white px-3 text-xs font-bold text-[#1E1A16] mt-1 focus:outline-none focus:ring-2 focus:ring-[#856936]/30 cursor-pointer"
              >
                {REGISTRATION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-[#685E52]">
              Cancel
            </Button>

            <Button type="submit" className="bg-[#856936] hover:bg-[#6E562B] text-white font-bold px-6">
              <Check className="h-4 w-4 mr-2" />
              Complete Registration
            </Button>
          </div>
        </form>

        {/* Create Season Sub-Modal */}
        {showNewSeasonModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2D7C3] p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="font-bold text-[#1E1A16] text-base">Add New Season</h3>

              <div>
                <Label>Select Season Type (Master Code) *</Label>
                <select
                  value={newSeasonTypeId || ''}
                  onChange={(e) => setNewSeasonTypeId(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-[#E2D7C3] bg-white px-3 text-xs font-bold text-[#1E1A16] mt-1 focus:outline-none focus:ring-2 focus:ring-[#856936]/30 cursor-pointer"
                >
                  {seasonTypes.length > 0 ? (
                    seasonTypes.map((st) => (
                      <option key={st.season_type_id} value={st.season_type_id}>
                        {st.name} ({st.code})
                      </option>
                    ))
                  ) : (
                    <option value="">No Season Types created (Go to Settings)</option>
                  )}
                </select>
              </div>

              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={newSeasonYear}
                  onChange={(e) => setNewSeasonYear(Number(e.target.value))}
                  className="bg-white border-[#E2D7C3] text-[#1E1A16] mt-1"
                />
              </div>
              <div>
                <Label>Season Label</Label>
                <Input
                  placeholder="e.g. Hajj 2026, Umrah 1447H"
                  value={newSeasonLabel}
                  onChange={(e) => setNewSeasonLabel(e.target.value)}
                  className="bg-white border-[#E2D7C3] text-[#1E1A16] mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowNewSeasonModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreateSeason} className="bg-[#856936] text-white font-bold">
                  Save Season
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Package Sub-Modal */}
        {showNewPackageModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2D7C3] p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="font-bold text-[#1E1A16] text-base">Add New Package for Season</h3>
              <div>
                <Label>Package Name</Label>
                <Input
                  placeholder="e.g. Executive Shifting Hajj Package"
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                  className="bg-white border-[#E2D7C3] text-[#1E1A16] mt-1"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="e.g. 5-Star stay in Makkah with Azizia shifting"
                  value={newPackageDesc}
                  onChange={(e) => setNewPackageDesc(e.target.value)}
                  className="bg-white border-[#E2D7C3] text-[#1E1A16] mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowNewPackageModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreatePackage} className="bg-[#856936] text-white font-bold">
                  Save Package
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
