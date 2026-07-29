import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Search, Filter, Plus, Calendar, FileCheck2, Receipt, Users, CreditCard } from 'lucide-react';
import { RegistrationWithDetails, RegistrationStatus, REGISTRATION_STATUSES } from '../../services/registrationService';
import { SeasonWithDetails } from '../../services/seasonPackageService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/card';
import { RegistrationFinancialsModal } from './RegistrationFinancialsModal';
import { HelpTooltip } from '../common/HelpTooltip';

interface RegistrationListProps {
  registrations: RegistrationWithDetails[];
  seasons: SeasonWithDetails[];
  onOpenNewRegistration: () => void;
  onOpenWorkspace?: (registrationId: number) => void;
  onUpdateStatus: (regId: number, status: RegistrationStatus) => void;
  onRefreshRegistrations?: () => void;
}

export function RegistrationList({
  registrations,
  seasons,
  onOpenNewRegistration,
  onOpenWorkspace,
  onUpdateStatus,
  onRefreshRegistrations,
}: RegistrationListProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [selectedFinancialReg, setSelectedFinancialReg] = useState<RegistrationWithDetails | null>(null);

  const filteredData = useMemo(() => {
    return registrations.filter((r) => {
      if (seasonFilter !== 'all' && r.season_id !== Number(seasonFilter)) {
        return false;
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      if (!globalFilter.trim()) return true;

      const q = globalFilter.toLowerCase().trim();
      return (
        r.registration_number.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.fatherName.toLowerCase().includes(q) ||
        r.packageName.toLowerCase().includes(q) ||
        r.passportNumber.toLowerCase().includes(q)
      );
    });
  }, [registrations, globalFilter, seasonFilter, statusFilter]);

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'Confirmed':
        return <Badge variant="info">Confirmed</Badge>;
      case 'Visa Processing':
      case 'Visa Approved':
      case 'Ticket Issued':
      case 'Ready for Travel':
      case 'Completed':
        return <Badge variant="emerald">{status}</Badge>;
      case 'Cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (payStatus: string) => {
    switch (payStatus) {
      case 'Pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'Advance Received':
      case 'Partially Paid':
        return <Badge variant="gold">{payStatus}</Badge>;
      case 'Fully Paid':
        return <Badge variant="emerald">Paid in Full</Badge>;
      case 'Overpaid':
        return <Badge variant="info">Overpaid</Badge>;
      case 'Refund Pending':
      case 'Refunded':
        return <Badge variant="destructive">{payStatus}</Badge>;
      default:
        return <Badge variant="secondary">{payStatus}</Badge>;
    }
  };

  const columns = useMemo<ColumnDef<RegistrationWithDetails>[]>(
    () => [
      {
        accessorKey: 'registration_number',
        header: 'Reg No.',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div
              className="cursor-pointer hover:underline"
              onClick={() => onOpenWorkspace && onOpenWorkspace(row.registration_id)}
            >
              <span className="font-mono font-bold text-amber-900 text-xs tracking-wide">
                {String(info.getValue())}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-mono font-bold border border-stone-200">
                  {row.paxCount || 1} Pax
                </span>
                <span className="text-[10px] text-stone-400 font-mono">#{row.registration_id}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'customerName',
        header: 'Main Pilgrim / Group',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="font-bold text-stone-900 text-xs leading-tight">{row.customerName}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">S/O, D/O: {row.fatherName}</p>
            </div>
          );
        },
      },
      {
        accessorKey: 'passportNumber',
        header: 'Main Passport',
        cell: (info) => {
          const p = String(info.getValue() || '');
          return p ? (
            <Badge variant="gold" className="font-mono text-xs tracking-wider">
              {p}
            </Badge>
          ) : (
            <span className="text-xs text-stone-400 italic">No Passport</span>
          );
        },
      },
      {
        accessorKey: 'seasonLabel',
        header: 'Season & Package',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="text-xs font-semibold text-stone-800">{row.seasonLabel}</p>
              <p className="text-[11px] text-stone-500 truncate max-w-[180px] mt-0.5">{row.packageName}</p>
            </div>
          );
        },
      },
      {
        accessorKey: 'progressPercent',
        header: 'Progress',
        cell: (info) => {
          const row = info.row.original;
          const pct = row.progressPercent || 0;
          return (
            <div className="w-24 space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-stone-500">Status</span>
                <span className="font-bold text-emerald-800">{pct}%</span>
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-700 h-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'netTotal',
        header: 'Financial Summary',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="space-y-0.5">
              <p className="font-mono text-xs font-bold text-stone-900">
                Net: ₹{row.netTotal.toLocaleString('en-IN')}
              </p>
              <p className={`font-mono text-[11px] font-semibold ${row.balanceAmount > 0 ? 'text-amber-800' : row.balanceAmount < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                {row.balanceAmount > 0 ? (
                  `Due: ₹${row.balanceAmount.toLocaleString('en-IN')}`
                ) : row.balanceAmount === 0 && row.netTotal > 0 ? (
                  '✓ Paid in Full'
                ) : (
                  '₹0 charges'
                )}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Booking & Payment',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                {getBookingStatusBadge(row.status)}
                <select
                  value={row.status}
                  onChange={(e) => onUpdateStatus(row.registration_id, e.target.value as RegistrationStatus)}
                  className="h-6 rounded border border-stone-300 bg-white text-[10px] text-stone-700 px-1 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
                >
                  {REGISTRATION_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {getPaymentStatusBadge(row.payment_status || 'Pending')}
              </div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              {onOpenWorkspace && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onOpenWorkspace(row.registration_id)}
                  className="h-7 text-xs bg-emerald-800 hover:bg-emerald-900 font-semibold"
                >
                  Workspace
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedFinancialReg(row)}
                className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-50 font-semibold"
              >
                <Receipt className="h-3.5 w-3.5 mr-1 text-amber-700" />
                Ledger
              </Button>
            </div>
          );
        },
      },
    ],
    [onUpdateStatus, onOpenWorkspace]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-stone-200/80 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Search Reg #, Pilgrim Name, Passport, Package..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="h-4 w-4 text-stone-400" />
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 cursor-pointer"
            >
              <option value="all">All Seasons</option>
              {seasons.map((s) => (
                <option key={s.season_id} value={s.season_id}>
                  {s.label} ({s.year})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="h-4 w-4 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {REGISTRATION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={onOpenNewRegistration} className="w-full sm:w-auto shrink-0 bg-emerald-800 hover:bg-emerald-900">
          <Plus className="h-4 w-4 mr-2" />
          + Start New Registration
        </Button>
      </div>

      {/* Registrations Data Table */}
      <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden shadow-2xs">
        <table className="w-full text-left text-sm text-stone-800">
          <thead className="bg-stone-50/80 text-xs font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3.5">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-stone-100">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/70 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-stone-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center">
                      <FileCheck2 className="h-6 w-6 text-stone-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-800">No Pilgrim Registrations Found</p>
                      <p className="text-xs text-stone-500 mt-1 max-w-sm">
                        {globalFilter
                          ? 'No registrations match your current search query.'
                          : 'Click "+ Start New Registration" to book a pilgrim family group.'}
                      </p>
                    </div>
                    {!globalFilter && (
                      <Button onClick={onOpenNewRegistration} size="sm" className="bg-emerald-800 hover:bg-emerald-900 mt-1">
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        + Create First Registration
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Financials Ledger Modal */}
      {selectedFinancialReg && (
        <RegistrationFinancialsModal
          isOpen={!!selectedFinancialReg}
          onClose={() => setSelectedFinancialReg(null)}
          registration={selectedFinancialReg}
          onFinancialsUpdated={() => {
            if (onRefreshRegistrations) onRefreshRegistrations();
          }}
        />
      )}
    </div>
  );
}
