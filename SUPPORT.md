# OPERATOR SUPPORT & TROUBLESHOOTING GUIDE

> **Support Channels & Troubleshooting for Dayar-E-Habib ERP Operators**

---

## 1. Fast Troubleshooting

### Common Issue: "Database File Not Found"
- **Cause**: Application launched in a restricted directory without write permissions.
- **Solution**: The application creates SQLite database files automatically under `Documents/Dayar-E-Habib Data/database.db`. Ensure your Windows user account has Read/Write permissions to your `Documents` folder.

### Common Issue: "Vite Dev Server showing empty customer list"
- **Cause**: Browser `localStorage` cache needed initialization.
- **Solution**: Clear browser cache or click `+ Add New Customer Profile`. The `WebStorageDiskStore` engine automatically seeds 20 demo customers and active seasons on fresh launch.

---

## 2. Technical Support Channels

- **Documentation**: Consult **[ARCHITECTURE.md](file:///c:/DayarEHabibERP/ARCHITECTURE.md)** and **[BUSINESS_RULES.md](file:///c:/DayarEHabibERP/BUSINESS_RULES.md)**.
- **Issue Tracker**: Submit detailed bug reports via [GitHub Issue Templates](file:///c:/DayarEHabibERP/.github/ISSUE_TEMPLATE/bug_report.yml).
- **Official Help Desk**: `support@dayarehabib.com`
