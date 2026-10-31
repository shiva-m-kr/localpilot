/**
 * Row-Level Security (RLS) SQL definitions for PostgreSQL
 * Enforces database-level multi-tenant isolation.
 */
export const RLS_POLICIES_SQL = `
-- Enable Row Level Security on all tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_sites ENABLE ROW LEVEL SECURITY;

-- Organizations Policy: Only members belonging to the organization can select/update
CREATE POLICY org_isolation_policy ON organizations
  FOR ALL
  USING (id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

-- Memberships Policy
CREATE POLICY membership_isolation_policy ON memberships
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

-- Businesses Policy
CREATE POLICY business_isolation_policy ON businesses
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

-- Locations Policy
CREATE POLICY location_isolation_policy ON locations
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

-- Drafts Policy: Strictly private to organization members
CREATE POLICY draft_isolation_policy ON drafts
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

-- Published Sites Policy: Publicly readable for live sites, but mutations restricted to tenant
CREATE POLICY published_sites_select_policy ON published_sites
  FOR SELECT
  USING (is_live = true OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

CREATE POLICY published_sites_modify_policy ON published_sites
  FOR ALL
  USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
`;
