/**
 * Navigation coverage check.
 *
 *   npm run verify:nav
 *
 * Exits non-zero when a route exists that neither the sidebar nor the ⌘K
 * palette can reach.
 *
 * Why this exists: both menus are generated — the project-scoped half from
 * `getNavGroups()`, the global half from `config/globalNav.tsx` — but a new
 * <Route> is added by hand, and nothing complains when it is never linked. That
 * is not hypothetical: Integrations, My Account, Users and Roles all shipped
 * and stayed absent from the palette for weeks, and My Sheets was in the
 * sidebar but not the palette. A route nobody can navigate to looks exactly
 * like a feature nobody built.
 *
 * The route list is read out of App.tsx with a regex rather than by importing
 * it (the routes are JSX inside a component). If the routing ever moves to a
 * data router, update ROUTE_SOURCE below.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { getNavGroups, navItemHref } from '@mbc360/shared/config/registers';

const ROOT = join(import.meta.dirname, '..');
const ROUTE_SOURCE = join(ROOT, 'src/App.tsx');
const GLOBAL_NAV_SOURCE = join(ROOT, 'src/config/globalNav.tsx');
const PROJECT = ':projectId';

// Destinations the palette generates for the active project rather than reading
// from config — kept here so the check knows they are covered on purpose.
const GENERATED = new Set([
  '/',
  // BomCosting renders its default section when the route carries none.
  `/projects/${PROJECT}/bom`,
  '/projects',
  `/projects/${PROJECT}`,
  `/projects/${PROJECT}/phase/:phaseNo`,
  `/projects/${PROJECT}/my-sheets`,
  `/projects/${PROJECT}/registers/cat/:categoryKey`,
  `/projects/${PROJECT}/registers/reg/:registerKey`,
]);

const normalise = (path: string) => path.replace(/:[A-Za-z]+/g, (m) => m).replace(/\/$/, '') || '/';

const routes = [...readFileSync(ROUTE_SOURCE, 'utf8').matchAll(/<Route\s+path="([^"]+)"/g)].map(
  (m) => normalise(m[1]),
);
if (routes.length === 0) {
  console.error('✗ No <Route path="…"> found — has the routing moved? Update ROUTE_SOURCE.');
  process.exit(1);
}

const globalPaths = [...readFileSync(GLOBAL_NAV_SOURCE, 'utf8').matchAll(/path: '([^']+)'/g)].map(
  (m) => normalise(m[1]),
);

const navPaths = getNavGroups().flatMap((group) => [
  normalise(`/projects/${PROJECT}/registers/cat/${group.key}`),
  ...group.items.map((item) => normalise(navItemHref(item, PROJECT))),
]);

const reachable = new Set([...GENERATED].map(normalise).concat(globalPaths, navPaths));

// A parameterised route is covered when some menu destination matches it
// segment by segment, with a `:param` matching any one segment: the route
// `/projects/:projectId/bom/:section` is covered by the three concrete
// `bom/formula`, `bom/packaging`, `bom/costing` nav items, and
// `registers/reg/:registerKey` by every register the menus list.
const segments = (path: string) => path.split('/').filter(Boolean);
const matches = (route: string, target: string): boolean => {
  const r = segments(route);
  const t = segments(target);
  if (r.length !== t.length) return false;
  return r.every((seg, i) => seg.startsWith(':') || seg === t[i]);
};

const reachableList = [...reachable];
const orphans = routes.filter((route) => !reachableList.some((target) => matches(route, target)));

if (orphans.length > 0) {
  console.error(`\n✗ ${orphans.length} route(s) reachable from neither the sidebar nor ⌘K:\n`);
  for (const route of orphans) console.error(`  - ${route}`);
  console.error(
    '\nAdd it to apps/web/src/config/globalNav.tsx (global pages) or to DEPARTMENTS in\n' +
      'packages/shared/src/config/registers.ts (workbook sheets and project pages).\n',
  );
  process.exit(1);
}

console.log(
  `✓ Navigation covered: ${routes.length} routes, all reachable — ${globalPaths.length} global entries, ` +
    `${navPaths.length} workbook/nav destinations, ${GENERATED.size} generated per project.`,
);
