# 🕋 Dayar-E-Habib ERP — Master Project Context & Repository OS

> **Notice for AI Assistants**: This repository contains the complete source code, database architecture, business logic rules, and design guidelines for **Dayar-E-Habib ERP** (Hajj & Umrah Tour Management System). ALWAYS inspect `PROJECT_CONTEXT.md` first before making any changes.

---

## 1. System Overview & Architecture

Dayar-E-Habib ERP is a production-grade desktop enterprise resource planning application built specifically for Hajj & Umrah tour operators. It handles customer passport vault management, operational season creation, package pricing, multi-pilgrim family registrations, two-way flight itinerary tracking, multi-room hotel accommodation splitting, and financial ledger accounting with GST invoice generation.

### Architecture Stack:
- **UI & Frontend**: React 19 + TypeScript + TailwindCSS v4 + Radix UI Primitives + Lucide Icons.
- **Desktop Runtime**: Tauri v2 (Rust desktop wrapper with native windowing & filesystem access).
- **Database & Persistence**: Embedded SQLite database (`node:sqlite` in Node/Electron/Tauri) with Drizzle ORM schema and auto-migration engine.
- **Data Location**: `%USERPROFILE%\Documents\Dayar-E-Habib Data\database.db` (automatically created and migrated on startup).
- **Document & Print Engine**: In-memory HTML/CSS print generator (A4 Booking Forms & GST Tax Invoices), jsPDF, and JSZip.

---

## 2. File & Directory Source of Truth

```
DayarEHabibERP/
├── src/                          # [SOURCE OF TRUTH] React + TS Application Source Code
│   ├── components/               # UI Workspaces & Screen Components
│   │   ├── registrations/        # Registration Workspace, Multi-Pax Form, Flight/Hotel Cards
│   │   ├── customers/            # Customer Management & Passport Vault Modals
│   │   ├── settings/             # Season Type Master & System Settings
│   │   └── ui/                   # Reusable UI Primitives (SmartDateInput, Dialog, etc.)
│   ├── services/                 # Business Logic Services & Database Access
│   │   ├── registrationService.ts # Multi-PAX Booking & Passport Persistence Engine
│   │   ├── customerService.ts     # Customer Identity & Duplicate Detection
│   │   ├── seasonPackageService.ts# Season & Package Management Engine
│   │   ├── seasonTypeService.ts   # Season Type Master Management
│   │   ├── print/                # Printable A4 Booking Form & Invoice Generators
│   │   └── dateUtils.ts           # Indian Date Utilities (DD-MM-YYYY & 10-Yr Expiry Calc)
│   ├── db/                       # Database Initialization & Schema
│   │   ├── index.ts               # SQLite Connection Pool & Auto-Migration Engine
│   │   └── schema.ts              # Drizzle ORM Schema Definitions
│   ├── App.tsx                   # Main Shell & Navigation
│   └── index.css                 # Global Tailwind v4 Theme Tokens (Light Executive Theme)
├── src-tauri/                    # [SOURCE OF TRUTH] Tauri v2 Rust Configuration
│   ├── Cargo.toml                # Rust Dependencies
│   ├── tauri.conf.json           # Tauri Desktop Window & Permission Config
│   └── src/main.rs               # Rust Desktop Application Entrypoint
├── drizzle/                      # [SOURCE OF TRUTH] Database Migrations & SQL Schemas
├── package.json                  # Dependencies & Script Definitions
├── package-lock.json             # Locked Dependency Tree
├── tsconfig.json                 # TypeScript Configuration
├── vite.config.ts                # Vite Bundler & Tailwind Plugin Setup
└── PROJECT_CONTEXT.md            # [CONTEXT OS] AI Session Memory & Architecture Spec
```

### Recreatable / Generated Files (Safe to Ignore):
- `node_modules/` (regenerated via `npm install`)
- `dist/` (regenerated via `npm run build`)
- `src-tauri/target/` (regenerated via `cargo build`)
- `%USERPROFILE%\Documents\Dayar-E-Habib Data\database.db` (auto-created on app startup)

