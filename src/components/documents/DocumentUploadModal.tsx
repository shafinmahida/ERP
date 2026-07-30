import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileImage,
  Eye,
  FolderOpen,
  Download,
  RotateCcw,
  Plus,
  Check,
  AlertTriangle,
  History,
  Tag,
  X,
  File,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label, Badge } from '../ui/card';
import {
  DocumentWithDetails,
  uploadNewDocument,
  uploadReplacementVersion,
  restorePreviousVersion,
  getDocumentsForIdentity,
  getDocumentsForRegistration,
  checkFileDuplicateHash,
  revealInExplorer,
} from '../../services/documentService';
import { getActiveDocumentTypesByScope, DocumentType } from '../../services/documentTypeService';
import { DocumentVersion } from '../../db/schema';
import { DuplicateWarningModal } from './DuplicateWarningModal';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  identityId?: number | null;
  registrationId?: number | null;
  customerName?: string;
  registrationNumber?: string;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  identityId,
  registrationId,
  customerName,
  registrationNumber,
}: DocumentUploadModalProps) {
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [availableTypes, setAvailableTypes] = useState<DocumentType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  // Dynamic Metadata Form fields
  const [docNumberInput, setDocNumberInput] = useState('');
  const [issueDateInput, setIssueDateInput] = useState('');
  const [expiryDateInput, setExpiryDateInput] = useState('');


  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Duplicate warning modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; buffer: Uint8Array } | null>(null);
  const [existingDupDoc, setExistingDupDoc] = useState<DocumentWithDetails | undefined>(undefined);
  const [existingDupVer, setExistingDupVer] = useState<DocumentVersion | undefined>(undefined);

  // Replace document version state
  const [replacingDocId, setReplacingDocId] = useState<number | null>(null);
  const [replacementReason, setReplacementReason] = useState('');
  const [replacementFile, setReplacementFile] = useState<{ file: File; buffer: Uint8Array } | null>(null);

  // Preview document state
  const [previewingVersion, setPreviewingVersion] = useState<DocumentVersion | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const ownerScope = identityId ? 'IDENTITY' : 'REGISTRATION';

  const reloadData = () => {
    try {
      if (identityId) {
        setDocuments(getDocumentsForIdentity(identityId));
      } else if (registrationId) {
        setDocuments(getDocumentsForRegistration(registrationId));
      }
      const types = getActiveDocumentTypesByScope(ownerScope);
      setAvailableTypes(types);
      if (types.length > 0 && !selectedTypeId) {
        setSelectedTypeId(types[0].document_type_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setValidationError(null);
    }
  }, [isOpen, identityId, registrationId]);

  const processSelectedFile = async (file: File) => {
    setValidationError(null);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const dupCheck = await checkFileDuplicateHash(buffer);

      if (dupCheck.isDuplicate) {
        setPendingFile({ file, buffer });
        setExistingDupDoc(dupCheck.existingDocument);
        setExistingDupVer(dupCheck.existingVersion);
        setShowDuplicateModal(true);
        return;
      }

      await executeUpload(file, buffer);
    } catch (err: any) {
      setValidationError(err.message || 'File upload failed');
    }
  };

  const executeUpload = async (file: File, buffer: Uint8Array) => {
    if (!selectedTypeId) {
      alert('Please select a Document Type');
      return;
    }
    await uploadNewDocument({
      identity_id: identityId || null,
      registration_id: registrationId || null,
      document_type_id: selectedTypeId,
      document_number: docNumberInput || null,
      issue_date: issueDateInput || null,
      expiry_date: expiryDateInput || null,
      original_filename: file.name,
      fileBuffer: buffer,
      mime_type: file.type || 'application/pdf',
    });
    setDocNumberInput('');
    setIssueDateInput('');
    setExpiryDateInput('');
    reloadData();
    setPendingFile(null);
  };


  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleExecuteReplaceVersion = async () => {
    if (!replacingDocId || !replacementFile || !replacementReason.trim()) {
      alert('Please select a file and provide a mandatory replacement reason.');
      return;
    }
    try {
      await uploadReplacementVersion(
        replacingDocId,
        replacementFile.file.name,
        replacementFile.buffer,
        replacementFile.file.type || 'application/pdf',
        replacementReason.trim()
      );
      setReplacingDocId(null);
      setReplacementFile(null);
      setReplacementReason('');
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestoreVersion = async (docId: number, verId: number) => {
    try {
      await restorePreviousVersion(docId, verId);
      reloadData();
    } catch (err: any) {
      alert('Restore failed: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-emerald-400" />
                Document Vault — {identityId ? 'Identity Documents' : 'Registration Documents'}
              </DialogTitle>
              <Badge variant="gold">Scope: {ownerScope}</Badge>
            </div>
            <p className="text-xs text-slate-400">
              {identityId
                ? `Attached to Passport Identity (Customer: ${customerName || 'Pilgrim'})`
                : `Attached to Registration: ${registrationNumber || 'Trip'}`}
            </p>
          </DialogHeader>

          {/* Validation Alert */}
          {validationError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 flex items-center gap-2 text-rose-300 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-950/20'
                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <UploadCloud className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Drag and drop document file here, or click to browse
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: <strong>PDF, PNG, JPG/JPEG</strong> • Max size: <strong>15 MB</strong>
                </p>
              </div>

              {/* Document Type Selector */}
              <div className="flex items-center gap-3 pt-2">
                <Label className="text-xs text-slate-400 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-amber-400" /> Select Category *
                </Label>

                <select
                  value={selectedTypeId || ''}
                  onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                  className="h-9 rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {availableTypes.map((t) => (
                    <option key={t.document_type_id} value={t.document_type_id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Metadata Driven Fields */}
              {selectedTypeId && (() => {
                const selectedType = availableTypes.find((t) => t.document_type_id === selectedTypeId);
                if (!selectedType || (!selectedType.requires_number && !selectedType.requires_expiry)) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-left">
                    {Boolean(selectedType.requires_number) && (
                      <div>
                        <Label className="text-[11px] text-slate-400">Document Number</Label>
                        <Input
                          placeholder="e.g. AB1234567"
                          value={docNumberInput}
                          onChange={(e) => setDocNumberInput(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-slate-100 text-xs mt-1"
                        />
                      </div>
                    )}
                    {Boolean(selectedType.requires_expiry) && (
                      <>
                        <div>
                          <Label className="text-[11px] text-slate-400">Issue Date</Label>
                          <Input
                            type="date"
                            value={issueDateInput}
                            onChange={(e) => setIssueDateInput(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-slate-100 text-xs mt-1 font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-400">Expiry Date</Label>
                          <Input
                            type="date"
                            value={expiryDateInput}
                            onChange={(e) => setExpiryDateInput(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-slate-100 text-xs mt-1 font-mono"
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div className="pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleBrowseChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                />


                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
                >
                  Browse File
                </Button>
              </div>
            </div>
          </div>

          {/* Document List */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Uploaded Document Vault ({documents.length} Total)</span>
              <span className="text-[10px] text-slate-500">Immutable DocumentTypes</span>
            </h3>

            <div className="space-y-3">
              {documents.length > 0 ? (
                documents.map((doc) => {
                  const currentVer = doc.currentVersion;
                  if (!currentVer) return null;
                  const isImage = currentVer.mime_type.startsWith('image/');

                  return (
                    <div
                      key={doc.document_id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* File Icon / Thumbnail */}
                          <div className="h-12 w-12 rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {isImage ? (
                              <FileImage className="h-6 w-6 text-amber-400" />
                            ) : (
                              <FileText className="h-6 w-6 text-emerald-400" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-100">{doc.documentTypeName}</h4>
                              <Badge variant="gold">Version {currentVer.version_number}</Badge>
                              <Badge variant="outline">{doc.status}</Badge>
                            </div>
                            <p className="text-xs font-mono text-slate-300 mt-0.5">
                              {currentVer.original_filename}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {(currentVer.file_size / 1024).toFixed(1)} KB • {currentVer.mime_type} • Uploaded:{' '}
                              {currentVer.uploaded_at?.slice(0, 10) || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Document Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewingVersion(currentVer)}
                            className="h-8 text-xs border-slate-700 hover:bg-slate-800 text-slate-200"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                            Preview
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revealInExplorer(currentVer.relative_path)}
                            className="h-8 text-xs border-slate-700 hover:bg-slate-800 text-slate-200"
                          >
                            <FolderOpen className="h-3.5 w-3.5 mr-1 text-amber-400" />
                            Reveal in Explorer
                          </Button>

                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setReplacingDocId(doc.document_id)}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                          >
                            + Replace Version
                          </Button>
                        </div>
                      </div>

                      {/* Replace Version Input Drawer */}
                      {replacingDocId === doc.document_id && (
                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3 space-y-3 text-xs">
                          <div className="flex items-center justify-between font-semibold text-emerald-300">
                            <span>Upload Replacement Version (Creates v{doc.versions.length + 1})</span>
                            <button
                              type="button"
                              onClick={() => setReplacingDocId(null)}
                              className="text-slate-400 hover:text-slate-200"
                            >
                              Cancel
                            </button>
                          </div>

                          <div>
                            <Label>Mandatory Reason for Replacement *</Label>
                            <Input
                              placeholder="e.g. Renewed passport document issued"
                              value={replacementReason}
                              onChange={(e) => setReplacementReason(e.target.value)}
                              className="bg-slate-900 border-slate-800 text-slate-100 mt-1"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={replaceFileInputRef}
                              onChange={async (e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  const f = e.target.files[0];
                                  const buffer = new Uint8Array(await f.arrayBuffer());
                                  setReplacementFile({ file: f, buffer });
                                }
                              }}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => replaceFileInputRef.current?.click()}
                            >
                              {replacementFile ? replacementFile.file.name : 'Select File'}
                            </Button>
                            <Button
                              type="button"
                              onClick={handleExecuteReplaceVersion}
                              className="bg-emerald-600"
                            >
                              Save New Version
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Version History Collapsible */}
                      {doc.versions.length > 1 && (
                        <div className="border-t border-slate-800 pt-2 space-y-1.5 text-xs">
                          <p className="font-semibold text-slate-400 flex items-center gap-1.5 text-[11px]">
                            <History className="h-3.5 w-3.5 text-amber-400" /> Append-Only Version History
                          </p>
                          {doc.versions.map((ver) => (
                            <div
                              key={ver.version_id}
                              className="flex items-center justify-between p-2 rounded bg-slate-900/60 font-mono text-[11px]"
                            >
                              <div>
                                <span className="font-bold text-amber-300">v{ver.version_number}</span> —{' '}
                                <span className="text-slate-300">{ver.original_filename}</span>{' '}
                                <span className="text-slate-500">({ver.uploaded_at?.slice(0, 10) || '-'})</span>
                                {ver.reason_for_replacement && (
                                  <p className="text-[10px] text-slate-400 font-sans italic">
                                    Reason: {ver.reason_for_replacement}
                                  </p>
                                )}
                              </div>

                              {ver.version_id !== currentVer.version_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRestoreVersion(doc.document_id, ver.version_id)}
                                  className="h-6 text-[10px] text-amber-400 hover:text-amber-300"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Restore as v{doc.versions.length + 1}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
                  <File className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No Documents Uploaded Yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Drag and drop or browse files above to attach documents.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewingVersion && (
        <Dialog open={Boolean(previewingVersion)} onOpenChange={() => setPreviewingVersion(null)}>
          <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-bold">
                Document Preview — {previewingVersion.original_filename} (v{previewingVersion.version_number})
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-[400px] bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center p-4">
              {previewingVersion.mime_type.startsWith('image/') ? (
                <img
                  src={`file:///${previewingVersion.relative_path}`}
                  alt="Preview"
                  className="max-h-[500px] object-contain rounded-lg"
                />
              ) : (
                <div className="text-center space-y-2">
                  <FileText className="h-16 w-16 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-200">PDF Document File</p>
                  <p className="text-xs text-slate-400">{previewingVersion.original_filename}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => revealInExplorer(previewingVersion.relative_path)} className="bg-amber-600">
                Reveal in Explorer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* SHA-256 Duplicate Collision Warning Modal */}
      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        existingDocument={existingDupDoc}
        existingVersion={existingDupVer}
        onPreviewExisting={() => {
          if (existingDupVer) setPreviewingVersion(existingDupVer);
          setShowDuplicateModal(false);
        }}
        onUploadAnyway={() => {
          if (pendingFile) executeUpload(pendingFile.file, pendingFile.buffer);
          setShowDuplicateModal(false);
        }}
      />
    </>
  );
}
