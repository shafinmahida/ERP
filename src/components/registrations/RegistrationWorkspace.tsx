import React, { useState, useEffect } from 'react';
import {
  RegistrationWithDetails,
  REGISTRATION_STATUSES,
  createRegistrationWithPax,
  updateRegistrationWithPax,
  getRegistrationWithDetails,
  PaxDetailJoined,
  PaxInputData,
} from '../../services/registrationService';
import { getActiveSeasons, getPackagesBySeason, SeasonWithDetails } from '../../services/seasonPackageService';
import { getAllCustomers, CustomerWithIdentity } from '../../services/customerService';
import { suggestPassportExpiryDate } from '../../services/dateUtils';
import { Package } from '../../db/schema';
import { generateBookingFormDocument, generateInvoiceDocument, printDocumentHtml } from '../../services/print/printEngine';
import { Button } from '../ui/button';
import { Badge } from '../ui/card';
import { HelpTooltip } from '../common/HelpTooltip';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Clock,
  Printer,
  Users,
  Plane,
  Building2,
  CreditCard,
  FileText,
  Trash2,
  BarChart3,
  UserCheck,
  Star,
  UserPlus,
} from 'lucide-react';

interface RegistrationWorkspaceProps {
  registrationId?: number | null;
  onClose: () => void;
  onSaved: (reg: RegistrationWithDetails) => void;
}

