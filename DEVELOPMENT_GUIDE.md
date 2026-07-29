# DEVELOPER GUIDE & CODING CONVENTIONS

> **Developer Setup, Standards, & Architectural Guidelines**

---

## 1. Local Development Setup

1. **Clone Repository**:
   ```bash
   git clone https://github.com/shafinmahida/ERP.git
   cd DayarEHabibERP
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## 2. Coding Standards

### TypeScript & React Guidelines
- **Strict Typing**: No explicit `any` types where interfaces can be defined.
- **Component Modularization**: Components must be placed under `src/components/<feature>/`.
- **Design Tokens**: Do not use ad-hoc hex colors. Always reference global tokens from [tokens.ts](file:///c:/DayarEHabibERP/src/theme/tokens.ts).
- **Documentation Preservation**: Preserve existing docstrings and inline comments when editing existing services.

### Database Query Guidelines
- Database interactions must pass through service abstractions (`registrationService.ts`, `customerService.ts`, `travelOperationsService.ts`).
- Always support dual execution (Node SQLite driver for Tauri desktop, `WebStorageDiskStore` for browser mode).

---

## 3. Test Driven Scenario Verifications

When introducing new operational fields or workflow steps:
1. Add an explicit test scenario to [scratch/test_20_enterprise_scenarios.ts](file:///c:/DayarEHabibERP/scratch/test_20_enterprise_scenarios.ts).
2. Execute `npx tsx scratch/test_20_enterprise_scenarios.ts` to confirm 100% scenario passing.
