# CONTRIBUTING TO DAYAR-E-HABIB ERP

Thank you for your interest in contributing to **Dayar-E-Habib ERP**! This guide outlines development standards, branch conventions, commit quality guidelines, and pull request workflows.

---

## 1. Core Development Principles

1. **Obey The Non-Negotiable Modeling Law**:
   - `Customer`, `Booking`, `Registration`, `Room` + `RoomOccupant`, and `FlightBooking` + `FlightPax` must remain decoupled.
   - Never conflate who registers together with who rooms together or who flies together.
2. **Strict Offline Isolation**:
   - Never introduce online API dependencies, cloud storage, or external network requests.
3. **Immutability Snapshots**:
   - Package prices and season labels must be snapshot-copied on registration creation.
4. **The Calm ERP Principles**:
   - 5-Second Rule, Empty Desk Rule, Context Memory Rule.

---

## 2. Git Branch Strategy

- `main`: Production-ready releases.
- `develop`: Integration branch for active sprint features.
- `feature/<name>`: New operational module or feature.
- `fix/<name>`: Bug fix branch.

---

## 3. Commit Message Conventions

Commit messages must be imperative, specific, and descriptive:

### Format
`<type>(<scope>): <short description>`

### Allowed Types
- `feat`: New feature or operational capability.
- `fix`: Bug fix.
- `docs`: Documentation updates.
- `style`: Formatting, design tokens, or styling updates.
- `refactor`: Code refactoring without changing functionality.
- `test`: Adding or updating test scenarios.
- `chore`: Maintenance, dependencies, or configuration tasks.

### Examples
- `fix(registration): split room assignment from booking group size`
- `feat(travel-ops): add visa batch approval and MOFA status tracking`
- `docs(architecture): document decoupled room and flight junction tables`

---

## 4. Pull Request Checklist

Before submitting a PR, verify:
1. `npx tsc --noEmit` compiles cleanly with **0 errors**.
2. `npx tsx scratch/test_20_enterprise_scenarios.ts` passes **23/23 test scenarios**.
3. All code modifications preserve existing docstrings and comments.
