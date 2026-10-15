// The demo-parity role model moved to @mbc360/shared (config/roles) at backend
// milestone M2. `SSO_ROLES` (the F6 17-role list) sources the header "View as"
// picker and the Role Editor. Gate/phase/market authority follows the project's
// assignment (SW-37); this file just re-exports the role LIST + label helper.
export { ADMIN_ROLE, SSO_ROLES, roleLabel } from '@mbc360/shared/config/roles';
export type { ViewRole } from '@mbc360/shared/config/roles';
