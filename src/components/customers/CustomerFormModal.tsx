import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, CreditCard, Phone, Globe, MapPin, AlertCircle, Save, Sparkles, FolderOpen, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/card';
import { CustomerWithIdentity, checkForDuplicates, DuplicateMatch } from '../../services/customerService';
import { DuplicateDetectionModal } from './DuplicateDetectionModal';
import { processDocumentScan, FullDocumentScanResult } from '../../services/ocr/fieldExtractor';
import { OcrReviewPanel } from '../documents/OcrReviewPanel';
import { DocumentUploadModal } from '../documents/DocumentUploadModal';
import { suggestPassportExpiryDate } from '../../services/dateUtils';
import { SmartDateInput } from '../ui/SmartDateInput';
import { HelpTooltip } from '../common/HelpTooltip';

const customerSchema = z.object({
  full_name: z.string().min(2, 'Full name is required (e.g. As written on Passport)'),
  father_name: z.string().min(2, "Father's name is required"),
  date_of_birth: z.string().min(4, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female', 'Other']),
  nationality: z.string().min(2, 'Nationality is required'),
  mobile_number: z.string().min(5, 'Mobile number is required'),
  state: z.string().optional(),
  passport_number: z.string().optional(),
  issue_date: z.string().optional(),
  expiry_date: z.string().optional(),
  place_of_issue: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCustomer: (data: CustomerFormData) => void;
  editingCustomer?: CustomerWithIdentity | null;
  onSelectExistingCustomer?: (customer: CustomerWithIdentity) => void;
}

export function CustomerFormModal({
  isOpen,
  onClose,
  onSaveCustomer,
  editingCustomer,
  onSelectExistingCustomer,
}: CustomerFormModalProps) {
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<CustomerFormData | null>(null);

  // OCR & Document Vault Modal state
  const [scanResult, setScanResult] = useState<FullDocumentScanResult | null>(null);
  const [showOcrPanel, setShowOcrPanel] = useState(false);
  const [showDocVault, setShowDocVault] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const scanFileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: '',
      father_name: '',
      date_of_birth: '',
      gender: 'Male',
      nationality: 'Indian',
      mobile_number: '',
      passport_number: '',
      issue_date: '',
      expiry_date: '',
      place_of_issue: 'Mumbai',
    },
  });

  useEffect(() => {
    if (editingCustomer) {
      reset({
        full_name: editingCustomer.full_name,
        father_name: editingCustomer.father_name,
        date_of_birth: editingCustomer.date_of_birth,
        gender: (editingCustomer.gender as any) || 'Male',
        nationality: editingCustomer.nationality,
        mobile_number: editingCustomer.mobile_number,
        state: editingCustomer.state || 'Maharashtra',
        passport_number: editingCustomer.currentPassport || '',
        issue_date: editingCustomer.identities[0]?.issue_date || '',
        expiry_date: editingCustomer.identities[0]?.expiry_date || '',
        place_of_issue: editingCustomer.identities[0]?.place_of_issue || 'Mumbai',
      });
    } else {
      reset({
        full_name: '',
        father_name: '',
        date_of_birth: '',
        gender: 'Male',
        nationality: 'Indian',
        mobile_number: '',
        state: 'Maharashtra',
        passport_number: '',
        issue_date: '',
        expiry_date: '',
        place_of_issue: 'Mumbai',
      });
    }
  }, [editingCustomer, reset, isOpen]);

  const watchedDob = watch('date_of_birth');
  const watchedIssueDate = watch('issue_date');
  const watchedExpiry = watch('expiry_date');

  // Auto 10-Year Passport Expiry Calculation
  useEffect(() => {
    if (watchedIssueDate) {
      const suggested = suggestPassportExpiryDate(watchedIssueDate);
      if (suggested) {
        setValue('expiry_date', suggested, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedIssueDate, setValue]);

  const calculatedAge = React.useMemo(() => {
    if (!watchedDob) return null;
    const dob = new Date(watchedDob);
    if (isNaN(dob.getTime())) return null;
    const diff = new Date().getFullYear() - dob.getFullYear();
    return diff >= 0 ? diff : null;
  }, [watchedDob]);

  const passportValidityWarning = React.useMemo(() => {
    if (!watchedExpiry) return null;
    const exp = new Date(watchedExpiry);
    if (isNaN(exp.getTime())) return null;
    const now = new Date();
    if (exp < now) {
      return 'Passport has EXPIRED!';
    }
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    if (exp < sixMonthsFromNow) {
      return 'Passport expires in less than 6 months!';
    }
    return null;
  }, [watchedExpiry]);

  const [pendingScanFile, setPendingScanFile] = useState<{ buffer: Uint8Array; name: string; type: string } | null>(null);

  const handlePassportScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsProcessingOcr(true);

    try {
      const arrayBuf = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuf);
      setPendingScanFile({ buffer: uint8, name: file.name, type: file.type });

      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();

      const res = await processDocumentScan(img, 'PASSPORT');
      setScanResult(res);
      setShowOcrPanel(true);
    } catch (err: any) {
      console.error('OCR Scan failed gracefully:', err);
      setShowOcrPanel(false);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const onSubmit = (data: CustomerFormData) => {
    const payload = {
      ...data,
      document_file_buffer: pendingScanFile?.buffer,
      document_filename: pendingScanFile?.name,
      document_mime_type: pendingScanFile?.type,
    };

    if (!editingCustomer) {
      const matches = checkForDuplicates({
        full_name: data.full_name,
        father_name: data.father_name,
        date_of_birth: data.date_of_birth,
        passport_number: data.passport_number,
      });

      if (matches.length > 0) {
        setDuplicateMatches(matches);
        setPendingFormData(payload as any);
        setShowDuplicateModal(true);
        return;
      }
    }

    onSaveCustomer(payload as any);
    onClose();
  };

  const handleConfirmOcrFields = (scanned: any) => {
    reset({
      ...watch(),
      full_name: scanned.full_name || watch('full_name'),
      father_name: scanned.father_name || watch('father_name'),
      date_of_birth: scanned.date_of_birth || watch('date_of_birth'),
      gender: (scanned.gender as any) || watch('gender'),
      nationality: scanned.nationality || watch('nationality'),
      passport_number: scanned.passport_number || watch('passport_number'),
      issue_date: scanned.issue_date || watch('issue_date'),
      expiry_date: scanned.expiry_date || watch('expiry_date'),
      place_of_issue: scanned.place_of_issue || watch('place_of_issue'),
    });
    setShowOcrPanel(false);
  };

  const handleProceedCreateAnyway = () => {
    if (pendingFormData) {
      onSaveCustomer(pendingFormData);
      setShowDuplicateModal(false);
      onClose();
    }
  };

  const handleSelectExisting = (cust: CustomerWithIdentity) => {
    if (onSelectExistingCustomer) {
      onSelectExistingCustomer(cust);
    }
    setShowDuplicateModal(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !showDuplicateModal} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-white border-stone-200 text-stone-900 p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto relative">
          {/* OCR Processing Overlay */}
          {isProcessingOcr && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl bg-white/95 backdrop-blur-sm gap-3">
              <div className="relative flex items-center justify-center">
                <div className="h-14 w-14 rounded-full border-4 border-stone-200 border-t-emerald-700 animate-spin" />
                <Sparkles className="absolute h-5 w-5 text-emerald-700 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-stone-900">Scanning Passport with AI OCR...</p>
              <p className="text-xs text-stone-500">Extracting passport details directly into form</p>
            </div>
          )}

          <DialogHeader className="flex flex-row items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <DialogTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-800" />
                {editingCustomer ? 'Edit Pilgrim Profile' : 'Add New Pilgrim Customer'}
              </DialogTitle>
              <p className="text-xs text-stone-500 mt-0.5">
                Record pilgrim identity details for Hajj & Umrah booking forms and receipts
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={scanFileInputRef}
                onChange={handlePassportScanFile}
                accept="image/*"
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => scanFileInputRef.current?.click()}
                disabled={isProcessingOcr}
                className="text-xs font-semibold text-emerald-800 border-emerald-300 hover:bg-emerald-50"
              >
                <Sparkles className={`h-3.5 w-3.5 mr-1.5 ${isProcessingOcr ? 'animate-spin' : ''}`} />
                {isProcessingOcr ? 'Scanning...' : '📷 Auto-Scan Passport'}
              </Button>

              {editingCustomer && editingCustomer.identities.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDocVault(true)}
                  className="text-xs font-semibold text-amber-800 border-amber-300 hover:bg-amber-50"
                >
                  <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                  Passport Vault
                </Button>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-3">
            {/* Personal Details */}
            <div className="space-y-3.5 rounded-xl border border-stone-200/80 bg-stone-50/50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <User className="h-4 w-4" /> Personal Profile Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center">
                    Full Name (As written on Passport) *
                    <HelpTooltip text="Enter the exact name printed on the pilgrim's passport for booking accuracy." />
                  </Label>
                  <Input
                    placeholder="e.g. Mohammed Javeed Ahmed Khan"
                    {...register('full_name')}
                    className="mt-1"
                  />
                  {errors.full_name && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.full_name.message}</p>
                  )}
                </div>

                <div>
                  <Label className="flex items-center">
                    Father's / Husband's Name *
                    <HelpTooltip text="Required for Hajj & Umrah ministry visa applications." />
                  </Label>
                  <Input
                    placeholder="e.g. Abdul Rehman Khan"
                    {...register('father_name')}
                    className="mt-1"
                  />
                  {errors.father_name && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.father_name.message}</p>
                  )}
                </div>

                <div>
                  <Label className="flex justify-between items-center">
                    <span>Date of Birth *</span>
                    {calculatedAge !== null && (
                      <span className="text-emerald-800 font-mono text-[11px] font-semibold">Age: {calculatedAge} yrs</span>
                    )}
                  </Label>
                  <SmartDateInput
                    value={watch('date_of_birth') || ''}
                    onChange={(val) => setValue('date_of_birth', val, { shouldValidate: true, shouldDirty: true })}
                    className="mt-1 h-10 px-3 rounded-lg text-sm border-stone-300"
                  />
                  {errors.date_of_birth && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.date_of_birth.message}</p>
                  )}
                </div>

                <div>
                  <Label>Gender *</Label>
                  <select
                    {...register('gender')}
                    className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <Label className="flex items-center">
                    Mobile Number *
                    <HelpTooltip text="Main phone number to send WhatsApp booking updates & receipts." />
                  </Label>
                  <Input
                    placeholder="e.g. +91 98200 12345"
                    {...register('mobile_number')}
                    className="mt-1 font-mono"
                  />
                  {errors.mobile_number && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.mobile_number.message}</p>
                  )}
                </div>

                <div>
                  <Label className="flex items-center">
                    State / Region (for GST calculation)
                    <HelpTooltip text="Determines whether CGST+SGST (Same State) or IGST (Other State) applies on the tax invoice." />
                  </Label>
                  <Input
                    placeholder="e.g. Maharashtra, Gujarat, Delhi"
                    {...register('state')}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Passport Identity */}
            <div className="space-y-3.5 rounded-xl border border-stone-200/80 bg-amber-50/30 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-amber-700" /> Active Passport Records
                </h3>
                {passportValidityWarning && (
                  <span className="text-[11px] text-rose-700 font-semibold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    <AlertCircle className="h-3.5 w-3.5" /> {passportValidityWarning}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center">
                    Passport Number (e.g. As written on Passport)
                    <HelpTooltip text="Standard 8-character passport number." />
                  </Label>
                  <Input
                    placeholder="e.g. Z1234567"
                    {...register('passport_number')}
                    className="mt-1 uppercase font-mono tracking-wider"
                  />
                </div>

                <div>
                  <Label>Place of Issue</Label>
                  <Input
                    placeholder="e.g. Mumbai, Delhi"
                    {...register('place_of_issue')}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Issue Date</Label>
                  <SmartDateInput
                    value={watch('issue_date') || ''}
                    onChange={(val) => setValue('issue_date', val, { shouldValidate: true, shouldDirty: true })}
                    className="mt-1 h-10 px-3 rounded-lg text-sm border-stone-300"
                  />
                </div>

                <div>
                  <Label className="flex justify-between items-center">
                    <span className="flex items-center">
                      Expiry Date
                      <HelpTooltip text="Automatically defaults to 10 years minus 1 day from Issue Date." />
                    </span>
                    <span className="text-emerald-800 text-[10px] font-medium">(Auto: 10-Yr expiry)</span>
                  </Label>
                  <SmartDateInput
                    value={watch('expiry_date') || ''}
                    onChange={(val) => setValue('expiry_date', val, { shouldValidate: true, shouldDirty: true })}
                    className="mt-1 h-10 px-3 rounded-lg text-sm border-stone-300 font-semibold text-emerald-900"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
              <Button type="button" variant="ghost" onClick={onClose} className="text-stone-600">
                Cancel
              </Button>

              <Button type="submit" className="bg-emerald-800 hover:bg-emerald-900 font-bold px-6">
                <Save className="h-4 w-4 mr-2" />
                {editingCustomer ? 'Save Customer Record' : 'Save Pilgrim Profile'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate Resolution Modal */}
      <DuplicateDetectionModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        matches={duplicateMatches}
        inputData={pendingFormData || {}}
        onSelectExisting={handleSelectExisting}
        onProceedCreateNewAnyway={handleProceedCreateAnyway}
      />
      {/* OCR Review Panel Modal */}
      <OcrReviewPanel
        isOpen={showOcrPanel}
        onClose={() => setShowOcrPanel(false)}
        scanResult={scanResult}
        onConfirmScannedFields={handleConfirmOcrFields}
      />

      {/* Identity Document Vault Modal */}
      {editingCustomer && editingCustomer.identities.length > 0 && (
        <DocumentUploadModal
          isOpen={showDocVault}
          onClose={() => setShowDocVault(false)}
          identityId={editingCustomer.identities[0].identity_id}
          customerName={editingCustomer.full_name}
        />
      )}
    </>
  );
}
