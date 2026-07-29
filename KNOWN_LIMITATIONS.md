# KNOWN LIMITATIONS & OPERATING BOUNDARIES

> **Explicit Boundaries & Operational Scope**

---

1. **Single-Operator Concurrency**:
   - Designed strictly for **single-operator, single-machine** desktop use.
   - Multi-device simultaneous write concurrency is not supported by design (preventing race conditions in offline environments).

2. **Offline Data Storage Limit**:
   - WebStorage fallback mode in web browsers is limited by browser `localStorage` capacity (~5MB-10MB).
   - Desktop Tauri mode (Node SQLite) has **no artificial storage limits**, supporting millions of records smoothly.

3. **100% Offline OCR Boundaries**:
   - Tesseract.js MRZ passport OCR requires clean, well-lit passport scans or camera captures. Hand-written or heavily damaged passport copies may require manual text entry.
