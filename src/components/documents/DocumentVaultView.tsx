import React, { useState, useEffect } from 'react';
import { Search, FolderOpen, FileText, FileImage, Filter, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/card';
import { searchAllDocuments, DocumentWithDetails, revealInExplorer } from '../../services/documentService';
import { getAllDocumentTypes, DocumentType } from '../../services/documentTypeService';
import { HelpTooltip } from '../common/HelpTooltip';

export function DocumentVaultView() {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  const handleRefresh = () => {
    try {
      setDocuments(searchAllDocuments(query));
      setTypes(getAllDocumentTypes());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, [query]);

  const filteredDocs = documents.filter((doc) => {
    if (selectedTypeFilter === 'ALL') return true;
    return doc.documentTypeCode === selectedTypeFilter;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-emerald-800" />
            Global Document Vault
            <HelpTooltip text="Search across all passport scans, visas, and receipts stored in your local data directory." />
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Searchable directory of pilgrim identity documents, passport scans, and visas
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh} className="text-xs">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-stone-600" />
          Refresh Vault
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search by pilgrim name, reg #, filename, or document category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-stone-400" />
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 cursor-pointer"
          >
            <option value="ALL">All Categories ({documents.length})</option>
            {types.map((t) => (
              <option key={t.document_type_id} value={t.code}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc) => {
            const ver = doc.currentVersion;
            if (!ver) return null;
            const isImage = ver.mime_type.startsWith('image/');

            return (
              <div
                key={doc.document_id}
                className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-3 flex flex-col justify-between hover:border-stone-300 transition-all shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="gold">{doc.documentTypeName}</Badge>
                    <Badge variant="outline">v{ver.version_number}</Badge>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    {isImage ? (
                      <FileImage className="h-5 w-5 text-amber-700 shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-emerald-800 shrink-0" />
                    )}
                    <p className="text-xs font-mono font-bold text-stone-900 truncate">
                      {ver.original_filename}
                    </p>
                  </div>

                  <div className="text-[11px] text-stone-600 space-y-0.5">
                    {doc.customerName && (
                      <p>
                        Pilgrim: <strong className="text-stone-900">{doc.customerName}</strong>
                      </p>
                    )}
                    {doc.registrationNumber && (
                      <p>
                        Reg No: <strong className="text-amber-900 font-mono">{doc.registrationNumber}</strong>
                      </p>
                    )}
                    <p className="font-mono text-[10px] text-stone-400">
                      Uploaded: {ver.uploaded_at.slice(0, 10)} • {(ver.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-stone-400">
                    Scope: {doc.ownerScope}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revealInExplorer(ver.relative_path)}
                    className="h-7 text-xs text-amber-900 hover:text-amber-950 font-semibold"
                  >
                    <FolderOpen className="h-3.5 w-3.5 mr-1" />
                    Open File Path
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full rounded-xl border border-stone-200/80 bg-white p-12 text-center text-stone-500 shadow-2xs">
            <p className="text-sm font-bold text-stone-800">No Documents Found in Vault</p>
            <p className="text-xs text-stone-500 mt-1">Upload passport scans and visas from Customer Profiles or Registration Workspaces.</p>
          </div>
        )}
      </div>
    </div>
  );
}
