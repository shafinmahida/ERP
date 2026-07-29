# PROJECT STRUCTURE & MODULE MAP

> **Complete Directory Layout & Module Explanations**

```text
c:\DayarEHabibERP/
│
├── .github/                         # GitHub Configuration & Automation
│   ├── workflows/
│   │   └── ci.yml                   # GitHub Actions CI workflow (tsc + 23 scenarios)
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml           # Bug report template
│   │   └── feature_request.yml      # Feature request template
│   └── PULL_REQUEST_TEMPLATE.md     # Standard PR checklist
│
├── docs/                            # AI Knowledge Base System & Architecture Records
│   ├── decisions/                   # Architecture Decision Records (ADRs)
│   │   ├── 0001-tauri-over-electron.md
│   │   ├── 0002-single-sqlite-database.md
│   │   └── 0003-decoupled-grouping-law.md
│   ├── AI_BOOTSTRAP.md              # Fast-start sitemap for LLM assistants
│   ├── AI_ARCHITECTURE.md           # System architecture overview
│   ├── AI_DATABASE.md               # Database schema & WebStorage fallback documentation
│   ├── AI_BUSINESS_RULES.md        # Core business constraints
│   ├── AI_REPOSITORY_MAP.md         # Full codebase symbol index
│   ├── AI_CURRENT_STATE.md          # Active sprint status
│   ├── AI_CHANGELOG.md              # AI milestone history
│   ├── AI_ROADMAP.md                # Strategic future expansion
│   ├── AI_GLOSSARY.md               # Domain terminology
│   ├── AI_DECISIONS.md              # ADR summaries formatted for AI
│   ├── AI_CODING_STANDARDS.md       # TypeScript & React coding rules
│   └── AI_EXTENSIBILITY.md          # Guidelines for adding new modules
│
├── scratch/                         # Automated Scenario Test Harnesses & UI Testing
│   ├── test_20_enterprise_scenarios.ts  # 23-Scenario Enterprise Validation Suite
│   ├── interactive_ui_test.js       # Real Edge browser UI interaction testing script
│   └── seed_20_demo_customers.ts    # Seed script for 20 realistic customer profiles
│
├── src/                             # React SPA Frontend Source Code
│   ├── App.tsx                      # Root Application Controller & Toast System
│   ├── main.tsx                     # Entry Point & React DOM Render
│   ├── index.css                    # Tailwind CSS Base & Theme Directives
│   │
│   ├── components/                  # UI Components by Feature
│   │   ├── layout/                  # AppShell, Navigation Bar, Header
│   │   ├── registrations/           # RegistrationList, Workspace, Multi-PAX Form Engine
│   │   ├── customers/               # CustomerList, CustomerFormModal
│   │   ├── operations/              # TravelOperationsView (Visa / Flight / Hotel)
│   │   ├── payments/                # Financial Ledger & Payment Modal
│   │   ├── documents/               # Document Vault & Passport Scanner Modal
│   │   ├── dashboard/               # Executive Dashboard Home
│   │   ├── settings/                # Business Settings View
│   │   ├── ui/                      # Base Reusable UI Primitives (button, card, dialog, badge)
│   │   └── common/                  # Toast & Guide Callout components
│   │
│   ├── db/                          # Database & Persistence Layer
│   │   ├── schema.ts                # Drizzle ORM Table Schemas (14 entities)
│   │   └── index.ts                 # Dual Database Driver (Node SQLite + WebStorage Store)
│   │
│   ├── services/                    # Business Logic Services
│   │   ├── registrationService.ts   # Registrations, PAX, Charges, Payments
│   │   ├── customerService.ts       # Customer Profiles & Passport Identities
│   │   ├── travelOperationsService.ts # Visa, Flight PNR, Hotel Rooming Allocations
│   │   ├── financialService.ts      # Ledger Calculations, Taxes, Overpayment Credit
│   │   ├── print/                   # Centralized Document Print Engine (printEngine.ts)
│   │   ├── auditService.ts          # System Audit Trail Logging
│   │   ├── seasonPackageService.ts  # Seasons, Season Types, Package Tier Masters
│   │   ├── dateUtils.ts             # Date Normalization & 10-Year Expiry Auto-Calculation
│   │   └── backupService.ts         # Portable Archive Backup & Restore
│   │
│   └── theme/                       # Global Design System
│       └── tokens.ts                # Design Bible Tokens (Gold #856936, Spacing scale p-8)
│
├── src-tauri/                       # Native Tauri Desktop Shell
│   ├── Cargo.toml                   # Rust dependency manifest
│   ├── tauri.conf.json              # Tauri windowing & permissions config
│   └── src/                         # Rust backend main entry point
│
├── ARCHITECTURE.md                  # Comprehensive System Architecture & Modeling Law
├── BUSINESS_RULES.md                # Detailed Business Rules & Workflow Logic
├── CHANGELOG.md                     # Release Changelog (Keep a Changelog format)
├── DATABASE.md                      # Detailed Database Entity & Relational Spec
├── DECISIONS.md                     # Architectural Decision Records Summary
├── DEPLOYMENT.md                    # Tauri Build & Packaging Guide
├── DEVELOPMENT_GUIDE.md             # Developer Environment Setup & Standards
├── KNOWN_LIMITATIONS.md             # System Boundaries & Operating Constraints
├── LICENSE                          # MIT Production Software License
├── README.md                        # Primary Repository Overview & Badges
├── RELEASE_PROCESS.md               # Version Tagging & Build Release Workflow
├── ROADMAP.md                       # Product Phase Roadmap
├── SECURITY.md                      # Security Policy & Offline Isolation
├── SUPPORT.md                       # Operator Support & Troubleshooting Guide
├── TESTING.md                       # Automated Test Suite Documentation
└── VERSIONING.md                    # Semantic Versioning Policy
```
