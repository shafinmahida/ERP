import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, CheckCircle2, RotateCw, Sparkles, X, Navigation,
  PhoneOff, MapPin, Calendar, User, FileText, Globe
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label, Badge } from '../ui/card';
import { OcrExtractionResult } from '../../services/ocr/fieldExtractor';
import { FieldConfidence, ParsedPassportMrz } from '../../services/ocr/mrzParser';

interface OcrReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ocrResult: OcrExtractionResult | null;
  onConfirmScannedFields: (fields: {
    full_name: string;
    father_name?: string;
    date_of_birth: string;
    gender: string;
    nationality: string;
    passport_number: string;
    issue_date?: string;
    expiry_date: string;
    place_of_issue?: string;
  }) => void;
  onRotateScan: () => void;
}

const emptyField: FieldConfidence = {
  value: '',
  score: 0,
  tier: 'Low',
  checksumPassed: false,
  formatValid: false,
  reason: 'Unreadable or missing in document',
};

const defaultParsed: ParsedPassportMrz = {
  full_name: { ...emptyField, reason: 'Name unreadable' },
  passport_number: { ...emptyField, reason: 'Passport Number unreadable' },
  nationality: { ...emptyField, reason: 'Nationality unreadable' },
  date_of_birth: { ...emptyField, reason: 'DOB unreadable' },
  gender: { ...emptyField, value: 'Male', reason: 'Default gender' },
  expiry_date: { ...emptyField, reason: 'Expiry Date unreadable' },
  father_name: { ...emptyField, reason: "Father's name not found" },
  issue_date: { ...emptyField, reason: 'Issue date not found' },
  place_of_issue: { ...emptyField, reason: 'Place of issue not found' },
  place_of_birth: { ...emptyField, reason: 'Place of birth not found' },
  mrzValid: false,
  mrzRawLine1: '',
  mrzRawLine2: '',
  documentType: 'Passport',
  overallConfidenceScore: 0,
  overallConfidenceTier: 'Low',
};

function ConfidencePill({ field }: { field: FieldConfidence }) {
  if (!field.value) {
    return (
      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400 border-slate-700">
        Not Found
      </span>
    );
  }
  if (field.hasDiscrepancy) {
    return (
      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse">
        ⚠ Discrepancy {field.score}%
      </span>
    );
  }
  switch (field.tier) {
    case 'Very High':
      return <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border-emerald-500/40">✓ {field.score}% Very High</span>;
    case 'High':
      return <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-300 border-green-500/40">✓ {field.score}% High</span>;
    case 'Medium':
      return <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400 border-amber-500/30">~ {field.score}% Medium</span>;
    default:
      return <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-rose-500/15 text-rose-400 border-rose-500/30">{field.score}% Low</span>;
  }
}

interface EditableFieldProps {
  label: string;
  field: FieldConfidence;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
  isSelect?: boolean;
  selectOptions?: string[];
  onFocus?: () => void;
  onBlur?: () => void;
}

function EditableField({
  label, field, value, onChange, type = 'text', mono, isSelect, selectOptions, onFocus, onBlur,
}: EditableFieldProps) {
  return (
    <div onFocus={onFocus} onBlur={onBlur} className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-slate-300 font-semibold text-[11px]">{label}</Label>
        <ConfidencePill field={field} />
      </div>
      {isSelect && selectOptions ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
        >
          {selectOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'text' && mono ? e.target.value.toUpperCase() : e.target.value)}
          className={`h-8 bg-slate-900 border-slate-700 text-slate-100 text-xs ${mono ? 'font-mono tracking-wider' : ''} ${!field.value ? 'border-dashed border-rose-800/50' : ''}`}
          placeholder={!field.value ? 'Not detected — enter manually' : undefined}
        />
      )}
      <p className="text-[10px] text-slate-500 leading-tight">{field.reason}</p>
    </div>
  );
}

