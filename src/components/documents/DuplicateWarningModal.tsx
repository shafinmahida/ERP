import React from 'react';
import { AlertTriangle, Eye, UploadCloud, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/card';
import { DocumentWithDetails } from '../../services/documentService';
import { DocumentVersion } from '../../db/schema';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingDocument?: DocumentWithDetails;
  existingVersion?: DocumentVersion;
  onPreviewExisting: () => void;
  onUploadAnyway: () => void;
}

export function DuplicateWarningModal({
  isOpen,
  onClose,
  existingDocument,
  existingVersion,
  onPreviewExisting,
  onUploadAnyway,
}: DuplicateWarningModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5 text-amber-400">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle className="text-xl font-bold text-slate-100">
              Duplicate File Detected (SHA-256 Collision)
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-400">
            An identical file byte-for-byte matching checksum <code className="font-mono text-amber-300 text-[11px]">{existingVersion?.checksum.slice(0, 16)}...</code> already exists in the system.
          </p>
        </DialogHeader>

        {existingDocument && existingVersion && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">{existingDocument.documentTypeName}</span>
              <Badge variant="gold">Version {existingVersion.version_number}</Badge>
            </div>
            <p className="text-slate-400">
              Original Filename: <strong className="text-slate-200">{existingVersion.original_filename}</strong>
            </p>
            <p className="text-slate-400">
              Uploaded On: <span className="font-mono text-slate-300">{existingVersion.uploaded_at.slice(0, 19).replace('T', ' ')}</span>
            </p>
            {existingDocument.customerName && (
              <p className="text-slate-400">
                Attached To: <strong className="text-slate-200">{existingDocument.customerName}</strong>
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400">
            <X className="h-4 w-4 mr-1" />
            Cancel Upload
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onPreviewExisting}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <Eye className="h-4 w-4 mr-1.5 text-amber-400" />
            Preview Existing
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onUploadAnyway}
            className="bg-amber-600 hover:bg-amber-700 font-semibold"
          >
            <UploadCloud className="h-4 w-4 mr-1.5" />
            Upload Anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
