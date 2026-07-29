# AI EXTENSIBILITY & GUIDELINES FOR NEW MODULES

When adding a new module or feature to Dayar-E-Habib ERP:

1. **Schema Layer**: Define new tables or junction entities in [src/db/schema.ts](file:///c:/DayarEHabibERP/src/db/schema.ts). Update DDL statements in `initDdl()` inside [src/db/index.ts](file:///c:/DayarEHabibERP/src/db/index.ts).
2. **Service Layer**: Create a dedicated service under `src/services/` (e.g. `expenseService.ts`). Ensure queries pass through `getRawDb()`.
3. **UI Components**: Create subfolder under `src/components/<module>/`.
4. **AppShell Integration**: Add tab to `ActiveTab` type in [AppShell.tsx](file:///c:/DayarEHabibERP/src/components/layout/AppShell.tsx) and render in [App.tsx](file:///c:/DayarEHabibERP/src/App.tsx).
5. **Testing**: Add validation scenario to [scratch/test_20_enterprise_scenarios.ts](file:///c:/DayarEHabibERP/scratch/test_20_enterprise_scenarios.ts).
6. **Documentation**: Record changes in `CHANGELOG.md`, `ARCHITECTURE.md`, and `docs/AI_CURRENT_STATE.md`.