---

## 3. Core Data Schemas & Relationships

1. **`season_type`**: Master category (e.g. `HAJJ`, `UMRAH`, `RAMADAN`).
2. **`season`**: Operational year (e.g. `Hajj 2026`, `Umrah 1447H`), linked to `season_type_id`.
3. **`package`**: Tour package pricing and hotels, linked to `season_id`.
4. **`customer`**: Individual profile (`full_name`, `father_name`, `date_of_birth`, `gender`, `mobile_number`, `state`).
5. **`customer_identity`**: Passport details (`passport_number`, `issue_date`, `expiry_date`, `place_of_issue`, `identity_status`), linked to `customer_id`.
6. **`registration`**: Booking transaction record (`registration_number`, `season_id`, `package_id`, `status`, `booking_date`), linked to Primary Customer.
7. **`registration_pax`**: Pilgrim list mapping family members (`relationship`, `pax_order`) to `registration_id` and `customer_id`.
8. **`financial_ledger`**: Payment transactions and package price adjustments.

---

## 4. Key Business Logic Rules & Design Standards

### UI & Styling Guidelines:
- **Executive Light Theme**: Clean light background (`bg-slate-100` window, `bg-white` card containers, `border-slate-200`, `shadow-xs`). Indigo primary accents (`#4f46e5`), emerald success chips (`#059669`), and crisp dark typography (`text-slate-900`).
- **Bracket Operator Guidance**: All form labels must include explicit guidance text in brackets `(e.g., As written on Passport)` to ensure effortless operator navigation.
- **Date Format Handling**: Plain text input with `SmartDateInput` component displaying Indian `DD-MM-YYYY` format while storing ISO `YYYY-MM-DD` internally.
- **Passport Expiry Auto-Calculation**: Default 10 years minus 1 day from Issue Date (`suggestPassportExpiryDate`).

### Multi-PAX & Passport Integrity:
- **Non-Truncated PAX Names**: Inputs use `md:col-span-2` with browser `title` tooltips and a top **Verified Customer Profile Summary Banner**.
- **Smart Child & Gender Logic**: Separate `+ Add Son (Child)` and `+ Add Daughter (Child)` action buttons. Automatically calculates gender and birth order (`1st Born`, `2nd Born`, `3rd Born`).
- **Identity Fallback**: `getRegistrationPaxList` checks both `'ACTIVE'` and historical `customer_identity` rows. `updateRegistrationWithPax` updates existing identity rows on save so passport data is **never lost or set to N/A**.
- **Two-Way Flight Itinerary**: Supports Outbound (India $\rightarrow$ Saudi) and Return (Saudi $\rightarrow$ India) flights, PNR tracking badges (`PNR Ticketed ✓` / `⏳ PNR Pending`), and group PNRs.
- **Multi-Room Accommodation**: Room sharing dropdowns (`Double`, `Triple`, `Quad`, `Quint`, `Suite`), room number assignment, and check-in/out date controls for Makkah and Madinah hotels.

---

## 5. Verification Commands

```bash
# 1. Check TypeScript Compilation (0 errors required)
npx tsc --noEmit

# 2. Run Registration Engine Automated Test Suite
npx tsx scratch/test_registration_engine_sprint4.ts

# 3. Production Vite Bundle Build
npx vite build

# 4. Start Local Development Server
npm run dev

# 5. Launch Tauri Desktop Application
npx tauri dev
```

---

## 6. Current Development Status

- **Sprint 1 - 3**: Database schema, Drizzle migration engine, customer vault, season type master, package creation, and financial ledger. (COMPLETE)
- **Sprint 4**: Executive Light Theme overhaul, multi-PAX relationship engine, passport save integrity, two-way flight cards, multi-room accommodation, and printable document engine. (COMPLETE & TEST VERIFIED)
- **Sprint 5 (Next)**: Advanced reporting analytics, bulk passport OCR scanning, and database backup/restore enhancements.
