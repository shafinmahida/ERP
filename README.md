# DAYAR-E-HABIB ERP
> **Enterprise Offline Haj & Umrah Pilgrim Management System**

[![CI Build & Test](https://github.com/shafinmahida/ERP/actions/workflows/ci.yml/badge.svg)](https://github.com/shafinmahida/ERP/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](file:///c:/DayarEHabibERP/CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](file:///c:/DayarEHabibERP/LICENSE)
[![Offline First](https://img.shields.io/badge/mode-100%25%20Offline-gold.svg)](file:///c:/DayarEHabibERP/ARCHITECTURE.md)

---

## Executive Overview

**Dayar-E-Habib ERP** is a full offline desktop application built for Dayar-e-Habib (Serving Pilgrims Since 1986). It manages pilgrim directories, Hajj/Umrah registrations, multi-PAX family bookings, flight itineraries, hotel rooming allocations, visa batch operations, financial ledgers, and document vault printing.

### Core Philosophy: "Calm ERP"
- **5-Second Rule**: Operators must be able to complete any core operation in < 5 seconds.
- **Empty Desk Rule**: Default views present only clean, actionable data without clutter.
- **Context Rule**: The active registration number (`DH-2026-HAJ-000248`) remains visible and persistent across all tabs.

---

## Non-Negotiable Architectural Constraints

1. **100% Offline Single-Machine Execution**: No cloud sync, no multi-device concurrency, no external API dependencies.
2. **Single Relational SQLite Database**: All years, seasons, packages, and bookings reside in one SQLite file (`database.db`) — data is **never** physically split per year.
3. **Decoupled Data Modeling Law**: 
   > **Who registers together (Booking), who rooms together (Room), and who flies together (Flight) are three separate groupings — never conflate them.**
4. **Human-Friendly Registration Numbers**: Standard format `DH-YYYY-TYPE-SEQ` (e.g. `DH-2026-HAJ-000248`).
5. **Centralized Print Engine**: All booking forms, receipts, ID cards, labels, and tax invoices route through a unified print renderer.
6. **Offline MRZ OCR**: Passport identity extraction performed strictly via local Tesseract OCR (`eng.traineddata`).

---

## Technical Stack

- **Desktop Shell**: [Tauri v2](https://tauri.app/) (Windows-first native Rust shell)
- **Frontend SPA**: React 19 + TypeScript + Vite + TailwindCSS
- **Database Engine**: SQLite 3 + Drizzle ORM
- **Document Engine**: Custom HTML-to-A4 Print Engine + jsPDF
- **OCR Engine**: Tesseract.js (Offline Mode)

---

## Local Development & Setup

### Prerequisites
- Node.js v20.x or higher
- Rust (for Tauri desktop builds)

### Installation
```bash
# Clone the repository
git clone https://github.com/shafinmahida/ERP.git
cd DayarEHabibERP

# Install NPM dependencies
npm install

# Run Vite dev server in web browser mode
npm run dev

# Run TypeScript type check
npm run type-check

# Run 23-Scenario Enterprise Validation Suite
npm run test-foundation
```

### Desktop Application Build (Tauri)
```bash
# Run Tauri desktop app in dev mode
npx tauri dev

# Build production Windows executable installer (.msi / .exe)
npx tauri build
```

---

## Directory Structure Overview

```text
DayarEHabibERP/
├── .github/              # GitHub Actions CI & Issue/PR templates
├── docs/                 # Dedicated AI Knowledge Base & Architectural Decision Records
│   ├── decisions/        # Architecture Decision Records (ADRs)
│   ├── AI_BOOTSTRAP.md   # AI assistant sitemap & prompt context
│   ├── AI_ARCHITECTURE.md # Enterprise system architecture
│   └── ...               # Complete AI reference docs
├── scratch/              # Automated enterprise scenario suites & browser UI test harnesses
├── src/                  # React Application Source Code
│   ├── components/       # UI Components (layout, registrations, customers, operations, ui)
│   ├── db/               # SQLite Database schema, DDL migrations, & WebStorage fallback
│   ├── services/         # Business logic services (registration, customer, flight, hotel, print)
│   └── theme/            # Global Design System tokens & elevation layers
└── src-tauri/            # Rust native Tauri desktop shell configuration
```

---

## Core Documentation Sitemap

- **[ARCHITECTURE.md](file:///c:/DayarEHabibERP/ARCHITECTURE.md)**: Full system data model, junction tables, and locked choices.
- **[DATABASE.md](file:///c:/DayarEHabibERP/DATABASE.md)**: Database schema, 14 tables, foreign keys, indexes, and normalization rules.
- **[BUSINESS_RULES.md](file:///c:/DayarEHabibERP/BUSINESS_RULES.md)**: Detailed business workflows for Registrations, PAX, Visas, Flights, and Financials.
- **[DEVELOPMENT_GUIDE.md](file:///c:/DayarEHabibERP/DEVELOPMENT_GUIDE.md)**: Developer setup, coding standards, and branch strategy.
- **[AI Knowledge Base](file:///c:/DayarEHabibERP/docs/AI_BOOTSTRAP.md)**: Dedicated AI Assistant navigation sitemap.

---

## License & Copyright

Copyright © 1986–2026 Dayar-E-Habib Haj/Umrah Management. Licensed under the [MIT License](file:///c:/DayarEHabibERP/LICENSE).
