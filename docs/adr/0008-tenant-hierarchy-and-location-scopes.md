# ADR 008: Multi-Tenant Hierarchy (Org -> Business -> Location) & Scoped Capabilities

## Status
Accepted

## Context
Local businesses operate with distinct structural hierarchies:
- An agency or franchise owner manages multiple businesses.
- A single business (e.g. "Apex Plumbing") may operate across 3 branch locations with different addresses, phone numbers, and local keyword targets.
- A single-location business still requires a structured location record.
- Team members need granular access: an editor assigned to Location A must not be able to publish content or read private reviews for Location B.

## Decision
1. **Three-Tier Entity Hierarchy**:
   - `organizations`: Root tenant boundary. Owns billing, subscription tier, credit ledger, and overall membership.
   - `businesses`: Belongs to an organization. Owns shared brand voice, logos, overarching services, and global fact defaults.
   - `locations`: Belongs to a business and organization. Owns local NAP (Name, Address, Phone), IANA timezone, operating hours, coordinates, connected GBP/social accounts, keyword rank tracking, and local review inbox.
2. **Composite Foreign Keys & Constraints**:
   Every location-scoped table (`campaigns`, `rank_scans`, `reviews`, `credentials`) stores both `organization_id` and `location_id`.
   Composite foreign keys enforce that a record's `location_id` genuinely belongs to its `organization_id`, preventing cross-tenant injection at the database level.
3. **Location-Scoped Roles & Capabilities**:
   Roles (`owner`, `admin`, `editor`, `approver`, `analyst`, `billing_manager`) are evaluated server-side.
   Memberships support an optional `location_ids` array. When specified, users are restricted to actions on authorized locations only.
   Browser-supplied organization or location IDs are never trusted without server-side validation against session context.

## Alternatives Considered
1. *Flat Tenant Model (only Organization)*: Inadequate for local businesses with multiple physical branches or service zones.
2. *Relying only on UI dropdowns for filtering*: Dangerous; malicious users could manipulate HTTP payload IDs to access or modify resources belonging to sibling locations or foreign tenants.

## Consequences
- Robust security boundaries preventing cross-tenant and cross-location data leakage.
- Flexible support for single-location businesses, multi-location brands, and marketing agencies.
