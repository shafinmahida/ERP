import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Search, Filter, Plus, Calendar, FileCheck2 } from 'lucide-react';
import { RegistrationWithDetails, RegistrationStatus, REGISTRATION_STATUSES } from '../../services/registrationService';
import { SeasonWithDetails } from '../../services/seasonPackageService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/card';

interface RegistrationListProps {
  registrations: RegistrationWithDetails[];
  seasons: SeasonWithDetails[];
  onOpenNewRegistration: () => void;
  onUpdateStatus: (regId: number, status: RegistrationStatus) => void;
}

export function RegistrationList({
  registrations,
  seasons,
  onOpenNewRegistration,
  onUpdateStatus,
}: RegistrationListProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'Confirmed':
        return <Badge variant="default">Confirmed</Badge>;
      case 'Payment Pending':
      case 'Partially Paid':
        return <Badge variant="gold">{status}</Badge>;
      case 'Fully Paid':
      case 'Visa Processing':
      case 'Visa Approved':
      case 'Ticket Issued':
      case 'Ready for Travel':
      case 'Completed':
        return <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">{status}</Badge>;
      case 'Cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns = useMemo<ColumnDef<RegistrationWithDetails>[]>(
    () => [
      {
        accessorKey: 'registration_number',
        header: 'Registration No. (6-Digit Seq)',
        cell: (info) => (
          <div>
            <span className="font-mono font-bold text-amber-400 text-xs tracking-wide">
              {String(info.getValue())}
            </span>
            <p className="text-[10px] text-slate-500 font-mono">ID: #{info.row.original.registration_id}</p>
          </div>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Pilgrim / Customer',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="font-semibold text-slate-100 text-xs">{row.customerName}</p>
              <p className="text-[11px] text-slate-400">S/O, D/O: {row.fatherName}</p>
            </div>
          );
        },
      },
      {
        accessorKey: 'passportNumber',
        header: 'Passport',
        cell: (info) => {
          const p = String(info.getValue() || '');
          return p ? (
            <span className="font-mono text-xs text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
              {p}
            </span>
          ) : (
            <span className="text-xs text-slate-500 italic">No Passport</span>
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
              <p className="text-xs font-medium text-slate-200">{row.seasonLabel}</p>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{row.packageName}</p>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Registration Status',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              {getStatusBadge(row.status)}
              <select
                value={row.status}
                onChange={(e) => onUpdateStatus(row.registration_id, e.target.value as RegistrationStatus)}
                className="h-7 rounded border border-slate-800 bg-slate-950 text-[11px] text-slate-300 px-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {REGISTRATION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created On',
        cell: (info) => {
          const dateStr = String(info.getValue() || '');
          return <span className="font-mono text-xs text-slate-400">{dateStr.slice(0, 10)}</span>;
        },
      },
    ],
    [onUpdateStatus]
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
      {/* Top Filter & Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Reg #, Pilgrim Name, Father Name, Package..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Seasons</option>
              {seasons.map((s) => (
                <option key={s.season_id} value={s.season_id}>
                  {s.label} ({s.year})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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

        <Button onClick={onOpenNewRegistration} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          + New Registration
        </Button>
      </div>

      {/* Registrations Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
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
          <tbody className="divide-y divide-slate-800/60">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileCheck2 className="h-8 w-8 text-slate-600" />
                    <p className="text-sm font-semibold text-slate-300">No Registrations Found</p>
                    <p className="text-xs text-slate-500">
                      {globalFilter ? 'Try clearing your search query' : 'Click "+ New Registration" to register a customer'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
