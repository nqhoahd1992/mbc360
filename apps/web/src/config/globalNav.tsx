import type { ReactNode } from 'react';
import {
  ApiOutlined,
  AppstoreOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';

// The app's non-project destinations, in ONE list.
//
// Why this file exists: the sidebar built its global items inline in App.tsx
// while the ⌘K palette kept its own hardcoded array, so the two drifted — by
// 2026-08-22 the palette was still offering only Dashboard / All Projects /
// Change Control and could not reach Integrations, My Account or Users & Roles,
// all of which had been in the sidebar (or the avatar menu) for weeks. Anything
// project-scoped is already generated from `getNavGroups()` by both, which is
// exactly why that half never drifted.
//
// `sidebar` says where the entry appears in the left menu; the palette offers
// every entry regardless, because searching for a page you cannot see in the
// menu is the whole point of a palette.
export interface GlobalNavEntry {
  /** The route, and the antd Menu key. */
  path: string;
  title: string;
  icon?: ReactNode;
  adminOnly?: boolean;
  /**
   * 'rail' = a destination on the sidebar's icon rail · {submenu} = a group in
   * the Administration panel · false = palette (and avatar menu) only.
   */
  sidebar: 'rail' | { submenu: string } | false;
  /** Short label under the rail icon, where the full title does not fit in 60px. */
  railLabel?: string;
  /** Extra search terms for the palette. */
  keywords?: string;
}

export const ADMIN_SUBMENU = 'Access & integrations';
// Company-wide reference data the rule engine reads (Market profiles, Raw
// Material Risk Overlay, ...) — split out from ADMIN_SUBMENU (2026-08-26,
// user-requested): it was filed under "Users & Roles", which reads as user/
// role administration when it is actually shared data every project reads,
// unrelated to who can sign in or what they can approve.
export const REFERENCE_DATA_SUBMENU = 'Company Reference Data';

export const GLOBAL_NAV: GlobalNavEntry[] = [
  { path: '/', title: 'Dashboard', icon: <AppstoreOutlined />, sidebar: 'rail', railLabel: 'Home' },
  { path: '/projects', title: 'All Projects', icon: <FolderOpenOutlined />, sidebar: 'rail', railLabel: 'Projects' },
  {
    // On the rail since the 2026-10-03 sidebar redesign: it is company-wide
    // (every project's changes on one page), so filing it only as a workbook
    // sheet inside one project's groups hid it from anyone not in that group.
    path: '/change-control',
    title: 'Change Control',
    icon: <SwapOutlined />,
    sidebar: 'rail',
    railLabel: 'Changes',
    keywords: 'change request major minor formula version',
  },
  {
    // Lives in the avatar menu, where account settings belong.
    path: '/account',
    title: 'My Account',
    icon: <UserOutlined />,
    sidebar: false,
    keywords: 'profile signature authenticator two-factor capabilities review areas',
  },
  { path: '/admin/users', title: 'Users', icon: <TeamOutlined />, adminOnly: true, sidebar: { submenu: ADMIN_SUBMENU }, keywords: 'roles assign account deactivate authenticator reset' },
  { path: '/admin/roles', title: 'Roles', icon: <TeamOutlined />, adminOnly: true, sidebar: { submenu: ADMIN_SUBMENU }, keywords: 'capabilities permissions gate decisions phase approvals' },
  // System Administrator only (2026-10-02): the page manages the Cosmetri token
  // pair, and IntegrationsPage refuses non-admins too.
  { path: '/integrations', title: 'Integrations', icon: <ApiOutlined />, adminOnly: true, sidebar: { submenu: ADMIN_SUBMENU }, keywords: 'cosmetri tokens connection refresh' },
  // Round 4 question 4 (2026-08-24). Company-level reference data, so it belongs
  // beside Users & Roles rather than in a project workspace — one list every
  // project reads and none of them can edit.
  //
  // `adminOnly` controls only whether the LINK shows. The page itself is readable
  // by anyone who reaches it and its Save is gated on the real
  // `reference:market-profile|edit` capability, seeded to Regulatory — so an admin
  // sees the link while Regulatory, who actually maintains the data, reaches it
  // from search or a direct URL [ASSUMPTION: R5-Q15].
  {
    path: '/admin/market-profiles',
    title: 'Market profiles',
    icon: <GlobalOutlined />,
    adminOnly: true,
    sidebar: { submenu: REFERENCE_DATA_SUBMENU },
    keywords: 'regulatory market profile adverse event pms dossier claim restriction reference data',
  },
  // Round 4 question 17 (2026-08-24). Same shape and the same `adminOnly` caveat as
  // Market profiles above: the link is admin-only, the Save is gated on
  // `reference:rm-risk|edit` (Safety, R&I/Formulation, Regulatory)
  // [ASSUMPTION: R5-Q15].
  {
    path: '/admin/rm-risk',
    title: 'Raw material risk',
    icon: <ExperimentOutlined />,
    adminOnly: true,
    sidebar: { submenu: REFERENCE_DATA_SUBMENU },
    keywords:
      'raw material risk overlay allergen fragrance essential oil botanical protein residual solvent heavy metal microbiological impurity reference data cosmetri',
  },
  // Round 4 question 28 (2026-08-30). The third and last reference dataset, and
  // the only one with a workflow: entries need BOTH a Technical and a Regulatory
  // approval before they count as Approved Library Wording. Same `adminOnly`
  // caveat as its two siblings [ASSUMPTION: R5-Q15].
  {
    path: '/admin/claims-library',
    title: 'Claims Library',
    icon: <FileProtectOutlined />,
    adminOnly: true,
    sidebar: { submenu: REFERENCE_DATA_SUBMENU },
    keywords:
      'claims library approved wording company level technical regulatory approval propose withdraw applicability brand market channel reference data',
  },
];

export const globalNavFor = (isAdmin: boolean): GlobalNavEntry[] =>
  GLOBAL_NAV.filter((entry) => !entry.adminOnly || isAdmin);