export function OcrReviewPanel({
  isOpen, onClose, ocrResult, onConfirmScannedFields, onRotateScan,
}: OcrReviewPanelProps) {
  if (!isOpen || !ocrResult) return null;

  const parsed = ocrResult.parsedPassport || defaultParsed;
  const diag = ocrResult.diagnosticMetadata;

  const [name, setName] = useState(parsed.full_name.value);
  const [fatherName, setFatherName] = useState(parsed.father_name.value);
  const [passportNo, setPassportNo] = useState(parsed.passport_number.value);
  const [nationality, setNationality] = useState(parsed.nationality.value);
  const [dob, setDob] = useState(parsed.date_of_birth.value);
  const [gender, setGender] = useState(parsed.gender.value || 'Male');
  const [expiry, setExpiry] = useState(parsed.expiry_date.value);
  const [issueDate, setIssueDate] = useState(parsed.issue_date.value);
  const [placeOfIssue, setPlaceOfIssue] = useState(parsed.place_of_issue.value);

  const [activeTab, setActiveTab] = useState<'fields' | 'mrz' | 'rawtext'>('fields');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (ocrResult?.parsedPassport) {
      const p = ocrResult.parsedPassport;
      setName(p.full_name.value);
      setFatherName(p.father_name.value);
      setPassportNo(p.passport_number.value);
      setNationality(p.nationality.value);
      setDob(p.date_of_birth.value);
      setGender(p.gender.value || 'Male');
      setExpiry(p.expiry_date.value);
      setIssueDate(p.issue_date.value);
      setPlaceOfIssue(p.place_of_issue.value);
    }
  }, [ocrResult]);

  const handleConfirm = () => {
    onConfirmScannedFields({
      full_name: name,
      father_name: fatherName || undefined,
      date_of_birth: dob,
      gender,
      nationality,
      passport_number: passportNo,
      issue_date: issueDate || undefined,
      expiry_date: expiry,
      place_of_issue: placeOfIssue || undefined,
    });
    onClose();
  };

  const activeBbox = (() => {
    switch (focusedField) {
      case 'name': return parsed.full_name.boundingBox;
      case 'passport': return parsed.passport_number.boundingBox;
      case 'nationality': return parsed.nationality.boundingBox;
      case 'dob': return parsed.date_of_birth.boundingBox;
      case 'gender': return parsed.gender.boundingBox;
      case 'expiry': return parsed.expiry_date.boundingBox;
      case 'father': return parsed.father_name.boundingBox;
      case 'issue': return parsed.issue_date.boundingBox;
      case 'placeIssue': return parsed.place_of_issue.boundingBox;
      default: return parsed.mrzBoundingBox;
    }
  })();

  const fieldsExtracted = [name, passportNo, dob, expiry, nationality].filter(Boolean).length;
  const fieldsTotal = 5;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-slate-900 border-slate-800 text-slate-100 p-5 rounded-2xl shadow-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <DialogTitle className="text-lg font-bold">Passport Intelligence — Document Review</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-mono text-[10px]">{diag.ocrEngine}</Badge>
              <Badge variant={parsed.mrzValid ? 'default' : 'destructive'} className="text-[10px]">
                {parsed.mrzValid ? '✓ MRZ Verified' : '⚠ MRZ Unverified'}
              </Badge>
              <Badge variant="gold" className="text-[10px]">
                {fieldsExtracted}/{fieldsTotal} core fields
              </Badge>
            </div>
          </div>

          {/* Warnings banner */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs text-amber-300 flex items-center gap-2 mt-1">
            <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span>Always verify extracted data against the physical document. Edit any field manually before confirming.</span>
          </div>

          {diag.detectedRotationAngle !== 0 && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-2 text-xs text-blue-300 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <span>Auto-corrected {diag.detectedRotationAngle}° rotation for MRZ alignment.</span>
            </div>
          )}
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
          {/* Left: Document Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Document Preview</Label>
              <Button type="button" variant="outline" size="sm" onClick={onRotateScan}
                className="h-6 text-[11px] border-slate-700 hover:bg-slate-800 text-slate-200 px-2">
                <RotateCw className="h-3 w-3 mr-1 text-emerald-400" />
                Rotate 90°
              </Button>
            </div>

            <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex items-center justify-center min-h-[260px]">
              {ocrResult.preprocessedImage.dataUrl ? (
                <div className="relative w-full">
                  <img src={ocrResult.preprocessedImage.dataUrl} alt="Passport Scan"
                    className="w-full h-auto rounded-lg object-contain max-h-[320px]" />
                  {activeBbox && (
                    <div className="absolute border-2 border-emerald-400 bg-emerald-500/10 rounded transition-all duration-200"
                      style={{ left: `${activeBbox.x}%`, top: `${activeBbox.y}%`, width: `${activeBbox.width}%`, height: `${activeBbox.height}%` }}>
                      <span className="absolute -top-5 left-0 text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {focusedField?.toUpperCase().replace('_', ' ') || 'MRZ'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No image loaded</p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 text-[11px]">
              {(['fields', 'mrz', 'rawtext'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={`py-1.5 px-3 font-semibold border-b-2 cursor-pointer ${activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500'}`}>
                  {tab === 'fields' ? 'Fields' : tab === 'mrz' ? 'Raw MRZ' : 'OCR Text'}
                </button>
              ))}
            </div>

            {/* Tab content (shown below preview on mobile, or here on desktop) */}
            {activeTab === 'mrz' && (
              <div className="space-y-2 text-[11px]">
                <p className="text-slate-400 font-semibold">MRZ Line 1</p>
                <p className="font-mono bg-slate-950 text-emerald-300 p-2 rounded border border-slate-800 break-all">{parsed.mrzRawLine1 || '—'}</p>
                <p className="text-slate-400 font-semibold">MRZ Line 2</p>
                <p className="font-mono bg-slate-950 text-emerald-300 p-2 rounded border border-slate-800 break-all">{parsed.mrzRawLine2 || '—'}</p>
                <p className={`text-[10px] ${parsed.mrzValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {parsed.mrzValid ? '✓ All Modulo-10 checksums passed' : '⚠ MRZ checksum unverified or missing'}
                </p>
              </div>
            )}
            {activeTab === 'rawtext' && (
              <textarea readOnly value={ocrResult.rawText}
                className="w-full h-48 bg-slate-950 text-slate-300 font-mono text-[10px] p-2 rounded-lg border border-slate-800 focus:outline-none resize-none" />
            )}
          </div>

          {/* Right: Extracted Fields */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Extracted Identity Fields</h4>
              <span className="text-[10px] text-slate-500">Click a field to highlight source</span>
            </div>

            {/* Full Name */}
            <EditableField label="Full Name" field={parsed.full_name} value={name} onChange={setName}
              onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />

            {/* Father's Name */}
            <EditableField label="Father's / Husband's Name" field={parsed.father_name} value={fatherName}
              onChange={setFatherName} onFocus={() => setFocusedField('father')} onBlur={() => setFocusedField(null)} />

            {/* Passport No + Nationality */}
            <div className="grid grid-cols-2 gap-2">
              <EditableField label="Passport Number" field={parsed.passport_number} value={passportNo}
                onChange={setPassportNo} mono
                onFocus={() => setFocusedField('passport')} onBlur={() => setFocusedField(null)} />
              <EditableField label="Nationality" field={parsed.nationality} value={nationality}
                onChange={setNationality}
                onFocus={() => setFocusedField('nationality')} onBlur={() => setFocusedField(null)} />
            </div>

            {/* DOB + Gender */}
            <div className="grid grid-cols-2 gap-2">
              <EditableField label="Date of Birth" field={parsed.date_of_birth} value={dob}
                onChange={setDob} type="date"
                onFocus={() => setFocusedField('dob')} onBlur={() => setFocusedField(null)} />
              <EditableField label="Gender" field={parsed.gender} value={gender} onChange={setGender}
                isSelect selectOptions={['Male', 'Female', 'Other']}
                onFocus={() => setFocusedField('gender')} onBlur={() => setFocusedField(null)} />
            </div>

            {/* Issue Date + Expiry */}
            <div className="grid grid-cols-2 gap-2">
              <EditableField label="Date of Issue" field={parsed.issue_date} value={issueDate}
                onChange={setIssueDate} type="date"
                onFocus={() => setFocusedField('issue')} onBlur={() => setFocusedField(null)} />
              <EditableField label="Expiry Date" field={parsed.expiry_date} value={expiry}
                onChange={setExpiry} type="date"
                onFocus={() => setFocusedField('expiry')} onBlur={() => setFocusedField(null)} />
            </div>

            {/* Place of Issue */}
            <EditableField label="Place of Issue" field={parsed.place_of_issue} value={placeOfIssue}
              onChange={setPlaceOfIssue}
              onFocus={() => setFocusedField('placeIssue')} onBlur={() => setFocusedField(null)} />

            {/* Mobile number notice */}
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 flex items-center gap-2 text-[11px] text-slate-500">
              <PhoneOff className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
              <span>Mobile number is not stored in passports — enter it manually in the customer form.</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 mt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 text-sm">
            <X className="h-4 w-4 mr-1" />
            Discard
          </Button>
          <Button type="button" onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold px-5 text-sm">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Apply Extracted Data to Form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
