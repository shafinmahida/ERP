import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  FileCheck2,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label, Badge } from '../ui/card';
import type { FullDocumentScanResult } from '../../services/ocr/fieldExtractor';

interface OcrReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: FullDocumentScanResult | null;
  onConfirmScannedFields: (fields: {
    full_name: string;
    father_name: string;
    date_of_birth: string;
    gender: string;
    nationality: string;
    passport_number: string;
    issue_date: string;
    expiry_date: string;
    place_of_issue: string;
  }) => void;
}

export function OcrReviewPanel({
  isOpen,
  onClose,
  scanResult,
  onConfirmScannedFields,
}: OcrReviewPanelProps) {
  if (!isOpen || !scanResult) return null;

  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [nationality, setNationality] = useState('Indian');
  const [passportNumber, setPassportNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [placeOfIssue, setPlaceOfIssue] = useState('');

  useEffect(() => {
    if (scanResult && scanResult.fields) {
      setFullName(scanResult.fields.full_name.value || '');
      setFatherName(scanResult.fields.father_name.value || '');
      setDateOfBirth(scanResult.fields.date_of_birth.value || '');
      setGender(scanResult.fields.gender.value || 'Male');
      setNationality(scanResult.fields.nationality.value || 'Indian');
      setPassportNumber(scanResult.fields.passport_number.value || '');
      setIssueDate(scanResult.fields.issue_date.value || '');
      setExpiryDate(scanResult.fields.expiry_date.value || '');
      setPlaceOfIssue(scanResult.fields.place_of_issue.value || '');
    }
  }, [scanResult, isOpen]);

  const handleConfirm = () => {
    onConfirmScannedFields({
      full_name: fullName.trim(),
      father_name: fatherName.trim(),
      date_of_birth: dateOfBirth.trim(),
      gender,
      nationality: nationality.trim() || 'Indian',
      passport_number: passportNumber.trim().toUpperCase(),
      issue_date: issueDate.trim(),
      expiry_date: expiryDate.trim(),
      place_of_issue: placeOfIssue.trim(),
    });
    onClose();
  };

  const getExtractionBadge = () => {
    switch (scanResult.extractionMode) {
      case 'MRZ_VERIFIED':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-2.5 py-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            MRZ-Verified (High Confidence)
          </Badge>
        );
      case 'MRZ_UNVERIFIED':
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-2.5 py-1 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            MRZ-Unverified (Low Confidence — Checksum Failed)
          </Badge>
        );
      case 'GENERAL_OCR_FALLBACK':
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs px-2.5 py-1 flex items-center gap-1.5">
            <FileCheck2 className="h-4 w-4 text-blue-400" />
            General OCR Fallback
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-xs px-2.5 py-1 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-slate-400" />
            Manual Entry Only
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                OCR Review & Operator Verification
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-1">
                Review extracted fields before applying to customer profile. Nothing is saved automatically.
              </p>
            </div>
            <div>{getExtractionBadge()}</div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Quality Warning Banner (Pre-check Image Quality Requirement) */}
          {scanResult.qualityCheck?.isLowQuality && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-300 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-200">⚠️ Photo Quality Warning:</p>
                <p className="text-amber-300/90 leading-relaxed">
                  {scanResult.qualityCheck.warningMessage || 'This photo may produce inaccurate results — consider retaking.'}
                </p>
                <p className="text-[11px] text-slate-400 italic">
                  Note: This is a warning only. You may edit the fields manually below or proceed with confirmation.
                </p>
              </div>
            </div>
          )}

          {/* Authoritative Source Banner */}
          {scanResult.extractionMode === 'MRZ_VERIFIED' && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>MRZ Checksums Passed 100%:</strong> MRZ extracted fields (Passport No, Name, DOB, Expiry, Nationality, Gender) are authoritative and verified.
              </span>
            </div>
          )}

          {/* Extracted Form Fields */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Extracted Pilgrim Profile Fields
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-slate-300 font-semibold">Full Name *</Label>
                  {scanResult.fields.full_name.isAuthoritative && (
                    <span className="text-[10px] text-emerald-400 font-mono">✓ MRZ Authoritative</span>
                  )}
                </div>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-slate-300 font-semibold">Father's / Husband's Name</Label>
                  <span className="text-[10px] text-slate-500 font-mono">Visual Zone Scan</span>
                </div>
                <Input
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Extracted from Visual Zone"
                  className="bg-slate-900 border-slate-700 text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-slate-300 font-semibold">Passport Number *</Label>
                  {scanResult.fields.passport_number.isAuthoritative && (
                    <span className="text-[10px] text-emerald-400 font-mono">✓ MRZ Authoritative</span>
                  )}
                </div>
                <Input
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-xs font-mono text-amber-300 font-bold"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-slate-300 font-semibold">Date of Birth *</Label>
                  {scanResult.fields.date_of_birth.isAuthoritative && (
                    <span className="text-[10px] text-emerald-400 font-mono">✓ MRZ Authoritative</span>
                  )}
                </div>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-slate-300 font-semibold">Gender *</Label>
                </div>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-9 w-full rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-slate-300 font-semibold">Nationality *</Label>
                </div>
                <Input
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-slate-300 font-semibold">Issue Date</Label>
                  <span className="text-[10px] text-slate-500 font-mono">Visual Zone Scan</span>
                </div>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-slate-300 font-semibold">Expiry Date *</Label>
                  {scanResult.fields.expiry_date.isAuthoritative && (
                    <span className="text-[10px] text-emerald-400 font-mono">✓ MRZ Authoritative</span>
                  )}
                </div>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-slate-300 font-semibold">Place of Issue</Label>
                  <span className="text-[10px] text-slate-500 font-mono">Visual Zone Scan</span>
                </div>
                <Input
                  value={placeOfIssue}
                  onChange={(e) => setPlaceOfIssue(e.target.value)}
                  placeholder="e.g. Mumbai, Delhi"
                  className="bg-slate-900 border-slate-700 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Raw Text Section (For General OCR / Operator Reference) */}
          {scanResult.rawText && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-1 text-xs">
              <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                Raw Extracted OCR Text (Reference Only)
              </p>
              <pre className="p-2 bg-slate-900 rounded border border-slate-800 text-[10px] font-mono text-slate-300 whitespace-pre-wrap max-h-24 overflow-y-auto">
                {scanResult.rawText}
              </pre>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-700 text-xs">
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirm & Populate Form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
