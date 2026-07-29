# SECURITY POLICY — DAYAR-E-HABIB ERP

## Security Philosophy

Dayar-E-Habib ERP is designed as a **100% offline, single-machine desktop application**. Because the application operates completely isolated from the internet, network-based attack vectors and cloud data breaches are eliminated by design.

---

## Data Isolation & Local Encryption

- **Database Protection**: All pilgrim data is stored locally in SQLite (`database.db`) within the user's local operating system user profile (`Documents/Dayar-E-Habib Data/`).
- **Zero Telemetry**: No tracking, analytics, background calls, or telemetry data are collected or transmitted.
- **Local File Security**: Documents, passports, and visa scans stored in the document vault reside strictly on the local disk.

---

## Reporting Vulnerabilities

If you discover a security vulnerability or potential local privilege escalation in the desktop wrapper or offline engine, please report it directly:

- **Email**: `security@dayarehabib.com`
- **Response Time**: Within 48 hours.

Please do not open public issues for sensitive security disclosures.
