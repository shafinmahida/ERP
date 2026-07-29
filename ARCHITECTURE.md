# DAYAR-E-HABIB ERP — ARCHITECTURE & DATA MODEL SPECIFICATION

> **Single Source of Truth for System Architecture, Relational Data Modeling, & Design Principles**

---

## 1. Core Data Modeling Principle (The Non-Negotiable Law)

The single most important architectural rule in this codebase:

> **Who registers together (Booking), who rooms together (Room), and who flies together (Flight) are three separate groupings — never conflate them.**

```
+-------------------------------------------------------------------------+
|                              CUSTOMER                                   |
| (Persistent Individual Person, Identity Passports/Visas attach here)     |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                              BOOKING                                    |
| (Commercial Registration Unit: Individual / Couple / Family / Friends)  |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                            REGISTRATION                                 |
|   (One PAX Enrollment in One Trip / Package / Season: DH-2026-HAJ-000248) |
+-------------------------------------------------------------------------+
       |                                                 |
       v                                                 v
+-----------------------------+           +-------------------------------+
|     HOTEL / ROOM ALLOCATION |           |   FLIGHT / PNR ALLOCATION     |
|  (Room + RoomOccupant)      |           | (FlightBooking + FlightPax)   |
|  Independent room grouping  |           | Independent flight grouping   |
+-----------------------------+           +-------------------------------+
```

### Entity Responsibilities:
1. **`Customer`**: Represents a physical human being. Persists across years and multiple trips. Passports and identity documents attach to the Customer, not to a single Registration, allowing pilgrims to reuse stored identity records for future Hajj/Umrah packages.
2. **`Booking`**: The commercial unit a group registers under (e.g. an individual, a couple, a family of 7, a group of friends). A Booking contains one or more Registrations.
3. **`Registration`**: One pilgrim's enrollment in a specific Hajj/Umrah season and package. Holds human-friendly registration numbers (e.g. `DH-2026-HAJ-000248`) and immutable financial snapshots.
4. **`Room` + `RoomOccupant` (Junction Entity)**: Hotel rooms are independent entities. Any subset of a Booking's Registrations can be assigned to any Room in any split (e.g. a family of 7 splitting into a Triple Room + a Quad Room).
5. **`FlightBooking` + `FlightPax` (Junction Entity)**: Airline seats and PNRs are independent entities. Any subset of pilgrims can share a flight itinerary, ticket number, and PNR, independent of Booking or Room groupings.

---

## 2. Locked Architectural Choices

1. **100% Offline Desktop Environment**:
   - Tauri (Rust-based native shell) hosting a React SPA.
   - Zero network API dependencies, cloud databases, or external microservices.
   - Built-in portable backup and restore engine (.json / .zip export archives).

2. **Single Relational SQLite Database**:
   - All years, seasons, packages, customers, and registrations reside in a single SQLite database (`database.db`).
   - Data is **never** physically split into per-year or per-package database files.

3. **Human-Friendly Registration Numbering**:
   - Format: `DH-YYYY-TYPE-SEQ` (e.g., `DH-2026-HAJ-000248`).
   - Managed via a sequence engine guaranteeing zero gaps and multi-operator uniqueness.

4. **Immutable Snapshots**:
   - Package names, package base prices, season labels, and season type codes are snapshot-copied onto the `registration` record at the moment of booking creation.
   - Future changes to master package rates never alter historic registration billing records.

5. **Centralized Print Engine**:
   - All booking forms, GST tax invoices, receipts, pilgrim ID cards, barcode stickers, and embarkation forms render through a single unified HTML print renderer ([printEngine.ts](file:///c:/DayarEHabibERP/src/services/print/printEngine.ts)).

6. **Offline MRZ OCR Parsing**:
   - Passport Machine Readable Zone (MRZ) parsing runs strictly client-side using Tesseract.js with bundled offline language data (`eng.traineddata`).

7. **System Audit Trail**:
   - Every create, update, status change, or deletion is logged in `audit_log` with timestamp, entity type, entity ID, action, old value, and new value.

---

## 3. High-Level System Architecture

```
+-------------------------------------------------------------------------+
|                        TAURI NATIVE DESKTOP SHELL                       |
|   - Windows Native Windowing                                            |
|   - Local File System Access                                            |
|   - Native Desktop Dialogs & Printing Hooks                             |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                          REACT 19 FRONTEND SPA                          |
|   - AppShell & Navigation Sidebar (The Context Rule)                   |
|   - Registration Workspace & Multi-PAX Form Engine                      |
|   - Travel Operations View (Visa / Flight / Hotel Allocations)          |
|   - Design System Tokens (The ERP Design Bible)                         |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                           SERVICE LAYER                                 |
|   - registrationService.ts    - customerService.ts                      |
|   - travelOperationsService.ts - financialService.ts                    |
|   - printEngine.ts            - auditService.ts                         |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  DATABASE & DUAL PERSISTENCE LAYER                      |
|   - Node SQLite Driver (file: database.db)                              |
|   - WebStorage Store Fallback (localStorage)                            |
|   - Drizzle ORM Schema & DDL Migrations                                 |
+-------------------------------------------------------------------------+
```

---

## 4. Architectural Decision Records (ADRs)

Key technical decisions are documented as numbered ADRs in **[docs/decisions/](file:///c:/DayarEHabibERP/docs/decisions/)**:
- **ADR-0001**: Choice of Tauri Native Shell over Electron.
- **ADR-0002**: Choice of Single Relational SQLite Database.
- **ADR-0003**: Decoupled Registration, Room, and Flight Grouping Models.
- **ADR-0004**: Offline-Only Tesseract MRZ Passport OCR Engine.
- **ADR-0005**: Human-Friendly Registration Numbering Scheme.
- **ADR-0006**: Centralized Unified Document Print Engine.
- **ADR-0007**: The Calm ERP Design Bible & Tokens System.
