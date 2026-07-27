import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Search, UserPlus, FileCheck2, Filter, Edit2, ShieldAlert, Phone, CreditCard } from 'lucide-react';
import { CustomerWithIdentity } from '../../services/customerService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/card';

interface CustomerListProps {
  customers: CustomerWithIdentity[];
  onAddCustomer: () => void;
  onEditCustomer: (cust: CustomerWithIdentity) => void;
  onCreateRegistrationForCustomer: (cust: CustomerWithIdentity) => void;
}

export function CustomerList({
  customers,
  onAddCustomer,
  onEditCustomer,
  onCreateRegistrationForCustomer,
}: CustomerListProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');

  const filteredData = useMemo(() => {
    return customers.filter((c) => {
      if (genderFilter !== 'all' && c.gender.toLowerCase() !== genderFilter.toLowerCase()) {
        return false;
      }
      if (!globalFilter.trim()) return true;

      const q = globalFilter.toLowerCase().trim();
      const passportStr = (c.currentPassport || '').toLowerCase();
      const nameStr = c.full_name.toLowerCase();
      const fatherStr = c.father_name.toLowerCase();
      const mobileStr = c.mobile_number.toLowerCase();

      return (
        nameStr.includes(q) ||
        fatherStr.includes(q) ||
        passportStr.includes(q) ||
        mobileStr.includes(q)
      );
    });
  }, [customers, globalFilter, genderFilter]);

  const columns = useMemo<ColumnDef<CustomerWithIdentity>[]>(
    () => [
      {
        accessorKey: 'customer_id',
        header: 'ID',
        cell: (info) => (
          <span className="font-mono text-xs text-slate-400">#{String(info.getValue()).padStart(4, '0')}</span>
        ),
      },
      {
        accessorKey: 'full_name',
        header: 'Customer / Pilgrim Name',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="font-semibold text-slate-100">{row.full_name}</p>
              <p className="text-xs text-slate-400">S/O, D/O: {row.father_name}</p>
            </div>
          );
        },
      },
      {
        accessorKey: 'date_of_birth',
        header: 'DOB & Gender',
        cell: (info) => {
          const row = info.row.original;
          const dobDate = new Date(row.date_of_birth);
          const age = isNaN(dobDate.getTime()) ? '-' : new Date().getFullYear() - dobDate.getFullYear();
          return (
            <div>
              <p className="text-xs font-mono text-slate-200">{row.date_of_birth}</p>
              <p className="text-[11px] text-slate-400 capitalize">
                {row.gender} • {age} yrs
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: 'mobile_number',
        header: 'Contact Number',
        cell: (info) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
            <Phone className="h-3 w-3 text-emerald-400" />
            <span>{String(info.getValue() || '-')}</span>
          </div>
        ),
      },
      {
        accessorKey: 'currentPassport',
        header: 'Active Passport',
        cell: (info) => {
          const pass = String(info.getValue() || '');
          const row = info.row.original;
          const activeIdentity = row.identities.find((i) => i.identity_status === 'ACTIVE');
          const status = activeIdentity?.identity_status || 'NONE';

          return pass ? (
            <div className="flex items-center gap-2">
              <Badge variant="gold" className="font-mono tracking-wider">
                <CreditCard className="h-3 w-3 mr-1" />
                {pass}
              </Badge>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                {status}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">No Passport</span>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditCustomer(row)}
                className="h-8 text-xs border-slate-700 hover:bg-slate-800"
              >
                <Edit2 className="h-3 w-3 mr-1 text-slate-400" />
                Edit
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onCreateRegistrationForCustomer(row)}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                <FileCheck2 className="h-3 w-3 mr-1" />
                + Register
              </Button>
            </div>
          );
        },
      },
    ],
    [onEditCustomer, onCreateRegistrationForCustomer]
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
      {/* Top Search & Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by Name, Father Name, Passport #, Mobile..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Genders</option>
              <option value="male">Male Only</option>
              <option value="female">Female Only</option>
            </select>
          </div>
        </div>

        <Button onClick={onAddCustomer} className="bg-emerald-600 hover:bg-emerald-700">
          <UserPlus className="h-4 w-4 mr-2" />
          + Add New Customer
        </Button>
      </div>

      {/* Customer Table */}
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
                    <ShieldAlert className="h-8 w-8 text-slate-600" />
                    <p className="text-sm font-semibold text-slate-300">No Customers Found</p>
                    <p className="text-xs text-slate-500">
                      {globalFilter ? 'Try clearing your search query' : 'Click "+ Add New Customer" to record your first pilgrim'}
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
