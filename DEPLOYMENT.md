# DEPLOYMENT & PACKAGING GUIDE

> **Building Production Installers & Desktop Packaging**

---

## 1. Prerequisites for Packaging

- **Node.js**: v20.x or higher
- **Rust Toolchain**: `rustc` and `cargo` installed via [rustup.rs](https://rustup.rs/)
- **WiX Toolset** (Windows): Required by Tauri CLI for generating `.msi` installers.

---

## 2. Desktop Packaging Workflow (Tauri)

### Step 1: Pre-Build Type Check & Verification
```bash
# Verify zero TypeScript compilation errors
npm run type-check

# Execute Enterprise Scenario Validation Suite
npm run test-foundation
```

### Step 2: Build Production Web Bundle & Tauri Binary
```bash
# Triggers Vite build and Rust compiler for Windows release executable
npx tauri build
```

### Output Location
Production desktop installer packages are output to:
`src-tauri/target/release/bundle/msi/Dayar-E-Habib-ERP_1.2.0_x64_en-US.msi`
`src-tauri/target/release/bundle/nsis/Dayar-E-Habib-ERP_1.2.0_x64-setup.exe`

---

## 3. Web Storage & Standalone Web Distribution

For web browser testing or cloud preview:
```bash
# Build static web bundle
npm run build

# Preview build locally
npm run preview
```
The application will operate in offline browser mode using `WebStorageDiskStore` (`localStorage`).
