# CHANGELOG — DAYAR-E-HABIB ERP

All notable changes to **Dayar-E-Habib ERP** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-07-30

### Added
- **Travel Operations Module (Sprint 2)**:
  - **Visa Operations**: Added MOFA tracking, embassy submission dates, batch assignment numbers, and approval/rejection audit logging.
  - **Flight Operations**: Added airline carrier selection (*Saudia*, *Air India Express*, *Flynas*, *SpiceJet*), Flight #, Passenger PNR Code, Sector airports (*BOM / JED*), and travel dates.
  - **Hotel Operations & Room Splitting**: Added Makkah & Madinah hotel allocations, check-in/check-out dates, room sharing types (*Quad / Triple / Double / Single*), room numbers, and room count auto-recommendations.
- **Dual Persistence Seeding Engine**:
  - Automatically seeds active Seasons (*Hajj 2026*, *Umrah 2026 Executive*), Packages (*Hajj Deluxe*, *Umrah Executive Deluxe*), and 20 realistic Pilgrim Profiles into browser `WebStorageDiskStore` (`localStorage`) on cold app launch.
- **Real Browser Automation & Testing Suite**:
  - Implemented automated Microsoft Edge UI interaction scripts (`scratch/interactive_ui_test.js`) to test the application directly as an operator.
  - Captured full suite of UI screenshot verifications (`01_browser_home_screen.png` through `07_browser_travel_operations_view.png`).

### Fixed
- **Passport Expiry Date Auto-Calculation & Parsing**:
  - Fixed `suggestPassportExpiryDate` and `normalizeDateInput` in [dateUtils.ts](file:///c:/DayarEHabibERP/src/services/dateUtils.ts) to correctly handle both `YYYY-MM-DD` and `DD-MM-YYYY` inputs. Entering `01-01-2000` now correctly calculates 10-year expiry as `31-12-2009`.
  - Added explicit badges for `❌ Passport has EXPIRED!` vs `⚠️ Passport expires in less than 6 months!`.
- **Blank Sections in Registration Workspace**:
  - Added full interactive render blocks for `Flight Itinerary` and `Hotels & Room Splitting` sections in [RegistrationWorkspace.tsx](file:///c:/DayarEHabibERP/src/components/registrations/RegistrationWorkspace.tsx).
- **Customer List Serial Numbering**:
  - Sorted customers chronologically (`ORDER BY customer_id ASC`) and rendered clean 1-indexed sequential serial numbers (`#1`, `#2`, `#3`, `#4`, `#5`, ...).
- **Single Pilgrim Registration Flow**:
  - Fixed PAX #1 initialization so registering 1 individual customer loads exactly 1 PAX card without generating extra unintended PAX cards.

---

## [1.1.0] - 2026-07-29

### Added
- **Global Design System & Design Bible (Sprint 1 Phase 3)**:
  - Created [tokens.ts](file:///c:/DayarEHabibERP/src/theme/tokens.ts) containing tokens for primary executive gold (`#856936`), background cream (`#FBF9F5`), text charcoal (`#1E1A16`), elevation shadows, interaction tokens, and explicit spacing scale (`p-8` page outer padding).
  - Published **[The Dayar-E-Habib ERP Design Bible](file:///C:/Users/Asus/.gemini/antigravity/brain/49ea212a-748c-4fee-9364-3ddd8111bb4e/erp_design_bible.md)** defining the 12-Point Definition of Done.
- **Enterprise Scenario Validation Suite**:
  - Created automated full-suite test script (`scratch/test_20_enterprise_scenarios.ts`) verifying 23 enterprise and operational scenarios.

---

## [1.0.0] - 2026-07-28

### Added
- **Core Architecture & Calm ERP Initiative**:
  - Established 100% offline desktop shell powered by Tauri and SQLite.
  - Implemented multi-PAX registration engine supporting family groups, couples, and individual pilgrims.
  - Added human-friendly registration numbers (`DH-2026-HAJ-000248`).
  - Added financial ledger engine with paise precision, GST tax calculation, payment receipts, and overpayment credit presentation.
  - Added immutable package and season snapshots on registration creation.
  - Added centralized print engine generating A4 combined booking forms and GST tax invoices.
