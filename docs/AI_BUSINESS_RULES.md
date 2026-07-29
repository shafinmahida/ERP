# AI BUSINESS RULES & CONSTRAINTS

1. **The 3 Calm Laws**:
   - 5-Second Rule: Core actions complete in < 5s.
   - Empty Desk Rule: Default views show only active work.
   - Context Memory Rule: Pinned active registration number.
2. **The Non-Negotiable Modeling Law**: Registrations (`Booking`), Rooms (`Room` + `RoomOccupant`), and Flights (`FlightBooking` + `FlightPax`) are separate groupings.
3. **Money Precision**: All amounts stored in integer paise (`₹10,000` = `1000000` paise).
4. **10-Year Passport Expiry**: Auto-suggests expiry as 10 Years minus 1 Day.
5. **Immutability Snapshots**: Snapshot-copy package rates and names on registration creation.
