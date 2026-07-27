import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, CreditCard, Calendar, Phone, Globe, MapPin, AlertCircle, Save, Sparkles, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/card';
import { CustomerWithIdentity, checkForDuplicates, DuplicateMatch } from '../../services/customerService';
import { DuplicateDetectionModal } from './DuplicateDetectionModal';
import { processPassportScan, OcrExtractionResult } from '../../services/ocr/fieldExtractor';
import { OcrReviewPanel } from '../documents/OcrReviewPanel';
import { DocumentUploadModal } from '../documents/DocumentUploadModal';

const customerSchema = z.object({

  full_name: z.string().min(2, 'Full name is required'),
  father_name: z.string().min(2, "Father's name is required"),
  date_of_birth: z.string().min(4, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female', 'Other']),
  nationality: z.string().min(2, 'Nationality is required'),
  mobile_number: z.string().min(5, 'Mobile number is required'),
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
  const [ocrResult, setOcrResult] = useState<OcrExtractionResult | null>(null);
  const [showOcrPanel, setShowOcrPanel] = useState(false);
  const [showDocVault, setShowDocVault] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const scanFileInputRef = React.useRef<HTMLInputElement>(null);


  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: '',
      father_name: '',
      date_of_birth: '',
      gender: 'Male',
      nationality: 'Pakistani',
      mobile_number: '',
      passport_number: '',
      issue_date: '',
      expiry_date: '',
      place_of_issue: 'Islamabad',
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
        passport_number: editingCustomer.currentPassport || '',
        issue_date: editingCustomer.identities[0]?.issue_date || '',
        expiry_date: editingCustomer.identities[0]?.expiry_date || '',
        place_of_issue: editingCustomer.identities[0]?.place_of_issue || '',
      });
    } else {
      reset({
        full_name: '',
        father_name: '',
        date_of_birth: '',
        gender: 'Male',
        nationality: 'Pakistani',
        mobile_number: '',
        passport_number: '',
        issue_date: '',
        expiry_date: '',
        place_of_issue: 'Islamabad',
      });
    }
  }, [editingCustomer, reset, isOpen]);

  const watchedDob = watch('date_of_birth');
  const watchedExpiry = watch('expiry_date');

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
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    if (exp < sixMonthsFromNow) {
      return 'Passport expires in less than 6 months!';
    }
    return null;
  }, [watchedExpiry]);

  const onSubmit = (data: CustomerFormData) => {
    if (!editingCustomer) {
      const matches = checkForDuplicates({
        full_name: data.full_name,
        father_name: data.father_name,
        date_of_birth: data.date_of_birth,
        passport_number: data.passport_number,
      });

      if (matches.length > 0) {
        setDuplicateMatches(matches);
        setPendingFormData(data);
        setShowDuplicateModal(true);
        return;
      }
    }

    onSaveCustomer(data);
    onClose();
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

  const [scanRotationAngle, setScanRotationAngle] = useState(0);
  const [currentScanImage, setCurrentScanImage] = useState<HTMLImageElement | null>(null);

  const handlePassportScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsProcessingOcr(true);

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      setCurrentScanImage(img);

      const res = await processPassportScan(img, 0);
      setOcrResult(res);
      setScanRotationAngle(res.diagnosticMetadata.detectedRotationAngle);
      setShowOcrPanel(true);
    } catch (err: any) {
      alert('OCR Scan failed: ' + err.message);
      setShowOcrPanel(false);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleRotateScan = async () => {
    if (!currentScanImage) return;
    const newAngle = (scanRotationAngle + 90) % 360;
    setScanRotationAngle(newAngle);
    setIsProcessingOcr(true);
    try {
      const res = await processPassportScan(currentScanImage, newAngle);
      setOcrResult(res);
    } catch (e) {
      console.error('Failed to re-evaluate rotated image:', e);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleConfirmOcrFields = (scanned: any) => {
    reset({
      ...watch(),
      full_name: scanned.full_name || watch('full_name'),
      date_of_birth: scanned.date_of_birth || watch('date_of_birth'),
      gender: (scanned.gender as any) || watch('gender'),
      nationality: scanned.nationality || watch('nationality'),
      passport_number: scanned.passport_number || watch('passport_number'),
      expiry_date: scanned.expiry_date || watch('expiry_date'),
    });
    setShowOcrPanel(false);
  };


  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !showDuplicateModal} onOpenChange={onClose}>


        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative">
          {/* OCR Processing Overlay — shows while Tesseract is initializing */}
          {isProcessingOcr && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl bg-slate-950/90 backdrop-blur-sm gap-4">
              <div className="relative flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-4 border-slate-700 border-t-emerald-400 animate-spin" />
                <Sparkles className="absolute h-6 w-6 text-emerald-400 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-emerald-300">Scanning Passport with AI OCR Engine…</p>
              <p className="text-xs text-slate-400">Testing multiple orientations for best MRZ alignment</p>
            </div>
          )}

          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-400" />
              {editingCustomer ? 'Edit Customer Details' : 'Add New Customer / Pilgrim'}
            </DialogTitle>

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
                className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 text-xs font-semibold"
              >
                <Sparkles className={`h-3.5 w-3.5 mr-1.5 ${isProcessingOcr ? 'animate-spin' : ''}`} />
                {isProcessingOcr ? 'Extracting...' : '📷 Scan Passport'}
              </Button>

              {editingCustomer && editingCustomer.identities.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDocVault(true)}
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-950/40 text-xs font-semibold"
                >
                  <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                  Passport Vault
                </Button>
              )}
            </div>
          </DialogHeader>


          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
            {/* Personal Details */}
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <User className="h-4 w-4" /> Personal Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="e.g. Tariq Mehmood Khan"
                    {...register('full_name')}
                    className="bg-slate-900 border-slate-800 text-slate-100 mt-1"
                  />
                  {errors.full_name && (
                    <p className="text-[11px] text-rose-400 mt-1">{errors.full_name.message}</p>
                  )}
                </div>

                <div>
                  <Label>Father's / Husband's Name *</Label>
                  <Input
                    placeholder="e.g. Abdul Rehman Khan"
                    {...register('father_name')}
                    className="bg-slate-900 border-slate-800 text-slate-100 mt-1"
                  />
                  {errors.father_name && (
                    <p className="text-[11px] text-rose-400 mt-1">{errors.father_name.message}</p>
                  )}
                </div>

                <div>
                  <Label className="flex justify-between">
                    <span>Date of Birth *</span>
                    {calculatedAge !== null && (
                      <span className="text-emerald-400 font-mono text-[11px]">Age: {calculatedAge} yrs</span>
                    )}
                  </Label>
                  <Input
                    type="date"
                    {...register('date_of_birth')}
                    className="bg-slate-900 border-slate-800 text-slate-100 mt-1"
                  />
                  {errors.date_of_birth && (
                    <p className="text-[11px] text-rose-400 mt-1">{errors.date_of_birth.message}</p>
                  )}
                </div>

                <div>
                  <Label>Gender *</Label>
                  <select
                    {...register('gender')}
                    className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 mt-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <Label>Mobile Number *</Label>
                  <Input
                    placeholder="e.g. +923001234567"
                    {...register('mobile_number')}
                    className="bg-slate-900 border-slate-800 text-slate-100 mt-1 font-mono"
                  />
                  {errors.mobile_number && (
                    <p className="text-[11px] text-rose-400 mt-1">{errors.mobile_number.message}</p>
                  )}
                </div>

                <div>
                  <Label>Nationality *</Label>
                  <Input
                    placeholder="e.g. Pakistani"
                    {...register('nationality')}
                    className="bg-slate-900 border-slate-800 text-slate-100 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Passport Identity */}
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Current Passport Details (ACTIVE Status)
                </h3>
                {passportValidityWarning && (
                  <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {passportValidityWarning}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Passport Number</Label>
                  <Input
                    placeholder="e.g. AB1234567"
                    {...register('passport_number')}
                    className="bg-slate-900 border-slate-800 text-slate-100 mt-1 uppercase font-mono tracking-wider"
                  />
                </div>

                <div>
                  <Label>Place of Issue</Label>
                  <Input
                    placeholder="e.g. Islamabad"
                    {...register('place_of_issue')}
                    className="bg-slate-900 border-slate-800 text-slate-100 mt-1"
                  />
                </div>

                <div>
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    {...register('issue_date')}
                    className="bg-slate-900 border-slate-800 text-slate-100 mt-1"
                  />
                </div>

                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    {...register('expiry_date')}
                    className="bg-slate-900 border-slate-800 text-slate-100 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400">
                Cancel
              </Button>

              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-semibold px-6">
                <Save className="h-4 w-4 mr-2" />
                {editingCustomer ? 'Save Changes' : 'Check & Save Customer'}
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
        ocrResult={ocrResult}
        onConfirmScannedFields={handleConfirmOcrFields}
        onRotateScan={handleRotateScan}
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

