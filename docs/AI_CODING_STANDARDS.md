# AI CODING STANDARDS & RULES

1. **TypeScript Rules**:
   - Zero compilation errors (`npx tsc --noEmit`).
   - Strict typing — define explicit interfaces for services, schemas, and components.
2. **React Components**:
   - Store feature components under `src/components/<feature>/`.
   - Never hardcode color hexes — reference `tokens.colors` from `src/theme/tokens.ts`.
3. **Database Queries**:
   - Use `getRawDb()` service abstraction.
   - Always support both Node SQLite and WebStorage fallback stores.
4. **Documentation**:
   - Preserve existing docstrings and inline comments.
   - Update `CHANGELOG.md` and `ARCHITECTURE.md` whenever adding new features or schema changes.
