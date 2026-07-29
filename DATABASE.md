# DATABASE SPECIFICATION & SCHEMA DOCUMENTATION

> **Detailed Entity-Relationship Reference, DDL Specifications, & Relational Constraints**

---

## 1. Database Architecture & Dual Storage Engine

The database is built on a **Single Relational SQLite Engine**. Data across all years, seasons, packages, and bookings reside in one SQLite file (`database.db`).

- **Primary Engine**: Node SQLite (`node:sqlite`) accessing `Documents/Dayar-E-Habib Data/database.db`.
- **Browser Fallback Engine**: `WebStorageDiskStore` reading/writing to browser `localStorage` under key `dayar_e_habib_db`. Automatically seeds active seasons and 20 demo customer profiles when initialized.

---

## 2. Table Schemas & Entity Explanations

### 1. `customer` (Pilgrim Profiles)
- **Purpose**: Persists physical human beings across trips and years.
- **Primary Key**: `customer_id` (INTEGER AUTOINCREMENT)
- **Columns**: `full_name`, `father_name`, `date_of_birth`, `gender`, `nationality`, `mobile_number`, `state`, `address_line1`, `address_line2`, `area_locality`, `city`, `district`, `pin_code`, `country`, `email`, `phone_landline`, `created_at`, `updated_at`.

### 2. `customer_identity` (Passports & Identity Scans)
- **Purpose**: Tracks 10-year passport documents for customers.
- **Foreign Key**: `customer_id` ➔ `customer.customer_id`
- **Columns**: `identity_id`, `customer_id`, `passport_number`, `issue_date`, `expiry_date`, `place_of_issue`, `identity_status` (`ACTIVE`, `EXPIRED`, `REPLACED`), `created_at`.

### 3. `season_type` (Season Categories)
- **Purpose**: Categorizes operational season types (Hajj, Umrah, Ramadan Umrah).
- **Primary Key**: `season_type_id`
- **Columns**: `name`, `code` (UNIQUE: `HAJJ`, `UMR`, `RAM`), `description`, `is_active`.

### 4. `season` (Operational Years)
- **Purpose**: Represents operational years (e.g. Hajj 2026, Umrah 2026 Executive).
- **Foreign Key**: `season_type_id` ➔ `season_type.season_type_id`
- **Columns**: `season_id`, `season_type_id`, `year`, `label`, `is_active`, `created_at`, `updated_at`.

### 5. `package` (Master Package Tiers)
- **Purpose**: Defines standard package tiers offered in a season.
- **Foreign Key**: `season_id` ➔ `season.season_id`
- **Columns**: `package_id`, `season_id`, `name`, `description`, `base_price_paise` (Integer Paise).

### 6. `registration` (Group Booking Record)
- **Purpose**: Primary registration record representing enrollment in a package/season.
- **Registration Number Format**: `DH-YYYY-TYPE-SEQ` (e.g. `DH-2026-HAJ-000248`).
- **Foreign Keys**: `customer_id` ➔ `customer.customer_id`, `season_id` ➔ `season.season_id`, `package_id` ➔ `package.package_id`.
- **Immutability Snapshots**: `package_name_snapshot`, `package_price_snapshot`, `season_label_snapshot`, `season_type_code_snapshot`.

### 7. `registration_pax` (Individual Pilgrim Linkage)
- **Purpose**: Junction table linking individual pilgrims to a group Registration.
- **Foreign Keys**: `registration_id` ➔ `registration.registration_id`, `customer_id` ➔ `customer.customer_id`.
- **Columns**: `pax_id`, `registration_id`, `customer_id`, `is_primary` (1 or 0), `pax_sequence`, `relationship` (`Primary`, `Spouse`, `Child`, `Parent`, `Friend`, `Relative`), `room_preference`, `bus_assignment`, `pax_status`.

### 8. `registration_charge` (Financial Debit Line Items)
- **Purpose**: Stores itemized billing charges in integer paise.
- **Foreign Key**: `registration_id` ➔ `registration.registration_id`.
- **Columns**: `charge_id`, `registration_id`, `charge_type` (`Adult`, `ChildWithBed`, `ChildWithoutBed`, `Infant`, `Visa`, `Miscellaneous`, `Discount`), `rate_inr_paise`, `rate_usd_cents`, `exchange_rate_used`, `quantity`, `amount_paise`.

### 9. `registration_tax` (Tax Breakdown)
- **Purpose**: Itemized GST and TCS tax calculations.
- **Foreign Key**: `registration_id` ➔ `registration.registration_id`.
- **Columns**: `tax_id`, `registration_id`, `tax_type` (`CGST`, `SGST`, `IGST`, `TCS`), `rate_percent`, `amount_paise`.

### 10. `payment` (Financial Credit Receipts)
- **Purpose**: Records pilgrim payments received.
- **Foreign Key**: `registration_id` ➔ `registration.registration_id`.
- **Columns**: `payment_id`, `registration_id`, `amount_paise`, `payment_type` (`Cash`, `Cheque`, `Bank Transfer`), `cheque_number`, `bank_name`, `reference_number`, `payment_date`.

### 11. `document` & `document_version` (Document Vault)
- **Purpose**: Flat vault storing scanned passport pages, visas, and flight tickets.

### 12. `visa_operation` (Visa Batch Tracking)
- **Purpose**: Operational tracking for Saudi Ministry of Hajj & Umrah (MOFA) visa processing.
- **Foreign Keys**: `registration_id`, `pax_id`.
- **Columns**: `visa_id`, `registration_id`, `pax_id`, `visa_status` (`Pending`, `Submitted`, `Approved`, `Rejected`), `embassy_reference`, `visa_number`, `submission_date`, `approval_date`, `batch_number`.

### 13. `flight_operation` (Flight Carriers & PNRs)
- **Purpose**: Flight itinerary tracking independent of room allocations.
- **Foreign Keys**: `registration_id`, `pax_id`.
- **Columns**: `flight_op_id`, `registration_id`, `pax_id`, `airline`, `flight_number`, `pnr`, `departure_airport`, `arrival_airport`, `departure_date`, `arrival_date`, `ticket_number`.

### 14. `hotel_operation` (Hotel Allocations & Rooming Splitting)
- **Purpose**: Rooming allocations for Makkah and Madinah hotels.
- **Foreign Key**: `registration_id` ➔ `registration.registration_id`.
- **Columns**: `hotel_op_id`, `registration_id`, `city` (`Makkah` / `Madinah`), `hotel_name`, `room_type` (`Double`, `Triple`, `Quad`, `Sharing`), `room_number`, `occupancy_count`, `checkin_date`, `checkout_date`.
