# TESTING & QUALITY ASSURANCE SPECIFICATION

> **Testing Strategy, Scenario Suites, & Browser Automation**

---

## 1. Quality Assurance Architecture

Testing in Dayar-E-Habib ERP follows a 3-tier validation strategy:

```text
+-------------------------------------------------------------------------+
|                  1. STATIC TYPE COMPILATION                             |
|   `npx tsc --noEmit` (Guarantees zero TypeScript reference errors)       |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|             2. ENTERPRISE SCENARIOS VALIDATION SUITE                     |
|   `npx tsx scratch/test_20_enterprise_scenarios.ts` (23 Scenarios)     |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|             3. REAL BROWSER APPLICATION UI AUTOMATION                   |
|   `node scratch/interactive_ui_test.js` (Automated Edge UI screenshots) |
+-------------------------------------------------------------------------+
```

---

## 2. The 23 Enterprise & Operational Test Scenarios

The automated test script [scratch/test_20_enterprise_scenarios.ts](file:///c:/DayarEHabibERP/scratch/test_20_enterprise_scenarios.ts) validates 23 core business scenarios:

1. **Scenario 1**: Existing Customer Reuse without creating duplicate profiles.
2. **Scenario 2**: Mixed Registration (1 existing customer + 2 new family members).
3. **Scenario 3**: Financial Recalculation after payment receipts.
4. **Scenario 4**: Single PAX deletion from family group with remaining sequence recalculation.
5. **Scenario 5**: Passport Identity update with 10-year auto expiry.
6. **Scenario 6**: Package upgrade maintaining historic immutability snapshot.
7. **Scenario 7**: Operational Season update.
8. **Scenario 8**: Cancellation status state machine transition (`Refund Pending`).
9. **Scenario 9**: Late pilgrim addition to existing registration.
10. **Scenario 10**: Primary pilgrim reassignment.
11. **Scenario 11**: A4 Combined Booking Form document generation.
12. **Scenario 12**: Individual Single-PAX Booking Form generation.
13. **Scenario 13**: Large Group (12 PAX) creation and integrity check under 500ms.
14. **Scenario 14**: Multi-byte UTF-8 Unicode (Arabic/Urdu) text rendering (`محمد جاويد Khan`).
15. **Scenario 15**: Very long address layout rendering without overflow.
16. **Scenario 16**: Missing passport handling with `Documents Pending` badge.
17. **Scenario 17**: Passport identity exact querying.
18. **Scenario 18**: Instant multi-field customer search (Name, Mobile, Passport).
19. **Scenario 19**: Overpayment credit balance rendering (`isOverpaid: true`).
20. **Scenario 20**: Full audit trail traceability.
21. **Scenario 21**: Visa Operations MOFA approval and batch assignment.
22. **Scenario 22**: Flight Operations PNR assignment for Saudia Airlines SV-741.
23. **Scenario 23**: Hotel Operations Makkah rooming allocation (Pullman Zamzam Room 402).
