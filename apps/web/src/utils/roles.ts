// The demo-parity role model moved to @mbc360/shared (config/roles) at backend
// milestone M2. `SSO_ROLES` (the F6 17-role list) sources the header "View as"
// picker and the Role Editor. The gate/phase/market-track permission CHECKS,
// however, no longer live here — they moved to apps/web/src/utils/permissions.ts
// (2026-07-23), which consults the live DB permission grid loaded into the
// store, not the shared keyword-match token functions (those remain in
// @mbc360/shared only as the seed default for seedRbac()). This file now just
// re-exports the role LIST + label helper.
export { ADMIN_ROLE, SSO_ROLES, roleLabel } from '@mbc360/shared/config/roles';
export type { ViewRole } from '@mbc360/shared/config/roles';
