# ADR-0002: Choice of Single Relational SQLite Database

- **Status**: Approved & Locked
- **Date**: 2026-07-28
- **Context**: Legacy systems often physically split database files per year or per package.
- **Decision**: Use a **Single Relational SQLite Database** (`database.db`) for all years, packages, and bookings.
- **Consequences**:
  - Instant cross-year pilgrim history lookup.
  - Simplified single-file backup and restore archives.
  - Eliminates database corruption risks caused by managing dozens of separate SQLite files.
