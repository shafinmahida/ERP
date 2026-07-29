# ARCHITECTURAL DECISION RECORDS (ADRs) SUMMARY

Summary of locked design choices documented in detail in **[docs/decisions/](file:///c:/DayarEHabibERP/docs/decisions/)**:

1. **ADR-0001: Tauri Shell over Electron**
   - **Decision**: Use Tauri v2 (Rust desktop wrapper).
   - **Rationale**: Minimal RAM footprint (< 40MB vs > 200MB in Electron), native Windows performance, smaller installer size (< 15MB).

2. **ADR-0002: Single Relational SQLite Database**
   - **Decision**: Single SQLite file (`database.db`) for all years, packages, and bookings.
   - **Rationale**: Eliminates complex cross-file queries, enables instant multi-year pilgrim history lookup, simplifies single-file backup/restore.

3. **ADR-0003: Decoupled Grouping Law**
   - **Decision**: `Booking`, `Room` + `RoomOccupant`, and `FlightBooking` + `FlightPax` are independent entities.
   - **Rationale**: Prevents data corruption when large family bookings (e.g. 7 PAX) split into separate hotel rooms or take staggered flights.

4. **ADR-0004: Offline-Only Tesseract MRZ OCR Engine**
   - **Decision**: Client-side Tesseract.js using bundled language files.
   - **Rationale**: Strict 100% offline constraint guarantees pilgrim passport data never leaves the local machine.

5. **ADR-0005: Human-Friendly Registration Numbering**
   - **Decision**: `DH-YYYY-TYPE-SEQ` (e.g., `DH-2026-HAJ-000248`).
   - **Rationale**: Essential for physical paper filing, phone inquiries, and quick operator lookup.

6. **ADR-0006: Centralized Unified Print Engine**
   - **Decision**: Route all document printing through a single HTML renderer (`printEngine.ts`).
   - **Rationale**: Guarantees visual consistency across A4 Booking Forms, GST Invoices, ID Cards, and Receipts.

7. **ADR-0007: The Calm ERP Design Bible & Tokens System**
   - **Decision**: Executive Gold (`#856936`) theme with explicit tokens in `tokens.ts`.
   - **Rationale**: Enforces visual consistency, high readability, and standard `p-8` spacing across all workspace views.
