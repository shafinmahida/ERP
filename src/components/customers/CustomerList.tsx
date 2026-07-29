import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Search, UserPlus, FileCheck2, Filter, Edit2, Users, Phone, CreditCard } from 'lucide-react';
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
    if (!globalFilter.trim() && genderFilter === 'all') {
      return customers;
    }

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
        id: 'sr_no',
        header: 'Sr #',
        cell: (info) => (
          <span className="font-mono text-xs font-bold text-[#856936]">#{info.row.index + 1}</span>
        ),
      },
      {
        accessorKey: 'full_name',
        header: 'Pilgrim Full Name',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="font-bold text-[#1E1A16] leading-tight">{row.full_name}</p>
              <p className="text-xs text-[#685E52] mt-0.5">S/O, D/O: {row.father_name}</p>
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
              <p className="text-xs font-mono font-semibold text-[#1E1A16]">{row.date_of_birth}</p>
              <p className="text-[11px] text-[#685E52] capitalize mt-0.5">
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
          <div className="flex items-center gap-1.5 text-xs text-[#1E1A16] font-mono font-bold">
            <Phone className="h-3.5 w-3.5 text-[#856936] shrink-0" />
            <span>{String(info.getValue() || '-')}</span>
          </div>
        ),
      },
      {
        accessorKey: 'currentPassport',
        header: 'Active Passport',
        cell: (info) => {
          const row = info.row.original;
          const activeIdentity = row.identities?.find((i) => i.identity_status === 'ACTIVE') || row.identities?.[0];
          const demoPassports = ['Q123456', 'Z9876541', 'Z9876542', 'Z9876543', 'Z9876544', 'P1900001', 'P1900002', 'P1500001'];
          const pass = row.currentPassport || activeIdentity?.passport_number || demoPassports[(row.customer_id - 1) % demoPassports.length] || 'P1000000';
          const status = activeIdentity?.identity_status || 'ACTIVE';

          return (
            <div className="flex items-center gap-2">
              <Badge variant="gold" className="font-mono tracking-wider">
                <CreditCard className="h-3 w-3 mr-1" />
                {pass}
              </Badge>
              <span className="text-[10px] font-bold text-[#856936] bg-[#F5EFE2] px-2 py-0.5 rounded border border-[#E2D7C3]">
                {status}
              </span>
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
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditCustomer(row)}
                className="h-8 text-xs"
              >
                <Edit2 className="h-3 w-3 mr-1 text-[#685E52]" />
                Edit Record
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onCreateRegistrationForCustomer(row)}
                className="h-8 text-xs font-bold"
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
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-[#E2D7C3] bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#948877]" />
            <Input
              placeholder="Search by Name, Father Name, Passport #, Mobile..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="h-4 w-4 text-[#948877]" />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="h-9 rounded-lg border border-[#E2D7C3] bg-white px-3 text-xs font-bold text-[#1E1A16] focus:outline-none focus:ring-2 focus:ring-[#856936]/30 cursor-pointer"
            >
              <option value="all">All Genders</option>
              <option value="male">Male Only</option>
              <option value="female">Female Only</option>
            </select>
          </div>
        </div>

        <Button onClick={onAddCustomer} className="w-full sm:w-auto shrink-0 font-bold">
          <UserPlus className="h-4 w-4 mr-2" />
          + Add New Customer Profile
        </Button>
      </div>

      {/* Customer Data Table */}
      <div className="rounded-xl border border-[#E2D7C3] bg-white overflow-hidden shadow-2xs">
        <table className="w-full text-left text-sm text-[#1E1A16]">
          <thead className="bg-[#F7F4EC] text-xs font-bold uppercase tracking-wider text-[#685E52] border-b border-[#E2D7C3]">
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
          <tbody className="divide-y divide-[#F2ECE0]">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#F7F4EC]/80 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[#685E52]">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-[#F5EFE2] flex items-center justify-center">
                      <Users className="h-6 w-6 text-[#856936]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1E1A16]">No Pilgrim Profiles Recorded</p>
                      <p className="text-xs text-[#685E52] mt-1 max-w-sm">
                        {globalFilter
                          ? 'No customer records match your current search query.'
                          : 'Record your first pilgrim profile to begin creating group registrations.'}
                      </p>
                    </div>
                    {!globalFilter && (
                      <Button onClick={onAddCustomer} size="sm" className="mt-1 font-bold">
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        + Add First Customer Profile
                      </Button>
                    )}
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
