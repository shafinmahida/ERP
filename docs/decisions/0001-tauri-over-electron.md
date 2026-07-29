# ADR-0001: Choice of Tauri Native Shell over Electron

- **Status**: Approved & Locked
- **Date**: 2026-07-28
- **Context**: The legacy software DAYAR-E-HABIB HAJ2019 needed a modern desktop replacement. We evaluated Electron vs. Tauri v2.
- **Decision**: Selected **Tauri v2** (Rust native shell).
- **Consequences**:
  - Memory usage reduced from ~250MB (Electron) to < 40MB (Tauri).
  - Production installer size reduced to ~12MB.
  - Native Windows OS file system access with 100% offline isolation.
