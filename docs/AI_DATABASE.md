# AI DATABASE — RELATIONAL SCHEMA REFERENCE

## Schemas Defined in `src/db/schema.ts`
1. `customer`: Physical pilgrim records.
2. `customerIdentity`: Passports and National IDs.
3. `seasonType`: Hajj, Umrah, Ramadan Umrah.
4. `season`: Operational years.
5. `packageTable`: Tiered packages.
6. `registration`: Primary booking record (`DH-YYYY-TYPE-SEQ`).
7. `registrationPax`: Linked group pilgrims.
8. `registrationCharge`: Itemized charges in integer paise.
9. `registrationTax`: CGST / SGST / IGST / TCS breakdown.
10. `payment`: Money receipts in integer paise.
11. `visaOperation`: Saudi MOFA visa batch tracking.
12. `flightOperation`: Airline PNR & ticket tracking.
13. `hotelOperation`: Makkah & Madinah room allocations.
14. `auditLog`: System audit trail.
