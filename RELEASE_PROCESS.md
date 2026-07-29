# RELEASE PROCESS & DISTRIBUTION WORKFLOW

> **Step-by-Step Release Checklist & Version Distribution**

---

## Release Checklist

1. **Pre-Release Verification**:
   - Run `npm run type-check` (0 errors).
   - Run `npm run test-foundation` (23/23 PASS).
2. **Version Bump**:
   - Update `version` in `package.json` and `src-tauri/tauri.conf.json`.
   - Add entry to **[CHANGELOG.md](file:///c:/DayarEHabibERP/CHANGELOG.md)**.
3. **Build Release Binaries**:
   - Run `npx tauri build` to generate `.msi` and `.exe` installers.
4. **Git Tagging**:
   - `git tag -a v1.2.0 -m "Release v1.2.0 — Sprint 2 Travel Operations Module"`
   - `git push origin v1.2.0`
5. **Distribution**:
   - Publish installer binaries to GitHub Releases.
