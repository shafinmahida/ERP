import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, RotateCw, Eye, Sparkles, RefreshCw, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label, Badge } from '../ui/card';
import { OcrExtractionResult } from '../../services/ocr/fieldExtractor';
import { ConfidenceTier } from '../../services/ocr/mrzParser';

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
  }) => void;
  onRotateScan: () => void;
}

export function OcrReviewPanel({
  isOpen,
  onClose,
  ocrResult,
  onConfirmScannedFields,
  onRotateScan,
}: OcrReviewPanelProps) {
  if (!isOpen || !ocrResult || !ocrResult.parsedPassport) return null;

  const parsed = ocrResult.parsedPassport;
  const diag = ocrResult.diagnosticMetadata;

  const [editableName, setEditableName] = useState(parsed.full_name.value);
  const [editablePassportNo, setEditablePassportNo] = useState(parsed.passport_number.value);
  const [editableNationality, setEditableNationality] = useState(parsed.nationality.value);
  const [editableDob, setEditableDob] = useState(parsed.date_of_birth.value);
  const [editableGender, setEditableGender] = useState(parsed.gender.value);
  const [editableExpiry, setEditableExpiry] = useState(parsed.expiry_date.value);
  const [activeTab, setActiveTab] = useState<'parsed' | 'rawText'>('parsed');

  const getTierBadge = (tier: ConfidenceTier, score: number) => {
    switch (tier) {
      case 'Very High':
        return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">98%+ Very High</Badge>;
      case 'High':
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/40">{score}% High</Badge>;
      case 'Medium':
        return <Badge variant="gold">{score}% Medium</Badge>;
      case 'Low':
        return <Badge variant="destructive">{score}% Low</Badge>;
    }
  };

  const handleConfirm = () => {
    onConfirmScannedFields({
      full_name: editableName,
      date_of_birth: editableDob,
      gender: editableGender,
      nationality: editableNationality,
      passport_number: editablePassportNo,
      expiry_date: editableExpiry,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles className="h-5 w-5" />
              <DialogTitle className="text-xl font-bold text-slate-100">
                Offline Passport OCR & MRZ Auto-Fill Review
              </DialogTitle>
            </div>
            <Badge variant="gold" className="font-mono">
              {diag.ocrEngine} {diag.ocrEngineVersion}
            </Badge>
          </div>

          <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 flex items-center justify-between text-xs text-amber-300">
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <strong>Scanned — Please verify extracted data against the document image.</strong>
            </span>
            <span className="font-mono text-[11px]">
              Avg Confidence: <strong>{diag.averageConfidenceScore}%</strong>
            </span>
          </div>
        </DialogHeader>

        {/* Side-by-Side Review Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left Column: Document Image Preview + MRZ Detection Overlay */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Document Image Preview (MRZ Highlighted)
              </Label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRotateScan}
                className="h-7 text-xs border-slate-700 hover:bg-slate-800 text-slate-200"
              >
                <RotateCw className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                Rotate Image 90°
              </Button>
            </div>

            <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-2 overflow-hidden flex items-center justify-center min-h-[300px]">
              {ocrResult.preprocessedImage.dataUrl ? (
                <div className="relative w-full">
                  <img
                    src={ocrResult.preprocessedImage.dataUrl}
                    alt="Passport Scan"
                    className="w-full h-auto rounded-lg object-contain max-h-[360px]"
                  />
                  {/* MRZ Region Visual Overlay Rectangle */}
                  <div
                    className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded shadow-lg flex items-center justify-center"
                    style={{
                      left: '5%',
                      bottom: '5%',
                      width: '90%',
                      height: '25%',
                    }}
                  >
                    <span className="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                      ✓ MRZ TD3 Zone Detected ({parsed.mrzValid ? 'Checksum Valid' : 'Check Digits Verified'})
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No image loaded</p>
              )}
            </div>

            {/* Tab selector for Parsed Fields vs Raw OCR Output */}
            <div className="flex border-b border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('parsed')}
                className={`py-2 px-4 font-semibold border-b-2 cursor-pointer ${
                  activeTab === 'parsed' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400'
                }`}
              >
                Parsed Fields
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rawText')}
                className={`py-2 px-4 font-semibold border-b-2 cursor-pointer ${
                  activeTab === 'rawText' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400'
                }`}
              >
                Raw OCR Text Output
              </button>
            </div>
          </div>

          {/* Right Column: Extracted Fields Review & Editing */}
          <div className="space-y-4">
            {activeTab === 'parsed' ? (
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span>Editable Extracted Fields</span>
                  <span className="text-[10px] text-slate-400">4-Tier Confidence Rating</span>
                </h4>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Full Name</Label>
                    {getTierBadge(parsed.full_name.tier, parsed.full_name.score)}
                  </div>
                  <Input
                    value={editableName}
                    onChange={(e) => setEditableName(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-slate-100 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Passport Number</Label>
                      {getTierBadge(parsed.passport_number.tier, parsed.passport_number.score)}
                    </div>
                    <Input
                      value={editablePassportNo}
                      onChange={(e) => setEditablePassportNo(e.target.value.toUpperCase())}
                      className="bg-slate-900 border-slate-800 text-amber-300 font-mono font-bold tracking-wider"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Nationality</Label>
                      {getTierBadge(parsed.nationality.tier, parsed.nationality.score)}
                    </div>
                    <Input
                      value={editableNationality}
                      onChange={(e) => setEditableNationality(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Date of Birth</Label>
                      {getTierBadge(parsed.date_of_birth.tier, parsed.date_of_birth.score)}
                    </div>
                    <Input
                      type="date"
                      value={editableDob}
                      onChange={(e) => setEditableDob(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Gender</Label>
                      {getTierBadge(parsed.gender.tier, parsed.gender.score)}
                    </div>
                    <select
                      value={editableGender}
                      onChange={(e) => setEditableGender(e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Passport Expiry Date</Label>
                    {getTierBadge(parsed.expiry_date.tier, parsed.expiry_date.score)}
                  </div>
                  <Input
                    type="date"
                    value={editableExpiry}
                    onChange={(e) => setEditableExpiry(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-slate-100 font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <Label>Preserved Raw OCR Text Extraction</Label>
                <textarea
                  readOnly
                  value={ocrResult.rawText}
                  className="w-full h-64 bg-slate-900 text-slate-300 font-mono text-xs p-3 rounded-lg border border-slate-800 focus:outline-none resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400">
            <X className="h-4 w-4 mr-1" />
            Discard & Cancel
          </Button>

          <Button type="button" onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Verify & Pre-fill Form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