export function RegistrationWorkspace({ registrationId, onClose, onSaved }: RegistrationWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const paxEndRef = React.useRef<HTMLDivElement>(null);

  // Master Selections
  const [seasons, setSeasons] = useState<SeasonWithDetails[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [customers, setCustomers] = useState<CustomerWithIdentity[]>([]);

  // Form State
  const [seasonId, setSeasonId] = useState<number>(0);
  const [packageId, setPackageId] = useState<number>(0);
  const [status, setStatus] = useState<string>('Draft');
  const [representative, setRepresentative] = useState<string>('');
  const [tourName, setTourName] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Travel State
  const [airline, setAirline] = useState<string>('');
  const [sector, setSector] = useState<string>('');
  const [flightNumber, setFlightNumber] = useState<string>('');
  const [pnr, setPnr] = useState<string>('');
  const [saudiAgent, setSaudiAgent] = useState<string>('');
  const [departureDate, setDepartureDate] = useState<string>('');
  const [arrivalDate, setArrivalDate] = useState<string>('');

  // Accommodation State
  const [roomPreference, setRoomPreference] = useState<string>('');
  const [busNumber, setBusNumber] = useState<string>('');
  const [makkahHotel, setMakkahHotel] = useState<string>('');
  const [madinahHotel, setMadinahHotel] = useState<string>('');
  const [makkahCheckin, setMakkahCheckin] = useState<string>('');
  const [makkahCheckout, setMakkahCheckout] = useState<string>('');
  const [madinahCheckin, setMadinahCheckin] = useState<string>('');
  const [madinahCheckout, setMadinahCheckout] = useState<string>('');
  const [mealPlan, setMealPlan] = useState<string>('Full Board (Breakfast, Lunch, Dinner)');
  const [roomType, setRoomType] = useState<string>('4 Sharing (Quad)');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [accommodationNotes, setAccommodationNotes] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Multi-PAX List State
  const [paxList, setPaxList] = useState<Array<Partial<PaxDetailJoined>>>([
    {
      is_primary: 1,
      relationship: 'Primary',
      fullName: '',
      fatherName: '',
      dob: '',
      gender: 'Male',
      nationality: 'Indian',
      mobile: '',
      passportNumber: '',
      issueDate: '',
      expiryDate: '',
      placeOfIssue: 'Mumbai',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: 'Maharashtra',
      pinCode: '',
      email: '',
    },
  ]);

  const [currentReg, setCurrentReg] = useState<RegistrationWithDetails | null>(null);

  useEffect(() => {
    const activeSeas = getActiveSeasons();
    setSeasons(activeSeas);
    const allCusts = getAllCustomers();
    setCustomers(allCusts);

    if (registrationId) {
      const reg = getRegistrationWithDetails(registrationId);
      if (reg) {
        setCurrentReg(reg);
        setSeasonId(reg.season_id);
        setPackageId(reg.package_id);
        setStatus(reg.status);
        setRepresentative(reg.representative || '');
        setTourName(reg.tour_name || '');
        setBookingDate(reg.booking_date || '');
        setAirline(reg.airline || '');
        setSector(reg.sector || '');
        setFlightNumber(reg.flight_number || '');
        setPnr(reg.pnr || '');
        setSaudiAgent(reg.saudi_agent || '');
        setDepartureDate(reg.departure_date || '');
        setArrivalDate(reg.arrival_date || '');
        setRoomPreference(reg.room_preference || '');
        setBusNumber(reg.bus_number || '');
        setRemarks(reg.remarks || '');
        setMakkahHotel((reg as any).makkah_hotel || '');
        setMadinahHotel((reg as any).madinah_hotel || '');
        setMakkahCheckin((reg as any).makkah_checkin || '');
        setMakkahCheckout((reg as any).makkah_checkout || '');
        setMadinahCheckin((reg as any).madinah_checkin || '');
        setMadinahCheckout((reg as any).madinah_checkout || '');
        setMealPlan((reg as any).meal_plan || 'Full Board (Breakfast, Lunch, Dinner)');
        setRoomType((reg as any).room_type || '4 Sharing (Quad)');
        setRoomNumber((reg as any).room_number || '');
        setAccommodationNotes((reg as any).accommodation_notes || '');

        if (reg.paxList && reg.paxList.length > 0) {
          setPaxList(reg.paxList);
        }

        const pkgs = getPackagesBySeason(reg.season_id);
        setPackages(pkgs);
      }
    } else {
      if (activeSeas.length > 0) {
        setSeasonId(activeSeas[0].season_id);
        const pkgs = getPackagesBySeason(activeSeas[0].season_id);
        setPackages(pkgs);
        if (pkgs.length > 0) setPackageId(pkgs[0].package_id);
      }
    }
  }, [registrationId]);

  const handleSeasonChange = (sId: number) => {
    setSeasonId(sId);
    const pkgs = getPackagesBySeason(sId);
    setPackages(pkgs);
    if (pkgs.length > 0) setPackageId(pkgs[0].package_id);
    setSaveStatus('unsaved');
  };

  // Populate PAX Card from Customer Directory
  const handleSelectCustomerForPax = (index: number, customerId: number) => {
    const cust = customers.find((c) => c.customer_id === customerId);
    if (!cust) return;

    const activeIdentity = cust.identities.find((i) => i.identity_status === 'ACTIVE') || cust.identities[0];

    setPaxList((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        customer_id: cust.customer_id,
        fullName: cust.full_name,
        fatherName: cust.father_name,
        dob: cust.date_of_birth,
        gender: cust.gender || 'Male',
        nationality: cust.nationality || 'Indian',
        mobile: cust.mobile_number,
        passportNumber: cust.currentPassport || (activeIdentity?.passport_number || ''),
        issueDate: activeIdentity?.issue_date || '',
        expiryDate: activeIdentity?.expiry_date || '',
        placeOfIssue: activeIdentity?.place_of_issue || 'Mumbai',
        addressLine1: cust.address_line1 || '',
        addressLine2: cust.address_line2 || '',
        city: cust.city || '',
        state: cust.state || 'Maharashtra',
        pinCode: cust.pin_code || '',
        email: cust.email || '',
      };
      return copy;
    });
    setSaveStatus('unsaved');
  };

  const handleSetPrimaryPax = (primaryIdx: number) => {
    setPaxList((prev) =>
      prev.map((p, idx) => ({
        ...p,
        is_primary: idx === primaryIdx ? 1 : 0,
        relationship: idx === primaryIdx ? 'Primary' : p.relationship === 'Primary' ? 'Relative' : p.relationship,
      }))
    );
    setSaveStatus('unsaved');
  };

  const handlePaxChange = (index: number, field: string, value: any) => {
    setPaxList((prev) => {
      const copy = [...prev];
      const updated = { ...copy[index], [field]: value };
      if (field === 'fullName' && updated.customer_id) {
        // If editing name manually, detach customer_id so it saves as new profile if changed
        const originalCust = customers.find((c) => c.customer_id === updated.customer_id);
        if (originalCust && originalCust.full_name !== value) {
          updated.customer_id = undefined;
        }
      }
      if (field === 'issueDate' && value) {
        const suggestedExpiry = suggestPassportExpiryDate(value);
        if (suggestedExpiry) {
          updated.expiryDate = suggestedExpiry;
        }
      }
      copy[index] = updated;
      return copy;
    });
    setSaveStatus('unsaved');
  };

  const addPax = (relationship: string, gender: string = 'Male') => {
    let finalRel = relationship;
    if (relationship.includes('Child')) {
      const isDaughter = gender === 'Female' || relationship.includes('Daughter');
      const existingChildren = paxList.filter((p) => p.relationship && p.relationship.includes('Child'));
      const count = existingChildren.length + 1;
      const ordinal = count === 1 ? '1st Born' : count === 2 ? '2nd Born' : count === 3 ? '3rd Born' : `${count}th+ Born`;
      const childType = isDaughter ? 'Daughter' : 'Son';
      finalRel = `Child (${childType} - ${ordinal})`;
      if (isDaughter) gender = 'Female';
    }

    setPaxList((prev) => [
      ...prev,
      {
        customer_id: undefined, // Unlinked brand new PAX
        is_primary: 0,
        relationship: finalRel,
        fullName: '',
        fatherName: prev[0]?.fullName || '',
        dob: '',
        gender,
        nationality: 'Indian',
        mobile: prev[0]?.mobile || '',
        passportNumber: '',
        issueDate: '',
        expiryDate: '',
        placeOfIssue: prev[0]?.placeOfIssue || 'Mumbai',
        addressLine1: prev[0]?.addressLine1 || '',
        addressLine2: prev[0]?.addressLine2 || '',
        city: prev[0]?.city || '',
        state: prev[0]?.state || 'Maharashtra',
        pinCode: prev[0]?.pinCode || '',
      },
    ]);
    setSaveStatus('unsaved');
    setTimeout(() => {
      paxEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const removePax = (index: number) => {
    if (paxList.length <= 1) return;
    setPaxList((prev) => {
      const remaining = prev.filter((_, i) => i !== index);
      // Ensure at least one primary remains
      if (!remaining.some((p) => p.is_primary)) {
        remaining[0].is_primary = 1;
        remaining[0].relationship = 'Primary';
      }
      return remaining;
    });
    setSaveStatus('unsaved');
  };

  const handleSave = (andClose: boolean = false) => {
    if (!seasonId || !packageId) {
      alert('Please select a Season and Package.');
      return;
    }
    const primaryPax = paxList.find((p) => p.is_primary) || paxList[0];
    if (!primaryPax?.fullName || primaryPax.fullName.trim() === '') {
      alert('Primary Pilgrim Name is required.');
      return;
    }

    setSaveStatus('saving');

    try {
      const payloadPax: PaxInputData[] = paxList.map((p) => ({
        customer_id: p.customer_id,
        fullName: p.fullName || 'Pilgrim',
        full_name: p.fullName || 'Pilgrim',
        fatherName: p.fatherName || '',
        father_name: p.fatherName || '',
        dob: p.dob || '2000-01-01',
        date_of_birth: p.dob || '2000-01-01',
        gender: p.gender || 'Male',
        nationality: p.nationality || 'Indian',
        mobile: p.mobile || '+910000000000',
        mobile_number: p.mobile || '+910000000000',
        passportNumber: p.passportNumber,
        passport_number: p.passportNumber,
        issueDate: p.issueDate,
        issue_date: p.issueDate,
        expiryDate: p.expiryDate,
        expiry_date: p.expiryDate,
        placeOfIssue: p.placeOfIssue,
        place_of_issue: p.placeOfIssue,
        relationship: p.relationship || (p.is_primary ? 'Primary' : 'Relative'),
        is_primary: !!p.is_primary,
        addressLine1: p.addressLine1,
        address_line1: p.addressLine1,
        addressLine2: p.addressLine2,
        address_line2: p.addressLine2,
        city: p.city,
        state: p.state,
        pinCode: p.pinCode,
        pin_code: p.pinCode,
        email: p.email,
      }));

      let savedReg: RegistrationWithDetails;

      if (registrationId) {
        savedReg = updateRegistrationWithPax(registrationId, {
          season_id: seasonId,
          package_id: packageId,
          status: status as any,
          representative,
          tour_name: tourName,
          booking_date: bookingDate,
          airline,
          sector,
          flight_number: flightNumber,
          pnr,
          saudi_agent: saudiAgent,
          departure_date: departureDate,
          arrival_date: arrivalDate,
          room_preference: roomPreference,
          bus_number: busNumber,
          remarks,
          makkah_hotel: makkahHotel,
          madinah_hotel: madinahHotel,
          makkah_checkin: makkahCheckin,
          makkah_checkout: makkahCheckout,
          madinah_checkin: madinahCheckin,
          madinah_checkout: madinahCheckout,
          meal_plan: mealPlan,
          room_type: roomType,
          room_number: roomNumber,
          accommodation_notes: accommodationNotes,
          paxList: payloadPax,
        } as any);
      } else {
        savedReg = createRegistrationWithPax({
          season_id: seasonId,
          package_id: packageId,
          status: status as any,
          representative,
          tour_name: tourName,
          booking_date: bookingDate,
          airline,
          sector,
          flight_number: flightNumber,
          pnr,
          saudi_agent: saudiAgent,
          departure_date: departureDate,
          arrival_date: arrivalDate,
          room_preference: roomPreference,
          bus_number: busNumber,
          remarks,
          makkah_hotel: makkahHotel,
          madinah_hotel: madinahHotel,
          makkah_checkin: makkahCheckin,
          makkah_checkout: makkahCheckout,
          madinah_checkin: madinahCheckin,
          madinah_checkout: madinahCheckout,
          meal_plan: mealPlan,
          room_type: roomType,
          room_number: roomNumber,
          accommodation_notes: accommodationNotes,
          paxList: payloadPax,
        } as any);
      }

      setCurrentReg(savedReg);
      setSaveStatus('saved');
      onSaved(savedReg);

      if (andClose) {
        onClose();
      }
    } catch (err: any) {
      alert('Save Error: ' + (err.message || err));
      setSaveStatus('unsaved');
    }
  };

  const navSections = [
    { id: 'overview', label: 'Overview & Checklist', icon: BarChart3 },
    { id: 'registration', label: 'Season & Package', icon: FileText },
    { id: 'pilgrims', label: `Pilgrims (${paxList.length} PAX)`, icon: Users },
    { id: 'travel', label: 'Flight Itinerary (Two-Way)', icon: Plane },
    { id: 'accommodation', label: 'Hotels & Room Splitting', icon: Building2 },
    { id: 'documents', label: 'Print Booking Form & Invoice', icon: Printer },
  ];

  return (
    <div className="fixed inset-0 z-40 flex flex-col h-screen w-screen bg-[#F7F4EC] text-[#1E1A16] overflow-hidden font-sans">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-16 bg-white border-b border-[#E2D7C3] px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1 text-[#685E52]" />
            Back to Registrations
          </Button>
          <div className="h-5 w-[1px] bg-[#E2D7C3]" />
          <h1 className="font-bold text-base text-[#1E1A16] font-mono tracking-wide flex items-center gap-2">
            <span className="text-[#856936]">{currentReg ? currentReg.registration_number : 'NEW REGISTRATION (DRAFT)'}</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-[#F2ECE0] rounded text-[#685E52] border border-[#E2D7C3] font-sans">
              {paxList.length} Pilgrim(s)
            </span>
          </h1>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${
              saveStatus === 'saved'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : saveStatus === 'saving'
                ? 'bg-amber-50 text-amber-900 border-amber-200 animate-pulse'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved Changes'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} className="text-xs font-bold">
            <Save className="h-3.5 w-3.5 mr-1.5 text-[#685E52]" />
            Save Changes
          </Button>
          <Button variant="default" size="sm" onClick={() => handleSave(true)} className="bg-[#856936] hover:bg-[#6E562B] text-white text-xs font-bold">
            Save & Exit
          </Button>
        </div>
      </header>

      {/* 2. TOP ACTIVE REGISTRATION SUMMARY BANNER */}
      <div className="bg-white border-b border-[#E2D7C3] px-6 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#F5EFE2] border border-[#E2D7C3] flex items-center justify-center text-[#856936] font-mono font-bold text-sm shrink-0">
            #{currentReg ? String(currentReg.registration_id).padStart(3, '0') : 'NEW'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[#1E1A16]">
                {paxList.find((p) => p.is_primary)?.fullName || paxList[0]?.fullName || 'Primary Pilgrim Pending'}
              </p>
              <Badge variant="gold">{seasons.find((s) => s.season_id === seasonId)?.label || 'Hajj 2026'}</Badge>
              <Badge variant="emerald">{packages.find((p) => p.package_id === packageId)?.name || 'Deluxe Package'}</Badge>
            </div>
            <p className="text-xs text-[#685E52] mt-0.5 flex items-center gap-3">
              <span>Main Contact: <strong className="text-[#1E1A16] font-mono">{paxList.find((p) => p.is_primary)?.mobile || paxList[0]?.mobile || '-'}</strong></span>
              <span>•</span>
              <span>Passport: <strong className="text-[#1E1A16] font-mono">{paxList.find((p) => p.is_primary)?.passportNumber || paxList[0]?.passportNumber || 'No Passport'}</strong></span>
              <span>•</span>
              <span>Linked Pilgrims: <strong className="text-[#856936]">{paxList.length} PAX</strong></span>
            </p>
          </div>
        </div>

        {/* Clean Line Icon Completeness Checklist Summary */}
        <div className="flex items-center gap-3 text-xs bg-[#F7F4EC] px-3.5 py-2 rounded-xl border border-[#E2D7C3]">
          <span className="font-bold text-[#1E1A16]">Checklist:</span>
          <span className={`flex items-center gap-1 ${paxList[0]?.passportNumber ? 'text-emerald-800 font-semibold' : 'text-[#8A7C6B]'}`}>
            {paxList[0]?.passportNumber ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <Clock className="h-3.5 w-3.5 text-[#8A7C6B]" />} Passport
          </span>
          <span className={`flex items-center gap-1 ${pnr ? 'text-emerald-800 font-semibold' : 'text-[#8A7C6B]'}`}>
            {pnr ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <Clock className="h-3.5 w-3.5 text-[#8A7C6B]" />} Flight PNR
          </span>
          <span className={`flex items-center gap-1 ${makkahHotel ? 'text-emerald-800 font-semibold' : 'text-[#8A7C6B]'}`}>
            {makkahHotel ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <Clock className="h-3.5 w-3.5 text-[#8A7C6B]" />} Makkah Hotel
          </span>
          <span className={`flex items-center gap-1 ${(currentReg?.totalPaid || 0) > 0 ? 'text-emerald-800 font-semibold' : 'text-amber-900 font-semibold'}`}>
            <CreditCard className="h-3.5 w-3.5" /> {(currentReg?.totalPaid || 0) > 0 ? 'Paid' : 'Payment Due'}
          </span>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT NAV RAIL */}
        <aside className="w-64 bg-[#F3ECE0] border-r border-[#E2D7C3] flex flex-col p-3 gap-1 overflow-y-auto">
          <p className="text-[10px] font-extrabold text-[#8A7C6B] uppercase tracking-wider px-3 py-2">Workspace Sections</p>
          {navSections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#E5DAC6] text-[#1E1A16] border-l-3 border-[#856936] shadow-2xs'
                    : 'text-[#4A4238] hover:bg-[#EAE1D2] hover:text-[#1E1A16]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? 'text-[#856936]' : 'text-[#7C7060]'}`} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </aside>

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F7F4EC] space-y-6">
          {/* SECTION: OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="bg-white border border-[#E2D7C3] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-[#F2ECE0] pb-3">
                <h2 className="text-sm font-bold text-[#1E1A16] flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#856936]" /> Booking Completion Status
                </h2>
                <span className="text-xl font-bold text-[#856936] font-mono">
                  {currentReg ? `${currentReg.progressPercent}%` : '0%'}
                </span>
              </div>

              <div className="w-full bg-[#F2ECE0] h-2.5 rounded-full overflow-hidden border border-[#E2D7C3]">
                <div
                  className="bg-[#856936] h-full transition-all duration-500"
                  style={{ width: `${currentReg ? currentReg.progressPercent : 0}%` }}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
                <div className="p-3 bg-[#F7F4EC] border border-[#E2D7C3] rounded-lg flex items-center gap-2">
                  {currentReg?.progressBreakdown.customerLinked ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <Clock className="h-4 w-4 text-[#8A7C6B]" />}
                  <span className="text-[#1E1A16] font-semibold">Primary Pax Linked</span>
                </div>
                <div className="p-3 bg-[#F7F4EC] border border-[#E2D7C3] rounded-lg flex items-center gap-2">
                  {currentReg?.progressBreakdown.passportsUploaded ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <Clock className="h-4 w-4 text-[#8A7C6B]" />}
                  <span className="text-[#1E1A16] font-semibold">Passport Details Recorded</span>
                </div>
                <div className="p-3 bg-[#F7F4EC] border border-[#E2D7C3] rounded-lg flex items-center gap-2">
                  {currentReg?.progressBreakdown.visasApproved ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <Clock className="h-4 w-4 text-[#8A7C6B]" />}
                  <span className="text-[#1E1A16] font-semibold">Visa Approved</span>
                </div>
                <div className="p-3 bg-[#F7F4EC] border border-[#E2D7C3] rounded-lg flex items-center gap-2">
                  {currentReg?.progressBreakdown.paymentsCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <Clock className="h-4 w-4 text-[#8A7C6B]" />}
                  <span className="text-[#1E1A16] font-semibold">Payment Billed & Received</span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: SEASON & PACKAGE */}
          {(activeSection === 'registration' || activeSection === 'overview') && (
            <div className="bg-white border border-[#E2D7C3] rounded-xl p-6 space-y-4 shadow-2xs">
              <h2 className="text-sm font-bold text-[#1E1A16] border-b border-[#F2ECE0] pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#856936]" /> Season & Package Configuration
                </span>
                <HelpTooltip text="Select the operational season and package tier for this family booking." />
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E1A16] mb-1">Operational Season *</label>
                  <select
                    value={seasonId}
                    onChange={(e) => handleSeasonChange(Number(e.target.value))}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-semibold text-[#1E1A16] focus:outline-none focus:ring-2 focus:ring-[#856936]/30"
                  >
                    {seasons.map((s) => (
                      <option key={s.season_id} value={s.season_id}>
                        {s.label} ({s.year})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E1A16] mb-1">Package Tier *</label>
                  <select
                    value={packageId}
                    onChange={(e) => {
                      setPackageId(Number(e.target.value));
                      setSaveStatus('unsaved');
                    }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-semibold text-[#1E1A16] focus:outline-none focus:ring-2 focus:ring-[#856936]/30"
                  >
                    {packages.map((p) => (
                      <option key={p.package_id} value={p.package_id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E1A16] mb-1">Booking Status *</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setSaveStatus('unsaved');
                    }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-bold text-[#1E1A16] focus:outline-none focus:ring-2 focus:ring-[#856936]/30"
                  >
                    {REGISTRATION_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: PILGRIMS MANAGER WITH EXCLUSION-FILTERED CUSTOMER SELECTOR */}
          {(activeSection === 'pilgrims' || activeSection === 'overview') && (
            <div className="bg-white border border-[#E2D7C3] rounded-xl p-6 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between border-b border-[#F2ECE0] pb-3 gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#1E1A16] flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#856936]" /> Pilgrim Group Members ({paxList.length} PAX)
                  </h2>
                  <p className="text-xs text-[#685E52] mt-0.5">
                    Select existing customer profiles from directory (already chosen pilgrims are automatically filtered out) or record new profiles inline.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => addPax('Spouse (Wife)', 'Female')} className="text-xs">
                    + Spouse (Wife)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addPax('Child (Son - 1st Born)', 'Male')} className="text-xs">
                    + Son (Child)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addPax('Child (Daughter - 1st Born)', 'Female')} className="text-xs">
                    + Daughter (Child)
                  </Button>
                  <Button size="sm" variant="default" onClick={() => addPax('Relative', 'Male')} className="bg-[#856936] hover:bg-[#6E562B] text-white text-xs font-bold">
                    + Add Relative
                  </Button>
                </div>
              </div>

              {paxList.map((pax, idx) => {
                // EXCLUSION FILTER: Collect all customer_ids selected on OTHER pax cards
                const selectedCustIdsOnOtherCards = paxList
                  .filter((_, otherIdx) => otherIdx !== idx)
                  .map((p) => p.customer_id)
                  .filter(Boolean);

                // Filter available customers so already selected pilgrims don't appear in this dropdown
                const availableCustomersForThisCard = customers.filter(
                  (c) => !selectedCustIdsOnOtherCards.includes(c.customer_id)
                );

                return (
                  <div key={idx} className="bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-4 space-y-4 shadow-2xs">
                    {/* PAX Header & Customer Selector Picker */}
                    <div className="flex flex-wrap items-center justify-between border-b border-[#E2D7C3] pb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#F5EFE2] text-[#856936] px-2.5 py-0.5 rounded text-xs font-mono font-bold border border-[#E2D7C3]">
                          PAX #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-[#1E1A16]">
                          {pax.is_primary ? 'PRIMARY PILGRIM (HEAD OF BOOKING)' : pax.relationship}
                        </span>
                        {pax.is_primary ? (
                          <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Primary Contact
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryPax(idx)}
                            className="text-[10px] text-[#856936] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Star className="h-3 w-3 text-[#856936]" /> Make Primary
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Customer Directory Filtered Dropdown Picker */}
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#E2D7C3] shadow-2xs">
                          <UserCheck className="h-3.5 w-3.5 text-[#856936]" />
                          <select
                            value={pax.customer_id || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleSelectCustomerForPax(idx, Number(e.target.value));
                              }
                            }}
                            className="text-xs font-bold text-[#1E1A16] bg-transparent border-none focus:outline-none cursor-pointer max-w-[240px]"
                          >
                            <option value="">-- Select Saved Customer --</option>
                            {availableCustomersForThisCard.map((c) => (
                              <option key={c.customer_id} value={c.customer_id}>
                                {c.full_name} ({c.currentPassport || 'No Passport'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {!pax.is_primary && (
                          <button
                            type="button"
                            onClick={() => removePax(idx)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer p-1"
                            title="Remove PAX"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* PAX Identity Details Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-[#1E1A16] mb-1">Pilgrim Full Name (As on Passport) *</label>
                        <input
                          type="text"
                          placeholder="e.g. Mohammed Javeed Khan"
                          value={pax.fullName || ''}
                          onChange={(e) => handlePaxChange(idx, 'fullName', e.target.value)}
                          className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-1.5 text-xs text-[#1E1A16] font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#1E1A16] mb-1">Father / Husband Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Ahmed Khan"
                          value={pax.fatherName || ''}
                          onChange={(e) => handlePaxChange(idx, 'fatherName', e.target.value)}
                          className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-1.5 text-xs text-[#1E1A16]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#1E1A16] mb-1">Relationship to Group</label>
                        <input
                          type="text"
                          placeholder="e.g. Spouse, Son, Daughter, Brother"
                          value={pax.relationship || ''}
                          onChange={(e) => handlePaxChange(idx, 'relationship', e.target.value)}
                          className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-1.5 text-xs text-[#1E1A16]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#1E1A16] mb-1">Passport Number</label>
                        <input
                          type="text"
                          placeholder="e.g. Z1234567"
                          value={pax.passportNumber || ''}
                          onChange={(e) => handlePaxChange(idx, 'passportNumber', e.target.value.toUpperCase())}
                          className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-1.5 text-xs text-[#1E1A16] font-mono font-bold uppercase tracking-wider"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#1E1A16] mb-1">Passport Expiry Date</label>
                        <input
                          type="date"
                          value={pax.expiryDate || ''}
                          onChange={(e) => handlePaxChange(idx, 'expiryDate', e.target.value)}
                          className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-1.5 text-xs text-[#1E1A16] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#1E1A16] mb-1">Mobile Contact</label>
                        <input
                          type="text"
                          placeholder="e.g. +91 98200 12345"
                          value={pax.mobile || ''}
                          onChange={(e) => handlePaxChange(idx, 'mobile', e.target.value)}
                          className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-1.5 text-xs text-[#1E1A16] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={paxEndRef} />
            </div>
          )}

          {/* SECTION: FLIGHT ITINERARY (TWO-WAY) */}
          {(activeSection === 'travel' || activeSection === 'overview') && (
            <div className="bg-white border border-[#E2D7C3] rounded-xl p-6 space-y-4 shadow-2xs">
              <h2 className="text-sm font-bold text-[#1E1A16] border-b border-[#F2ECE0] pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-[#856936]" /> Flight Itinerary & PNR Details
                </span>
                <HelpTooltip text="Enter airline name, flight number, passenger PNR, sector, and travel dates." />
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#1E1A16] mb-1">Airline Carrier</label>
                  <select
                    value={airline}
                    onChange={(e) => { setAirline(e.target.value); setSaveStatus('unsaved'); }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-semibold text-[#1E1A16]"
                  >
                    <option value="">-- Select Airline --</option>
                    <option value="Saudia Airlines">Saudia Airlines</option>
                    <option value="Air India Express">Air India Express</option>
                    <option value="Flynas">Flynas</option>
                    <option value="SpiceJet">SpiceJet</option>
                    <option value="Oman Air">Oman Air</option>
                    <option value="Emirates">Emirates</option>
                    <option value="Gulf Air">Gulf Air</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1E1A16] mb-1">Flight Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SV-741"
                    value={flightNumber}
                    onChange={(e) => { setFlightNumber(e.target.value); setSaveStatus('unsaved'); }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-semibold text-[#1E1A16]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1E1A16] mb-1">Passenger PNR Code</label>
                  <input
                    type="text"
                    placeholder="e.g. PNR-998811"
                    value={pnr}
                    onChange={(e) => { setPnr(e.target.value.toUpperCase()); setSaveStatus('unsaved'); }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#856936] uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1E1A16] mb-1">Departure Airport / Sector</label>
                  <input
                    type="text"
                    placeholder="e.g. BOM (Mumbai)"
                    value={sector}
                    onChange={(e) => { setSector(e.target.value); setSaveStatus('unsaved'); }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-semibold text-[#1E1A16]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1E1A16] mb-1">Departure Date</label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => { setDepartureDate(e.target.value); setSaveStatus('unsaved'); }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1E1A16] mb-1">Return / Arrival Date</label>
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => { setArrivalDate(e.target.value); setSaveStatus('unsaved'); }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION: HOTELS & ROOM SPLITTING */}
          {(activeSection === 'accommodation' || activeSection === 'overview') && (
            <div className="bg-white border border-[#E2D7C3] rounded-xl p-6 space-y-4 shadow-2xs">
              <h2 className="text-sm font-bold text-[#1E1A16] border-b border-[#F2ECE0] pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#856936]" /> Hotel Accommodations & Room Allocations
                </span>
                <Badge variant="gold">
                  {paxList.length === 1 ? '1 Single/Sharing Room' : paxList.length <= 4 ? `1 ${roomType} Room` : `Auto-Split: ${Math.ceil(paxList.length / 4)} Rooms Suggested`}
                </Badge>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Makkah Hotel */}
                <div className="p-4 bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl space-y-3">
                  <h4 className="font-bold text-[#1E1A16] flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-[#856936]" /> Makkah Hotel & Check-in
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-[#685E52] mb-1">Makkah Hotel Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Pullman Zamzam Makkah"
                      value={makkahHotel}
                      onChange={(e) => { setMakkahHotel(e.target.value); setSaveStatus('unsaved'); }}
                      className="w-full bg-white border border-[#E2D7C3] rounded-lg p-2 font-semibold text-[#1E1A16]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#685E52] mb-1">Check-in Date</label>
                      <input
                        type="date"
                        value={makkahCheckin}
                        onChange={(e) => { setMakkahCheckin(e.target.value); setSaveStatus('unsaved'); }}
                        className="w-full bg-white border border-[#E2D7C3] rounded-lg p-1.5 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#685E52] mb-1">Check-out Date</label>
                      <input
                        type="date"
                        value={makkahCheckout}
                        onChange={(e) => { setMakkahCheckout(e.target.value); setSaveStatus('unsaved'); }}
                        className="w-full bg-white border border-[#E2D7C3] rounded-lg p-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Madinah Hotel */}
                <div className="p-4 bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl space-y-3">
                  <h4 className="font-bold text-[#1E1A16] flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-[#856936]" /> Madinah Hotel & Check-in
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-[#685E52] mb-1">Madinah Hotel Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Anwar Al Madinah Movenpick"
                      value={madinahHotel}
                      onChange={(e) => { setMadinahHotel(e.target.value); setSaveStatus('unsaved'); }}
                      className="w-full bg-white border border-[#E2D7C3] rounded-lg p-2 font-semibold text-[#1E1A16]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#685E52] mb-1">Check-in Date</label>
                      <input
                        type="date"
                        value={madinahCheckin}
                        onChange={(e) => { setMadinahCheckin(e.target.value); setSaveStatus('unsaved'); }}
                        className="w-full bg-white border border-[#E2D7C3] rounded-lg p-1.5 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#685E52] mb-1">Check-out Date</label>
                      <input
                        type="date"
                        value={madinahCheckout}
                        onChange={(e) => { setMadinahCheckout(e.target.value); setSaveStatus('unsaved'); }}
                        className="w-full bg-white border border-[#E2D7C3] rounded-lg p-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                <div>
                  <label className="block font-bold text-[#1E1A16] mb-1">Room Type / Sharing</label>
                  <select
                    value={roomType}
                    onChange={(e) => { setRoomType(e.target.value); setSaveStatus('unsaved'); }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-semibold text-[#1E1A16]"
                  >
                    <option value="2 Sharing (Double)">2 Sharing (Double Room)</option>
                    <option value="3 Sharing (Triple)">3 Sharing (Triple Room)</option>
                    <option value="4 Sharing (Quad)">4 Sharing (Quad Room)</option>
                    <option value="Sharing (Quint/Hexa)">Sharing (Quint / Family Room)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1E1A16] mb-1">Room Number(s)</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 402, Room 403"
                    value={roomNumber}
                    onChange={(e) => { setRoomNumber(e.target.value); setSaveStatus('unsaved'); }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-semibold text-[#1E1A16]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1E1A16] mb-1">Meal Plan Package</label>
                  <select
                    value={mealPlan}
                    onChange={(e) => { setMealPlan(e.target.value); setSaveStatus('unsaved'); }}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg px-3 py-2 text-xs font-semibold text-[#1E1A16]"
                  >
                    <option value="Full Board (Breakfast, Lunch, Dinner)">Full Board (Breakfast, Lunch, Dinner)</option>
                    <option value="Half Board (Breakfast & Dinner)">Half Board (Breakfast & Dinner)</option>
                    <option value="Breakfast Only">Breakfast Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: PRINT DOCUMENTS */}
          {(activeSection === 'documents' || activeSection === 'overview') && (
            <div className="bg-white border border-[#E2D7C3] rounded-xl p-6 space-y-4 shadow-2xs">
              <h2 className="text-sm font-bold text-[#1E1A16] border-b border-[#F2ECE0] pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-[#856936]" /> Document Print Engine (A4 Booking Forms & Tax Invoices)
                </span>
                <HelpTooltip text="Generate official office booking forms and tax invoices for pilgrims." />
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl space-y-3">
                  <div className="font-bold text-[#1E1A16] text-xs flex items-center justify-between">
                    <span>📝 Booking Form Document</span>
                    <Badge variant="gold">A4 Printable</Badge>
                  </div>
                  <p className="text-[11px] text-[#685E52] leading-relaxed">
                    Generates official A4 booking form combining pilgrim details and itinerary.
                  </p>
                  <Button
                    onClick={() => {
                      if (!currentReg) {
                        handleSave(false);
                      }
                      setTimeout(() => {
                        const targetId = currentReg ? currentReg.registration_id : 1;
                        const html = generateBookingFormDocument(targetId, 'combined');
                        printDocumentHtml(html);
                      }, 200);
                    }}
                    className="w-full bg-[#856936] hover:bg-[#6E562B] text-white text-xs font-bold"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Print Combined Booking Form ({paxList.length} PAX)
                  </Button>
                </div>

                <div className="p-4 bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl space-y-3">
                  <div className="font-bold text-[#1E1A16] text-xs flex items-center justify-between">
                    <span>🧾 GST Tax Invoice Document</span>
                    <Badge variant="gold">Tax Invoice</Badge>
                  </div>
                  <p className="text-[11px] text-[#685E52] leading-relaxed">
                    Generates official GST tax invoice with charges and payment breakdown.
                  </p>
                  <Button
                    onClick={() => {
                      if (!currentReg) {
                        handleSave(false);
                      }
                      setTimeout(() => {
                        const targetId = currentReg ? currentReg.registration_id : 1;
                        const html = generateInvoiceDocument(targetId, 'combined');
                        printDocumentHtml(html);
                      }, 200);
                    }}
                    className="w-full bg-[#856936] hover:bg-[#6E562B] text-white text-xs font-bold"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Print GST Tax Invoice
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* STICKY RIGHT SUMMARY PANEL */}
        <aside className="w-80 bg-white border-l border-[#E2D7C3] p-5 space-y-5 overflow-y-auto hidden lg:block sticky top-0 h-screen shadow-2xs">
          <div className="border-b border-[#F2ECE0] pb-3">
            <p className="text-[10px] font-bold text-[#8A7C6B] uppercase tracking-wider">Registration Number</p>
            <p className="text-lg font-black text-[#856936] font-mono mt-0.5">
              {currentReg ? currentReg.registration_number : 'DH-H26-NEW'}
            </p>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#685E52]">Season:</span>
              <span className="font-semibold text-[#1E1A16]">
                {seasons.find((s) => s.season_id === seasonId)?.label || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#685E52]">Package:</span>
              <span className="font-semibold text-[#1E1A16]">
                {packages.find((p) => p.package_id === packageId)?.name || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#685E52]">Main Pilgrim:</span>
              <span className="font-bold text-[#1E1A16]">
                {paxList.find((p) => p.is_primary)?.fullName || paxList[0]?.fullName || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#685E52]">PAX Count:</span>
              <span className="font-bold text-[#856936] font-mono">{paxList.length} Person(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#685E52]">Booking Status:</span>
              <Badge variant="gold">{status}</Badge>
            </div>
          </div>

          <div className="p-4 bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl space-y-2">
            <p className="text-[10px] font-bold text-[#8A7C6B] uppercase tracking-wider">Financial Overview</p>
            <div className="flex justify-between text-xs">
              <span className="text-[#685E52]">Net Total:</span>
              <span className="font-mono font-bold text-[#1E1A16]">₹{currentReg?.netTotal.toLocaleString('en-IN') || '0'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#685E52]">Collected:</span>
              <span className="font-mono font-bold text-emerald-800">₹{currentReg?.totalPaid.toLocaleString('en-IN') || '0'}</span>
            </div>
            <div className="flex justify-between text-xs font-bold pt-2 border-t border-[#E2D7C3]">
              <span className="text-[#1E1A16]">
                {currentReg && currentReg.balanceAmount < 0 ? 'Credit Balance:' : 'Balance Due:'}
              </span>
              <span className={`font-mono font-black ${currentReg && currentReg.balanceAmount < 0 ? 'text-emerald-800' : 'text-[#856936]'}`}>
                ₹{currentReg ? Math.abs(currentReg.balanceAmount).toLocaleString('en-IN') : '0'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
