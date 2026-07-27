import React, { useState, useEffect } from 'react';
import { Search, FolderOpen, Eye, FileText, FileImage, Tag, Filter, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/card';
import { searchAllDocuments, DocumentWithDetails, revealInExplorer } from '../../services/documentService';
import { getAllDocumentTypes, DocumentTypeEntity } from '../../services/documentTypeService';

export function DocumentVaultView() {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [types, setTypes] = useState<DocumentTypeEntity[]>([]);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-emerald-400" />
            Global Document Vault
          </h2>
          <p className="text-xs text-slate-400">
            Searchable directory across all customer identities, registrations, and document categories.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh} className="border-slate-800 text-slate-300">
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by customer name, registration number, filename, or document type..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-slate-950 border-slate-800 text-slate-100 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-amber-400" />
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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

      {/* Extensible Grid (Future-ready for Pagination / Virtual Scrolling) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc) => {
            const ver = doc.currentVersion;
            if (!ver) return null;
            const isImage = ver.mime_type.startsWith('image/');

            return (
              <div
                key={doc.document_id}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="gold">{doc.documentTypeName}</Badge>
                    <Badge variant="outline">v{ver.version_number}</Badge>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    {isImage ? (
                      <FileImage className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    )}
                    <p className="text-xs font-mono text-slate-200 truncate font-semibold">
                      {ver.original_filename}
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    {doc.customerName && (
                      <p>
                        Customer: <strong className="text-slate-200">{doc.customerName}</strong>
                      </p>
                    )}
                    {doc.registrationNumber && (
                      <p>
                        Registration: <strong className="text-amber-400">{doc.registrationNumber}</strong>
                      </p>
                    )}
                    <p className="font-mono text-[10px] text-slate-500">
                      Uploaded: {ver.uploaded_at.slice(0, 10)} • {(ver.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">
                    Scope: {doc.ownerScope}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revealInExplorer(ver.relative_path)}
                    className="h-7 text-xs text-amber-400 hover:text-amber-300"
                  >
                    <FolderOpen className="h-3.5 w-3.5 mr-1" />
                    Reveal in Explorer
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full rounded-xl border border-slate-800 bg-slate-950 p-12 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-300">No Documents Found Matching Search Criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
