# Pull Request Directive

## Summary of Changes
Provide a brief, high-level summary of what this PR introduces or fixes.

## Architectural & Data Model Audit
- [ ] Conforms to **The Non-Negotiable Modeling Law**: Registrations (`Booking`), Rooms (`Room` + `RoomOccupant`), and Flights (`FlightBooking` + `FlightPax`) are treated as decoupled groupings.
- [ ] Maintains **Offline-First Isolation**: No online API dependencies, third-party network calls, or cloud OCR engines introduced.
- [ ] Preserves **Immutability Snapshots**: Historic packages, prices, and season labels remain intact on existing registrations.

## Verification & Test Results
- [ ] TypeScript compilation (`npx tsc --noEmit`): **0 errors**
- [ ] Enterprise scenario suite (`npx tsx scratch/test_20_enterprise_scenarios.ts`): **100% PASS**
- [ ] Clean customer serial numbers (`#1`, `#2`, `#3`, ...) verified in directory list.

## Associated Issues
Fixes #
