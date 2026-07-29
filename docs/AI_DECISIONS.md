# AI DECISIONS — ADR SUMMARY MATRIX

- **ADR-0001 (Tauri over Electron)**: Tauri v2 selected for low RAM footprint (< 40MB) and native Windows performance.
- **ADR-0002 (Single SQLite DB)**: All years and packages in one `database.db` file. Never split by year.
- **ADR-0003 (The Decoupling Law)**: `Booking`, `Room` + `RoomOccupant`, and `FlightBooking` + `FlightPax` are separate junction tables.
- **ADR-0004 (Offline MRZ OCR)**: Tesseract.js client-side OCR parsing with offline language packs.
- **ADR-0005 (Registration Numbering)**: Human-friendly format `DH-YYYY-TYPE-SEQ` (e.g. `DH-2026-HAJ-000248`).
- **ADR-0006 (Centralized Print Engine)**: Unified HTML renderer in `printEngine.ts`.
- **ADR-0007 (The Calm ERP Design Bible)**: Global design tokens in `src/theme/tokens.ts`.
