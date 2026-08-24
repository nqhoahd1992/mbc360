import type { ReactNode } from 'react';
import {
  ApiOutlined,
  AppstoreOutlined,
  FolderOpenOutlined,
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
  /** 'top' = a top-level sidebar item · {submenu} = nested · false = palette only. */
  sidebar: 'top' | { submenu: string } | false;
  /** Extra search terms for the palette. */
  keywords?: string;
}

export const ADMIN_SUBMENU = 'Users & Roles';

export const GLOBAL_NAV: GlobalNavEntry[] = [
  { path: '/', title: 'Dashboard', icon: <AppstoreOutlined />, sidebar: 'top' },
  { path: '/projects', title: 'All Projects', icon: <FolderOpenOutlined />, sidebar: 'top' },
  { path: '/integrations', title: 'Integrations', icon: <ApiOutlined />, sidebar: 'top', keywords: 'cosmetri power apps sharepoint graph tokens' },
  {
    // Reachable in the menu as a workbook sheet (Sales & Marketing →
    // "Change Control & Communication"), so it is not repeated at the top.
    path: '/change-control',
    title: 'Change Control',
    icon: <SwapOutlined />,
    sidebar: false,
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
];

export const globalNavFor = (isAdmin: boolean): GlobalNavEntry[] =>
  GLOBAL_NAV.filter((entry) => !entry.adminOnly || isAdmin);
