// The demo-parity role model moved to @mbc360/shared (config/roles) at backend
// milestone M2 so the web "View as" simulation and the backend RBAC seed share
// one mapping. This re-export keeps existing imports working; replace the
// shared mapping when follow-up F6 delivers the real role/permission matrix.
export {
  ADMIN_ROLE,
  VIEW_ROLES,
  canApprovePhase,
  canDecideGate,
  canEditMarketTrack,
  roleLabel,
} from '@mbc360/shared/config/roles';
export type { ViewRole } from '@mbc360/shared/config/roles';
