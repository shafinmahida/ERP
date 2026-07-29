# AI ARCHITECTURE — SYSTEM BLUEPRINT

```text
+-------------------------------------------------------------------------+
|                  DESKTOP APPLICATION (TAURI V2 + RUST)                  |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                    FRONTEND SPA (REACT 19 + TAILWIND)                   |
|   - Design System Tokens: `src/theme/tokens.ts`                         |
|   - Workspace & Multi-PAX Form Engine                                   |
|   - Travel Operations & Rooming Allocations                             |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                 PERSISTENCE LAYER (SQLITE + DRIZZLE ORM)                |
|   - Desktop Node SQLite Driver (`database.db`)                          |
|   - Browser WebStorage Fallback Store (`localStorage`)                  |
+-------------------------------------------------------------------------+
```

## Key Architectural Invariants
- **100% Offline**: No network or cloud APIs.
- **Single Relational Database**: One SQLite file (`database.db`) for all seasons and years.
- **The Decoupling Law**: Registrations, Rooms, and Flights are independent entities.
