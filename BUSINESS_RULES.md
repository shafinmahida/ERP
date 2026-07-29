# BUSINESS RULES & WORKFLOW SPECIFICATION

> **Comprehensive Rules Engine for Registrations, PAX, Financials, & Operations**

---

## 1. Registration & Group Booking Workflow

1. **Terminology**:
   - The system exclusively uses **Registration** and **New Registration**. The word "Booking" is reserved for commercial groups.
2. **Registration Number Generation**:
   - Every registration is assigned a unique human-readable registration number (e.g. `DH-2026-HAJ-000248`).
   - Registration numbers are generated via [documentSequenceService.ts](file:///c:/DayarEHabibERP/src/services/documentSequenceService.ts) and locked upon creation.
3. **Multi-PAX Family & Group Registrations**:
   - A single Registration can contain 1 to N linked PAX members (e.g., Husband + Wife, Family of 7, Group of 12).
   - Exactly **one** PAX member must be designated as the `Primary Pilgrim` (`is_primary = 1`).
   - Deleting a non-primary PAX member updates the remaining PAX sequence without breaking the primary contact link.

---

## 2. Passport & Identity Verification Rules

1. **10-Year Expiry Auto-Calculation**:
   - Standard adult Indian passports are valid for 10 Years minus 1 Day.
   - Entering an issue date of `2024-01-10` automatically suggests an expiry date of `2034-01-09`.
2. **Travel Validity Warnings**:
   - `❌ Passport has EXPIRED!`: Triggered if expiry date is prior to current date.
   - `⚠️ Passport expires in less than 6 months!`: Triggered if expiry date is within 6 months of departure.
3. **Possible-Duplicate Detection**:
   - Adding a new customer checks existing records for matching Passport Number or Mobile Number.
   - Flags possible duplicates for operator review — **never** auto-merges records.

---

## 3. Financial Ledger & Money Precision Rules

1. **Integer Paise Storage**:
   - All financial monetary amounts (`rate_inr_paise`, `amount_paise`) are stored in integer paise (`₹1,50,000.00` = `15000000` paise).
   - Prevents floating-point rounding errors across ledgers and invoices.
2. **Net Total Calculation**:
   $$\text{Net Total} = \sum (\text{Registration Charges}) + \sum (\text{Applicable Taxes})$$
3. **Balance Due & Credit Overpayment**:
   $$\text{Balance Due} = \text{Net Total} - \sum (\text{Payments Received})$$
   - If Payments > Net Total, the ledger displays `Credit Balance: ₹X (isOverpaid: true)`.
4. **Immutability Snapshots**:
   - Creating a registration snapshot-copies package rates (`package_price_snapshot`) and package names (`package_name_snapshot`).
   - Future rate increases to master package tiers do not retroactively alter existing bookings.

---

## 4. Travel Operations & Grouping Separation

1. **The Decoupled Grouping Rule**:
   - **Registrations**, **Room Allocations**, and **Flight PNRs** are independent groupings.
   - A family of 7 registered under 1 Registration Number can split across a Quad Room + a Triple Room in Makkah, while sharing 1 Flight PNR.
2. **Visa Processing Workflow**:
   - Status transitions: `Pending` ➔ `Submitted` ➔ `Approved` / `Rejected`.
   - Recording an approved MOFA number updates registration workflow progress to `Visa Approved`.
3. **Print Engine Rules**:
   - Booking Forms and Tax Invoices render in standardized A4 format.
   - Standard single-page documents adjust layout dynamically to prevent page overflow.
