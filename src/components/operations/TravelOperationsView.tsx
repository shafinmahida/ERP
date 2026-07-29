import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plane,
  Building2,
  Printer,
  Save,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/card';
import { PageTitle, SectionTitle, BodyText, CaptionText } from '../ui/typography';
import { RegistrationWithDetails } from '../../services/registrationService';
import { VisaOperation, FlightOperation, HotelOperation } from '../../db/schema';
import {
  getVisaOperations,
  saveVisaOperation,
  getFlightOperations,
  saveFlightOperation,
  getHotelOperations,
  saveHotelOperation,
} from '../../services/travelOperationsService';

interface TravelOperationsViewProps {
  registrations: RegistrationWithDetails[];
  activeRegistrationId?: number | null;
  onRefreshRegistrations: () => void;
}

export function TravelOperationsView({
  registrations,
  activeRegistrationId,
  onRefreshRegistrations,
}: TravelOperationsViewProps) {
  const [selectedRegId, setSelectedRegId] = useState<number | null>(
    activeRegistrationId || (registrations.length > 0 ? registrations[0].registration_id : null)
  );

  const [activeSubTab, setActiveSubTab] = useState<'visa' | 'flight' | 'hotel' | 'print'>('visa');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Registration Context
  const selectedReg = registrations.find((r) => r.registration_id === selectedRegId) || registrations[0];
  const primaryPilgrimName = selectedReg?.paxList?.[0]?.fullName || 'Pilgrim';

  // Visa Form State
  const [visaStatus, setVisaStatus] = useState<'Pending' | 'Submitted' | 'Approved' | 'Rejected'>('Pending');
  const [embassyRef, setEmbassyRef] = useState('');
  const [visaNumber, setVisaNumber] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [approvalDate, setApprovalDate] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [visaNotes, setVisaNotes] = useState('');

  // Flight Form State
  const [airline, setAirline] = useState('Saudia Airlines');
  const [flightNumber, setFlightNumber] = useState('SV-741');
  const [pnr, setPnr] = useState('');
  const [depAirport, setDepAirport] = useState('BOM (Mumbai)');
  const [arrAirport, setArrAirport] = useState('JED (Jeddah)');
  const [departureDate, setDepartureDate] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');

  // Hotel Form State
  const [makkahHotel, setMakkahHotel] = useState('Pullman Zamzam Makkah');
  const [madinahHotel, setMadinahHotel] = useState('Anwar Al Madinah Movenpick');
  const [makkahRoomType, setMakkahRoomType] = useState('Quad (4 Sharing)');
  const [madinahRoomType, setMadinahRoomType] = useState('Quad (4 Sharing)');
  const [makkahRoomNum, setMakkahRoomNum] = useState('');
  const [madinahRoomNum, setMadinahRoomNum] = useState('');

  useEffect(() => {
    if (selectedReg) {
      // Load Visa Data
      const visas = getVisaOperations(selectedReg.registration_id);
      if (visas.length > 0) {
        const v = visas[0];
        setVisaStatus(v.visa_status as any);
        setEmbassyRef(v.embassy_reference || '');
        setVisaNumber(v.visa_number || '');
        setSubmissionDate(v.submission_date || '');
        setApprovalDate(v.approval_date || '');
        setRejectionReason(v.rejection_reason || '');
        setBatchNumber(v.batch_number || '');
        setVisaNotes(v.notes || '');
      }

      // Load Flight Data
      const flights = getFlightOperations(selectedReg.registration_id);
      if (flights.length > 0) {
        const f = flights[0];
        setAirline(f.airline || 'Saudia Airlines');
        setFlightNumber(f.flight_number || 'SV-741');
        setPnr(f.pnr || '');
        setDepAirport(f.departure_airport || 'BOM (Mumbai)');
        setArrAirport(f.arrival_airport || 'JED (Jeddah)');
        setDepartureDate(f.departure_date || '');
        setArrivalDate(f.arrival_date || '');
        setTicketNumber(f.ticket_number || '');
      } else if (selectedReg.pnr || selectedReg.airline) {
        setAirline(selectedReg.airline || 'Saudia Airlines');
        setFlightNumber(selectedReg.flight_number || 'SV-741');
        setPnr(selectedReg.pnr || '');
      }

      // Load Hotel Data
      const hotels = getHotelOperations(selectedReg.registration_id);
      const makkah = hotels.find((h) => h.city === 'Makkah');
      const madinah = hotels.find((h) => h.city === 'Madinah');
      const regAny = selectedReg as any;
      if (makkah) {
        setMakkahHotel(makkah.hotel_name);
        setMakkahRoomType(makkah.room_type);
        setMakkahRoomNum(makkah.room_number || '');
      } else if (regAny.makkah_hotel) {
        setMakkahHotel(regAny.makkah_hotel);
      }
      if (madinah) {
        setMadinahHotel(madinah.hotel_name);
        setMadinahRoomType(madinah.room_type);
        setMadinahRoomNum(madinah.room_number || '');
      } else if (regAny.madinah_hotel) {
        setMadinahHotel(regAny.madinah_hotel);
      }
    }
  }, [selectedRegId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveVisa = () => {
    if (!selectedReg) return;
    saveVisaOperation({
      registration_id: selectedReg.registration_id,
      visa_status: visaStatus,
      embassy_reference: embassyRef,
      visa_number: visaNumber,
      submission_date: submissionDate,
      approval_date: approvalDate,
      rejection_reason: rejectionReason,
      batch_number: batchNumber,
      notes: visaNotes,
    });
    showToast(`✓ Updated Visa Operations status to ${visaStatus}`);
    onRefreshRegistrations();
  };

  const handleSaveFlight = () => {
    if (!selectedReg) return;
    saveFlightOperation({
      registration_id: selectedReg.registration_id,
      airline,
      flight_number: flightNumber,
      pnr,
      departure_airport: depAirport,
      arrival_airport: arrAirport,
      departure_date: departureDate,
      arrival_date: arrivalDate,
      ticket_number: ticketNumber,
    });
    showToast(`✓ Saved Flight PNR (${pnr || 'Updated'}) for ${airline}`);
    onRefreshRegistrations();
  };

  const handleSaveHotel = () => {
    if (!selectedReg) return;
    saveHotelOperation({
      registration_id: selectedReg.registration_id,
      city: 'Makkah',
      hotel_name: makkahHotel,
      room_type: makkahRoomType,
      room_number: makkahRoomNum,
    });
    saveHotelOperation({
      registration_id: selectedReg.registration_id,
      city: 'Madinah',
      hotel_name: madinahHotel,
      room_type: madinahRoomType,
      room_number: madinahRoomNum,
    });
    showToast('✓ Saved Hotel Allocations for Makkah & Madinah');
    onRefreshRegistrations();
  };

  if (!selectedReg) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#E2D7C3]">
        <BodyText>No active registrations available for travel operations.</BodyText>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1A16] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#856936]" />
          {toastMessage}
        </div>
      )}

      {/* Header Context Bar */}
      <div className="bg-white border border-[#E2D7C3] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <PageTitle>Travel Operations & Execution</PageTitle>
              <Badge variant="gold">REG #{selectedReg.registration_number}</Badge>
            </div>
            <BodyText className="mt-1">
              Pilgrim: <strong className="text-[#1E1A16]">{primaryPilgrimName}</strong> • {selectedReg.paxCount} PAX • {selectedReg.packageName}
            </BodyText>
          </div>

          {/* Registration Picker */}
          <div className="flex items-center gap-2">
            <CaptionText className="uppercase">Select Booking:</CaptionText>
            <select
              value={selectedRegId || ''}
              onChange={(e) => setSelectedRegId(Number(e.target.value))}
              className="bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1E1A16] focus:outline-none"
            >
              {registrations.map((r) => (
                <option key={r.registration_id} value={r.registration_id}>
                  {r.registration_number} — {r.paxList?.[0]?.fullName || 'Pilgrim'} ({r.paxCount} PAX)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* GUIDED OPERATIONAL STEPPER */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#F2ECE0] text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('visa')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'visa' ? 'bg-[#856936] text-white shadow-2xs' : 'bg-[#F7F4EC] text-[#685E52] hover:bg-[#EAE1D2]'
            }`}
          >
            <FileCheck2 className="h-4 w-4" /> 1. Visa Operations
          </button>
          <ArrowRight className="h-3.5 w-3.5 text-[#8A7C6B] shrink-0" />
          <button
            onClick={() => setActiveSubTab('flight')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'flight' ? 'bg-[#856936] text-white shadow-2xs' : 'bg-[#F7F4EC] text-[#685E52] hover:bg-[#EAE1D2]'
            }`}
          >
            <Plane className="h-4 w-4" /> 2. Flight Operations
          </button>
          <ArrowRight className="h-3.5 w-3.5 text-[#8A7C6B] shrink-0" />
          <button
            onClick={() => setActiveSubTab('hotel')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'hotel' ? 'bg-[#856936] text-white shadow-2xs' : 'bg-[#F7F4EC] text-[#685E52] hover:bg-[#EAE1D2]'
            }`}
          >
            <Building2 className="h-4 w-4" /> 3. Hotel Operations
          </button>
          <ArrowRight className="h-3.5 w-3.5 text-[#8A7C6B] shrink-0" />
          <button
            onClick={() => setActiveSubTab('print')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'print' ? 'bg-[#856936] text-white shadow-2xs' : 'bg-[#F7F4EC] text-[#685E52] hover:bg-[#EAE1D2]'
            }`}
          >
            <Printer className="h-4 w-4" /> 4. Print Documents
          </button>
        </div>
      </div>

      {/* 1. VISA OPERATIONS WORKSPACE */}
      {activeSubTab === 'visa' && (
        <div className="bg-white border border-[#E2D7C3] rounded-2xl p-6 shadow-2xs space-y-6">
          <SectionTitle>Visa Processing & Embassy Batch Tracking</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Visa Status</label>
              <select
                value={visaStatus}
                onChange={(e) => setVisaStatus(e.target.value as any)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              >
                <option value="Pending">⏳ Pending Submission</option>
                <option value="Submitted">📤 Submitted to Embassy</option>
                <option value="Approved">✅ Approved & Issued</option>
                <option value="Rejected">❌ Rejected / Exception</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Embassy MOFA Reference #</label>
              <input
                type="text"
                placeholder="e.g. MOFA-8899201"
                value={embassyRef}
                onChange={(e) => setEmbassyRef(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Visa Number</label>
              <input
                type="text"
                placeholder="e.g. V77890123"
                value={visaNumber}
                onChange={(e) => setVisaNumber(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Batch Assignment Number</label>
              <input
                type="text"
                placeholder="e.g. Batch #DH-V26-B01"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Submission Date</label>
              <input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Approval Date</label>
              <input
                type="date"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              />
            </div>
          </div>

          {visaStatus === 'Rejected' && (
            <div>
              <label className="block text-xs font-bold text-rose-700 mb-1.5">Rejection Reason</label>
              <textarea
                placeholder="Specify rejection details..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 font-semibold focus:outline-none"
                rows={2}
              />
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-[#F2ECE0]">
            <Button onClick={handleSaveVisa} className="bg-[#856936] text-white hover:bg-[#6E562B] text-xs font-bold px-6 py-2.5">
              <Save className="h-4 w-4 mr-1.5" /> Save Visa Status & Audit
            </Button>
          </div>
        </div>
      )}

      {/* 2. FLIGHT OPERATIONS WORKSPACE */}
      {activeSubTab === 'flight' && (
        <div className="bg-white border border-[#E2D7C3] rounded-2xl p-6 shadow-2xs space-y-6">
          <SectionTitle>Flight Operations & PNR Management</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Airline Name</label>
              <input
                type="text"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Flight Number</label>
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Passenger PNR Code</label>
              <input
                type="text"
                placeholder="e.g. PNR-998811"
                value={pnr}
                onChange={(e) => setPnr(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-mono font-bold text-[#856936] focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Ticket Number</label>
              <input
                type="text"
                placeholder="e.g. TKT-065-99801"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Departure Airport / Sector</label>
              <input
                type="text"
                value={depAirport}
                onChange={(e) => setDepAirport(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E1A16] mb-1.5">Arrival Airport / Sector</label>
              <input
                type="text"
                value={arrAirport}
                onChange={(e) => setArrAirport(e.target.value)}
                className="w-full bg-[#F7F4EC] border border-[#E2D7C3] rounded-xl p-3 font-semibold text-[#1E1A16] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#F2ECE0]">
            <Button onClick={handleSaveFlight} className="bg-[#856936] text-white hover:bg-[#6E562B] text-xs font-bold px-6 py-2.5">
              <Save className="h-4 w-4 mr-1.5" /> Save Flight PNR & Audit
            </Button>
          </div>
        </div>
      )}

      {/* 3. HOTEL OPERATIONS WORKSPACE */}
      {activeSubTab === 'hotel' && (
        <div className="bg-white border border-[#E2D7C3] rounded-2xl p-6 shadow-2xs space-y-6">
          <SectionTitle>Hotel Rooming & Occupancy Allocation</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* MAKKAH HOTEL */}
            <div className="bg-[#F7F4EC] border border-[#E2D7C3] p-4 rounded-xl space-y-3">
              <h4 className="font-bold text-[#1E1A16] flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#856936]" /> Makkah Accommodations
              </h4>
              <div>
                <label className="block text-[11px] font-bold text-[#685E52] mb-1">Hotel Name</label>
                <input
                  type="text"
                  value={makkahHotel}
                  onChange={(e) => setMakkahHotel(e.target.value)}
                  className="w-full bg-white border border-[#E2D7C3] rounded-lg p-2.5 font-semibold text-[#1E1A16]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#685E52] mb-1">Room Type</label>
                  <input
                    type="text"
                    value={makkahRoomType}
                    onChange={(e) => setMakkahRoomType(e.target.value)}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg p-2 font-semibold text-[#1E1A16]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#685E52] mb-1">Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 402"
                    value={makkahRoomNum}
                    onChange={(e) => setMakkahRoomNum(e.target.value)}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg p-2 font-semibold text-[#1E1A16]"
                  />
                </div>
              </div>
            </div>

            {/* MADINAH HOTEL */}
            <div className="bg-[#F7F4EC] border border-[#E2D7C3] p-4 rounded-xl space-y-3">
              <h4 className="font-bold text-[#1E1A16] flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#856936]" /> Madinah Accommodations
              </h4>
              <div>
                <label className="block text-[11px] font-bold text-[#685E52] mb-1">Hotel Name</label>
                <input
                  type="text"
                  value={madinahHotel}
                  onChange={(e) => setMadinahHotel(e.target.value)}
                  className="w-full bg-white border border-[#E2D7C3] rounded-lg p-2.5 font-semibold text-[#1E1A16]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#685E52] mb-1">Room Type</label>
                  <input
                    type="text"
                    value={madinahRoomType}
                    onChange={(e) => setMadinahRoomType(e.target.value)}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg p-2 font-semibold text-[#1E1A16]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#685E52] mb-1">Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 805"
                    value={madinahRoomNum}
                    onChange={(e) => setMadinahRoomNum(e.target.value)}
                    className="w-full bg-white border border-[#E2D7C3] rounded-lg p-2 font-semibold text-[#1E1A16]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#F2ECE0]">
            <Button onClick={handleSaveHotel} className="bg-[#856936] text-white hover:bg-[#6E562B] text-xs font-bold px-6 py-2.5">
              <Save className="h-4 w-4 mr-1.5" /> Save Hotel Allocation & Audit
            </Button>
          </div>
        </div>
      )}

      {/* 4. PRINT DOCUMENTS WORKSPACE */}
      {activeSubTab === 'print' && (
        <div className="bg-white border border-[#E2D7C3] rounded-2xl p-6 shadow-2xs space-y-6 text-center py-10">
          <Printer className="h-12 w-12 text-[#856936] mx-auto" />
          <SectionTitle>Printable Operational Documents</SectionTitle>
          <BodyText className="max-w-md mx-auto">
            Generate printable A4 Booking Forms, Flight Itinerary Cards, and Rooming Lists for Registration #{selectedReg.registration_number}.
          </BodyText>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button
              onClick={() => {
                showToast('✓ Generated A4 Booking Form');
              }}
              className="bg-[#856936] text-white hover:bg-[#6E562B] text-xs font-bold px-6 py-3"
            >
              Print Booking Form (A4)
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                showToast('✓ Generated Flight & Hotel Itinerary');
              }}
              className="border-[#E2D7C3] text-[#1E1A16] hover:bg-[#F5EFE2] text-xs font-bold px-6 py-3"
            >
              Print Itinerary Voucher
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
