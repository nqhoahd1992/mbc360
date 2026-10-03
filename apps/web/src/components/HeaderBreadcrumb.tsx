import { Fragment, type ReactNode } from 'react';
import { RightOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { PHASES } from '@mbc360/shared/config/gates';
import {
  findNavGroupForRegister,
  getNavGroup,
  getNavGroups,
  getRegisterConfig,
  navItemHref,
} from '@mbc360/shared/config/registers';
import { GLOBAL_NAV } from '../config/globalNav';
import { useAppStore } from '../store/useAppStore';

interface Crumb {
  label: string;
  to?: string;
}

const phaseLabel = (n: number) => {
  const ph = PHASES.find((p) => p.phase === n);
  if (!ph) return `Phase ${n}`;
  return `Phase ${n} · ${ph.subtitle.replace(/Gates [\d-]+ /, '').replace(/[()]/g, '')}`;
};

// Where you are, worked out from the route and the same nav config the
// sidebar reads — so a page renamed there is renamed here too. The project's
// own name is already on the sidebar card and the page title, so the header
// says what neither of those does: which page inside the project.
function useCrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const projects = useAppStore((s) => s.projects);

  const global = GLOBAL_NAV.find((e) => e.path === pathname);
  if (global) {
    // Administration is a sidebar section, not a page, so it carries no link.
    return typeof global.sidebar === 'object' && global.sidebar !== null
      ? [{ label: 'Administration' }, { label: global.title }]
      : [{ label: global.title }];
  }

  const m = pathname.match(/^\/projects\/([^/]+)(\/.*)?$/);
  if (!m) return [];
  const id = m[1];
  const rest = m[2] ?? '';
  const project = projects.find((p) => p.identity.id === id);
  const root: Crumb = { label: project?.identity.id ?? id, to: `/projects/${id}` };

  if (!rest) return [root, { label: 'Overview' }];
  const phase = rest.match(/^\/phase\/(\d+)/);
  if (phase) return [root, { label: phaseLabel(Number(phase[1])) }];
  if (rest === '/my-sheets') return [root, { label: 'My Sheets' }];

  const cat = rest.match(/^\/registers\/cat\/([^/]+)/);
  if (cat) {
    const group = getNavGroup(cat[1]);
    return [root, ...(group ? [{ label: group.title }] : []), { label: 'Overview' }];
  }
  const reg = rest.match(/^\/registers\/reg\/([^/]+)/);
  if (reg) {
    const group = findNavGroupForRegister(reg[1]);
    const item = group?.items.find((it) => it.registerKey === reg[1]);
    const title = item?.title ?? getRegisterConfig(reg[1])?.title ?? reg[1];
    return [
      root,
      ...(group ? [{ label: group.title, to: `/projects/${id}/registers/cat/${group.key}` }] : []),
      { label: title },
    ];
  }

  // A dedicated page (Formula BOM, Formulation Safety, …) filed under a group.
  // Exact routes across every group first; then `/bom`, the bare route of a
  // page whose nav items carry a section (`/bom/formula`), by prefix.
  const matchers = [
    (href: string) => href === pathname,
    (href: string) => href.startsWith(`${pathname}/`),
  ];
  for (const matches of matchers) {
    for (const group of getNavGroups()) {
      const item = group.items.find((it) => matches(navItemHref(it, id)));
      if (item) {
        return [root, { label: group.title, to: `/projects/${id}/registers/cat/${group.key}` }, { label: item.title }];
      }
    }
  }
  return [root];
}

export default function HeaderBreadcrumb({ fallback }: { fallback: ReactNode }) {
  const crumbs = useCrumbs();
  if (crumbs.length === 0) return <span className="hb-cur">{fallback}</span>;
  return (
    <nav className="hb" aria-label="Breadcrumb">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <Fragment key={`${i}-${c.label}`}>
            {last ? (
              <span className="hb-cur" aria-current="page" title={c.label}>
                {c.label}
              </span>
            ) : (
              <>
                {c.to ? (
                  <Link to={c.to} className="hb-link" title={c.label}>
                    {c.label}
                  </Link>
                ) : (
                  <span className="hb-link hb-plain" title={c.label}>
                    {c.label}
                  </span>
                )}
                <RightOutlined className="hb-sep" aria-hidden />
              </>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
