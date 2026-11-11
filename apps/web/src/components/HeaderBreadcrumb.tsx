import { Fragment, useTransition, type ReactNode } from 'react';
import { App, Dropdown } from 'antd';
import { CheckOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GATES, phaseLabel } from '@mbc360/shared/config/gates';
import { currentGateIndex, isGatePassed } from '@mbc360/shared/utils/gateProgress';
import {
  findNavGroupForRegister,
  getNavGroup,
  getNavGroups,
  getRegisterConfig,
  navItemHref,
} from '@mbc360/shared/config/registers';
import { GLOBAL_NAV } from '../config/globalNav';
import { useAppStore } from '../store/useAppStore';
import { useUnsavedCount } from '../hooks/unsavedRegistry';
import { effectiveMarket, gateMarkets } from '../utils/gateMarket';
import SwitchOverlay from './SwitchOverlay';

interface Crumb {
  label: string;
  to?: string;
}


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
  const { pathname, search } = useLocation();
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const phaseNo = Number(pathname.match(/^\/projects\/[^/]+\/phase\/(\d+)/)?.[1]);
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const navigate = useNavigate();
  const unsaved = useUnsavedCount();
  const { modal } = App.useApp();
  const [pending, startTransition] = useTransition();
  // The gate being viewed: PhasePage keeps it in `?gate=`; with no param it
  // opens on the project's current gate if that is in this phase (same default
  // as PhasePage), else the phase's first gate. `close` is the close-out tab.
  let chip: string | undefined;
  let viewedGate: string | undefined; // 'SG10', or 'close'
  const phaseGates = phaseNo ? GATES.filter((g) => g.phase === phaseNo) : [];
  if (project && phaseNo) {
    const requested = new URLSearchParams(search).get('gate');
    if (requested === 'close') {
      chip = 'Phase close-out';
      viewedGate = 'close';
    } else {
      const current = GATES[currentGateIndex(project)];
      const gate =
        phaseGates.find((g) => g.id === requested) ??
        (current?.phase === phaseNo ? current : undefined) ??
        (phaseGates.every((g) => isGatePassed(project, g.id)) ? undefined : phaseGates[0]);
      chip = gate ? `Gate ${gate.number} · ${gate.name}` : 'Phase close-out';
      viewedGate = gate ? gate.id : 'close';
    }
  }
  // The market, on a per-market gate with more than one market. Read through the same rule the page uses.
  const lanes = project && viewedGate && viewedGate !== 'close' ? gateMarkets(project, viewedGate) : [];
  const market = effectiveMarket(lanes, new URLSearchParams(search).get('market'));

  // The address with one parameter changed; the rest (the other chip, a deep link's section) is kept, except a pending scroll target.
  const hrefWith = (key: string, value: string) => {
    const p = new URLSearchParams(search);
    p.set(key, value);
    p.delete('scrollTo');
    return `${pathname}?${p.toString()}`;
  };
  // A gate tab remounts its blocks, so unsaved drafts on it would be lost: ask first, as the tab strip on the page does.
  const switchGate = (next: string) => {
    if (next === viewedGate) return;
    const go = () => startTransition(() => navigate(hrefWith('gate', next)));
    if (unsaved === 0) return go();
    modal.confirm({
      title: unsaved === 1 ? 'Leave with unsaved changes?' : `Leave with ${unsaved} unsaved sections?`,
      content: 'Edits you have not saved on this gate will be lost. Cancel, then use Save on the section you were editing.',
      okText: 'Switch without saving',
      okButtonProps: { danger: true },
      cancelText: 'Stay on this gate',
      onOk: go,
    });
  };
  // A market switch keeps every draft (the page holds all markets), so it needs no question.
  const switchMarket = (next: string) => {
    if (next === market) return;
    startTransition(() => navigate(hrefWith('market', next), { replace: true }));
  };
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
      {chip && phaseGates.length > 0 ? (
        <Dropdown
          trigger={['click']}
          menu={{
            selectedKeys: viewedGate ? [viewedGate] : [],
            onClick: ({ key }) => switchGate(String(key)),
            items: [
              ...phaseGates.map((g) => ({
                key: g.id,
                label: (
                  <span className="hb-menu-item">
                    Gate {g.number} · {g.name}
                    {project && isGatePassed(project, g.id) && <CheckOutlined className="hb-menu-done" aria-label="passed" />}
                  </span>
                ),
              })),
              { type: 'divider' as const },
              { key: 'close', label: 'Phase close-out' },
            ],
          }}
        >
          <button type="button" className="hb-gate hb-chip" title="Gate you are viewing — click to switch">
            <span className="hb-chip-text">{chip}</span>
            <DownOutlined className="hb-chip-caret" aria-hidden />
          </button>
        </Dropdown>
      ) : (
        chip && (
          <span className="hb-gate" title="Gate you are viewing">
            {chip}
          </span>
        )
      )}
      {market && (
        <Dropdown
          trigger={['click']}
          menu={{
            selectedKeys: [market],
            onClick: ({ key }) => switchMarket(String(key)),
            items: lanes.map((m) => ({ key: m, label: m })),
          }}
        >
          <button type="button" className="hb-gate hb-chip hb-market" title="Market you are viewing — click to switch">
            <span className="hb-chip-text">{market}</span>
            <DownOutlined className="hb-chip-caret" aria-hidden />
          </button>
        </Dropdown>
      )}
      {pending && <SwitchOverlay label="Switching…" />}
    </nav>
  );
}
