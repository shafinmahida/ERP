import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, UserCheck, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/card';
import { DuplicateMatch, CustomerWithIdentity } from '../../services/customerService';

interface DuplicateDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: DuplicateMatch[];
  inputData: any;
  onSelectExisting: (customer: CustomerWithIdentity) => void;
  onProceedCreateNewAnyway: () => void;
}

export function DuplicateDetectionModal({
  isOpen,
  onClose,
  matches,
  inputData,
  onSelectExisting,
  onProceedCreateNewAnyway,
}: DuplicateDetectionModalProps) {
  if (!isOpen) return null;

  const hasDataConflict = matches.some((m) => m.isDataConflict);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5 text-amber-400">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle className="text-xl font-bold text-slate-100">
              {hasDataConflict ? 'Data Conflict & Duplicate Review' : 'Potential Duplicate Customer Detected'}
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-400">
            The system found <strong className="text-amber-400">{matches.length} matching candidate(s)</strong> in your database. Review side-by-side details below.
          </p>
        </DialogHeader>

        {/* Input Customer Summary */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 font-medium">New Entry:</span>{' '}
            <strong className="text-slate-200">{inputData.full_name}</strong> (S/O {inputData.father_name})
          </div>
          <div className="text-slate-400 font-mono">DOB: {inputData.date_of_birth}</div>
        </div>

        {/* Matches Ranked List */}
        <div className="max-h-80 overflow-y-auto space-y-3 pr-1 my-2">
          {matches.map((match, idx) => {
            const cust = match.existingCustomer;
            const isConflict = match.isDataConflict;
            const isHigh = match.confidenceLevel === 'HIGH';

            return (
              <div
                key={cust.customer_id}
                className={`rounded-xl border p-4 transition-all ${
                  isConflict
                    ? 'border-rose-500/50 bg-rose-950/20'
                    : isHigh
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : 'border-slate-800 bg-slate-950/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-100">{cust.full_name}</h4>
                      <Badge variant={isConflict ? 'destructive' : isHigh ? 'gold' : 'secondary'}>
                        {isConflict ? '⚠️ DATA CONFLICT' : `${match.confidenceScore}% ${match.confidenceLevel} Match`}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-400">
                      Father's Name: <span className="text-slate-200">{cust.father_name}</span> • DOB:{' '}
                      <span className="text-slate-200">{cust.date_of_birth}</span>
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                      <span>Mobile: <strong className="text-slate-300 font-mono">{cust.mobile_number || '-'}</strong></span>
                      <span>Passport: <strong className="text-amber-400 font-mono">{cust.currentPassport || 'None'}</strong></span>
                    </div>

                    {/* Matched Fields Tags */}
                    <div className="flex items-center gap-1.5 pt-2">
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Matched:</span>
                      {match.matchedFields.map((f, fIdx) => (
                        <span
                          key={fIdx}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                            isConflict ? 'bg-rose-900/60 text-rose-200 border border-rose-700' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {f}
                        </span>
                      ))}
                    </div>

                    {isConflict && (
                      <p className="text-[11px] text-rose-300 pt-1 font-semibold">
                        ⚠️ Conflict Warning: Passport matches existing customer but full name differs! Requires operator inspection.
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectExisting(cust)}
                    className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/30 hover:text-emerald-300"
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                    Use Existing Customer
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            Cancel & Edit Form
          </Button>

          <Button
            variant="default"
            onClick={onProceedCreateNewAnyway}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create New Customer Anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
