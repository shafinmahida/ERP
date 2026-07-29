# ADR-0003: Decoupled Registration, Room, and Flight Groupings

- **Status**: Approved & Locked (The Non-Negotiable Modeling Law)
- **Date**: 2026-07-28
- **Context**: Hajj and Umrah travel operations involve complex real-world group dynamics (individuals, couples, family of 7, group of 10 friends). Hardcoding room or flight fields directly onto registrations causes bugs when families split across rooms or take staggered flights.
- **Decision**: **Who registers together (Booking), who rooms together (Room), and who flies together (Flight) are three separate groupings.**
- **Consequences**:
  - `registration_pax`, `hotel_operation`, and `flight_operation` junction tables allow complete operational flexibility without data corruption.
