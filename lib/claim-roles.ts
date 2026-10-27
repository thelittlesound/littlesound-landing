// Shared by the claim form (client) and the claims API (server). Kept in its
// own file because Next.js route files may only export HTTP handlers/config,
// and lib/claimable.ts is server-only.
export const CLAIM_ROLES = ['Owner', 'Director / manager', 'Staff member', 'Marketing / agency', 'Other'];
