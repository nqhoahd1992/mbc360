import { useState } from 'react';
import { Button, Tabs } from 'antd';
import { CheckCircleOutlined, LockOutlined, RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { GATES } from '@mbc360/shared/config/gates';
import { getRegisterConfig, navItemHref, type NavGroup, type NavItem } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import type { ProjectData } from '@mbc360/shared/types';
import { isRegisterClosed } from '@mbc360/shared/types';
import { currentGateIndex, gateRefGateIds, isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import '../styles/concept.css';
import '../pages/AdminUsers.css';
import './SectionOverview.css';

// The Overview of one "WORKBOOK BY RESPONSIBILITY" section (2026-10-02 redesign,
// wireframe option A). It used to be a grid of cards that answered only "which
// sheets are in here" — beneath a Project Identification card repeating what the
// sidebar and header already say. It now answers what the person responsible
// opens it for: which sheets are due at the gate open NOW, which are still open,
// and which are already locked or closed. Every state is read from data that
// already exists (the gate ladder, the gate-evidence lock, register closures);
// nothing here adds a rule.

type Filter = 'all' | 'due' | 'open' | 'done';

export interface GuideSection {
  title: string;
  rows: { topic: string; instruction: string }[];
}

interface SheetRow {
  item: NavItem;
  gateNumbers: string[];
  due: boolean;
  locked: boolean;
  closed: boolean;
  isPage: boolean;
  rows: number;
  completed?: number;
}

export default function SectionOverview({
  project,
  group,
  guide,
}: {
  project: ProjectData;
  group: NavGroup;
  // Only the System Guide & Reference section carries one (Introduction +
  // Guide To Using This Document); it is shown as a tab beside the sheets.
  guide?: GuideSection[];
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const id = project.identity.id;
  const currentIndex = currentGateIndex(project);
  const current = currentIndex < GATES.length ? GATES[currentIndex] : undefined;

  const sheets: SheetRow[] = group.items.map((item) => {
    const config = item.registerKey ? getRegisterConfig(item.registerKey) : undefined;
    const rows = item.registerKey ? (project.registers[item.registerKey] ?? []) : [];
    const gateIds = gateRefGateIds(item.gate);
    const statusCol = config?.columns.find((c) => c.key === 'status' && c.type === 'select');
    return {
      item,
      gateNumbers: gateIds.map((g) => GATES.find((x) => x.id === g)?.number ?? g),
      due: !!current && gateIds.includes(current.id),
      locked: isGateRefLocked(project, item.gate),
      closed: !!item.registerKey && isRegisterClosed(project.registerClosures[item.registerKey]),
      isPage: !config,
      rows: rows.length,
      completed: statusCol ? rows.filter((r) => r.status === 'Completed' || r.status === 'Complete').length : undefined,
    };
  });

  // Due now first, then still-open by their earliest gate, locked last.
  const order = (s: SheetRow) => (s.due ? 0 : s.locked ? 2 : 1);
  const firstGate = (s: SheetRow) => (s.gateNumbers.length ? Number(s.gateNumbers[0]) : 99);
  const sorted = [...sheets].sort((a, b) => order(a) - order(b) || firstGate(a) - firstGate(b));

  const done = (s: SheetRow) => s.locked || s.closed;
  const counts = {
    due: sheets.filter((s) => s.due).length,
    open: sheets.filter((s) => !done(s)).length,
    locked: sheets.filter((s) => s.locked).length,
    closed: sheets.filter((s) => s.closed).length,
  };
  const visible = sorted.filter((s) =>
    filter === 'all' ? true : filter === 'due' ? s.due : filter === 'open' ? !done(s) : done(s),
  );
  const chips: [Filter, string, number][] = [
    ['all', 'All', sheets.length],
    ...(current ? [['due', `Gate ${current.number} (current)`, counts.due] as [Filter, string, number]] : []),
    ['open', 'Open', counts.open],
    ['done', 'Locked / closed', counts.locked + counts.closed - sheets.filter((s) => s.locked && s.closed).length],
  ];

  const gateTag = (s: SheetRow) =>
    s.gateNumbers.length === 0 ? (
      <span className="c-tag">All gates</span>
    ) : (
      <span className={`c-tag${s.due ? ' c-tag-warn' : ''}`}>
        Gate{' '}
        {s.gateNumbers.map((n, i) => (
          <span key={n}>
            {i > 0 && ' · '}
            {current && n === current.number ? <b>{n}</b> : n}
          </span>
        ))}
      </span>
    );
  const progress = (s: SheetRow) => {
    if (s.isPage) return <span className="so-muted">Opens its page</span>;
    if (s.rows === 0) return <span className="so-warn">No rows yet</span>;
    if (s.completed === undefined) return <span className="so-muted">{s.rows} {s.rows === 1 ? 'row' : 'rows'}</span>;
    return (
      <span className="so-progress">
        <span className="so-bar" aria-hidden>
          <i style={{ width: `${Math.round((s.completed / s.rows) * 100)}%` }} />
        </span>
        {s.completed}/{s.rows}
      </span>
    );
  };
  const status = (s: SheetRow) =>
    s.locked ? (
      <span className="c-tag" title="Its gate has passed — Backtrack to correct it">
        <LockOutlined />
        Locked
      </span>
    ) : s.closed ? (
      <span className="c-tag c-tag-ok">Closed</span>
    ) : (
      <span className="c-tag">Open</span>
    );

  const reviewOwner = group.reviewOwner ? composeReviewOwner(group.reviewOwner, project.identity.reviewers) : undefined;

  const sheetsBlock = (
    <>
      <div className="au-toolbar">
        {chips.map(([key, label, n]) => (
          <button key={key} type="button" className="au-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label} <b>{n}</b>
          </button>
        ))}
      </div>
      <div className="c-card au-list">
        {visible.length === 0 ? (
          <div className="au-empty">
            <CheckCircleOutlined className="au-empty-icon so-ok" />
            <div className="au-empty-title">
              {filter === 'due' && current ? `Nothing in this section is due at Gate ${current.number}` : 'No sheet here'}
            </div>
            <p>Every sheet in this section belongs to another state.</p>
            <Button onClick={() => setFilter('all')}>Show all sheets</Button>
          </div>
        ) : (
          visible.map((s) => (
            <Link key={s.item.registerKey ?? s.item.page ?? s.item.title} to={navItemHref(s.item, id)} className="au-row so-row">
              <div className="so-name">
                <div className="au-name-text">{s.item.title}</div>
                {s.item.sheetName && s.item.sheetName !== s.item.title && <div className="au-email">{s.item.sheetName}</div>}
              </div>
              <div className="so-gate">{gateTag(s)}</div>
              <div className="so-prog">{progress(s)}</div>
              <div className="so-state">{status(s)}</div>
              <RightOutlined className="au-chev so-chev" />
            </Link>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="concept au">
      <header className="au-header">
        <h1 className="au-title">{group.title}</h1>
        <p className="au-meta">
          {id} · {project.identity.productSku}
          {reviewOwner && (
            <>
              {' '}· Review owner <b className="so-owner">{reviewOwner}</b>
            </>
          )}
        </p>
        {group.description && <p className="au-desc">{group.description}</p>}
        <p className="au-meta so-counts">
          {sheets.length} {sheets.length === 1 ? 'sheet' : 'sheets'}
          {current && counts.due > 0 && (
            <>
              {' · '}
              <b className="au-meta-warn">
                {counts.due} due at Gate {current.number} (current)
              </b>
            </>
          )}
          {' · '}
          {counts.locked} locked · {counts.closed} closed
        </p>
      </header>

      {guide ? (
        <Tabs
          defaultActiveKey="guide"
          items={[
            {
              key: 'guide',
              label: 'Guide',
              children: (
                <div className="so-guide">
                  {guide.map((sec) => (
                    <section key={sec.title} className="c-card so-guide-card">
                      <h2 className="so-guide-title">{sec.title}</h2>
                      <dl className="so-dl">
                        {sec.rows.map((r) => (
                          <div key={r.topic} className="so-dl-row">
                            <dt>{r.topic}</dt>
                            <dd>{r.instruction}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              ),
            },
            { key: 'reference', label: 'Reference & Feedback', children: <div className="so-guide">{sheetsBlock}</div> },
          ]}
        />
      ) : (
        sheetsBlock
      )}
    </div>
  );
}
