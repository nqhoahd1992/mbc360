import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Card, Checkbox, Collapse, Empty, Input, Segmented, Select, Table, Tag, Tooltip, Typography } from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleOutlined,
  LockFilled,
  MinusCircleOutlined,
  RightCircleFilled,
  UnlockOutlined,
} from '@ant-design/icons';
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import { GATE_READINESS, type ReadinessCheck, type ReadinessTier } from '@mbc360/shared/config/gateReadiness';
import {
  formatGate,
  getNavGroups,
  getRegisterConfig,
  navItemHref,
  REGISTER_CONFIGS,
  type RegisterConfig,
} from '@mbc360/shared/config/registers';
import {
  involvementIn,
  ownerName,
  REVIEW_ROLES,
  reviewRoleLabel,
  rolesAssignedTo,
  type ReviewOwnerSpec,
} from '@mbc360/shared/config/reviewers';
import {
  evaluateReadinessRequirements,
  gateReadinessChecklist,
  gateRefGateIds,
  gateState,
  isGateRefLocked,
} from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { TEXT, TABLE_STICKY } from '../theme/tokens';

// One-page map of the whole workbook against the two gate rules that govern
// it (2026-07-25, user-requested):
//   1. BLOCKS  — evidence a gate cannot pass without (rule F1/C7 Mandatory,
//      plus B2/F8 next actions and the C1 safety screen).
//   2. LOCKS   — evidence that becomes READ-ONLY once the gate(s) it belongs
//      to have passed, so a later gate that depends on it can't be undermined
//      by a silent edit (rule B4; correcting it requires Backtrack).
// Everything shown here is derived from the same config + rule engine the app
// enforces (`GATE_READINESS`, `REGISTER_CONFIGS`, `gateProgress.ts`) — this
// page never restates a rule in its own words, so it cannot drift from the
// behaviour it documents.

const BOM_SHEET_NAME = 'Tuan-Formula_BOM';

// The four phase forms, by phase number — the workbook tabs that hold the Key
// Gate Checks, option checklists, requirement tables, 8 Angles and sign-off
// for their gates. Rendered by PhasePage from PHASE_CONFIGS, so they have no
// RegisterConfig and must be listed here to appear in the map at all.
const PHASE_SHEET_NAMES: Record<number, string> = {
  1: 'PHASE1 G1-3 MKTG',
  2: 'PHASE2 G4-6 NPD',
  3: 'PHASE3 G7-9 QUAL',
  4: 'PHASE4 G10-12 REG',
};
// Reverse of the map above, so buildSheetIndex can tell a phase sheet from
// the 3 plain system-reference tabs in NON_REGISTER_SHEETS without a second
// lookup table to keep in sync.
const PHASE_BY_SHEET_NAME = new Map(Object.entries(PHASE_SHEET_NAMES).map(([phase, name]) => [name, Number(phase)]));

// Workbook tabs the app models as something OTHER than an evidence register,
// so they carry no RegisterConfig (and therefore no sheetName) and were
// missing from this map entirely until 2026-07-25. Transcribed from the v2
// workbook's own tab list (xl/workbook.xml), so the map covers all 64 tabs.
const NON_REGISTER_SHEETS: { sheetName: string; title: string; group: string; page?: string }[] = [
  {
    sheetName: 'Introduction',
    title: 'Introduction',
    group: 'System Guide & Reference',
    page: 'registers/cat/dept-system',
  },
  {
    sheetName: 'Guide To Using This Document',
    title: 'Guide To Using This Document',
    group: 'System Guide & Reference',
    page: 'registers/cat/dept-system',
  },
  {
    sheetName: 'Stage_Map',
    title: 'Stage Map — the 12 gates, owners and outputs',
    group: 'System Guide & Reference',
    page: 'gate-rules-map',
  },
  ...PHASES.map((p) => ({
    sheetName: PHASE_SHEET_NAMES[p.phase],
    title: `${p.title} — gate flow, checklists, key gate checks, sign-off`,
    group: p.department,
    page: `phase/${p.phase}`,
  })),
];

// Which workbook sheet a readiness check reads. Register-backed checks name
// their register directly; the BOM checks are the Formula BOM sheet; every
// remaining wired check (Key Gate Checks, option checklists, requirement rows,
// next actions, the C1 safety screen, Project Identification) lives on the
// PHASE form of the gate being evaluated — which is a real workbook tab too,
// and the one that carries most of the blocking evidence for Gates 1-3.
function checkSheetName(check: ReadinessCheck, gateId: string): string | undefined {
  switch (check.kind) {
    case 'registerHasRows':
    case 'registerColumnFilled':
    case 'registerNoBadRows':
    case 'registerRowsComplete':
      return getRegisterConfig(check.register)?.sheetName;
    case 'bomHasLines':
    case 'bomIdentityComplete':
    case 'bomReconciled':
    case 'formulaPropertyFilled':
      return BOM_SHEET_NAME;
    case 'gateCheckDone':
    case 'checklistHasSelection':
    case 'requirementDone':
    case 'skincareForTwo':
    case 'nextActionsClosed':
    case 'identityFieldFilled': {
      const phase = GATES.find((g) => g.id === gateId)?.phase;
      return phase ? PHASE_SHEET_NAMES[phase] : undefined;
    }
    default:
      return undefined;
  }
}

interface SheetBlockRule {
  gateNumber: string;
  tier: ReadinessTier;
  label: string;
  enforced: boolean; // false for `manual` checks — declared but not yet wired
}

// One distinct Excel sheet (workbook tab). A sheet can be backed by SEVERAL
// register configs (e.g. "1. Needs & Scientific Basis" holds 5 blocks) and/or
// by a dedicated app page (Formula BOM, Formulation Safety, ...).
interface SheetEntry {
  key: string;
  sheetName: string; // owner-neutral — this is the identity rows are keyed by
  // The literal V18 tab (e.g. `Tuan-Formula_BOM`). Shown ONLY on this page,
  // whose whole job is comparing the app against the Excel file, and shown as
  // provenance rather than as an owner: the person in that prefix is not who
  // looks after the sheet on any given project (project owner's rule,
  // 2026-08-20 — before that the prefixed string WAS the sheetName, so it
  // reached the sidebar and My Sheets too).
  workbookTab?: string;
  parts: { title: string; gate?: string; mode: 'register' | 'fixed' | 'page' | 'form'; registerKey?: string }[];
  groups: string[];
  href?: string;
  gateRefs: string[];
  blocks: SheetBlockRule[];
  // Review-owner ROLE keys for this sheet (a sheet can hold several forms with
  // different owners). The PEOPLE are per-project, so only the roles live here
  // and the name is composed at render time from identity.reviewers.
  ownerRoles: string[];
  specs: ReviewOwnerSpec[];
  // A phase form / system-reference tab: it is real workbook content, but the
  // app models it as PHASE_CONFIGS / GATES / guide text rather than a
  // register, so its edit lock is per SECTION (each checklist row carries its
  // own gate) instead of one lock for the whole sheet.
  perSectionLock?: boolean;
}

// A gate ref locks only once EVERY gate in it has passed, so the gate it
// "locks after" is the last one in the ref.
function locksAfterGateId(gateRef: string): string | undefined {
  const ids = gateRefGateIds(gateRef);
  if (ids.length === 0) return undefined;
  return ids.reduce((last, id) => (GATES.findIndex((g) => g.id === id) > GATES.findIndex((g) => g.id === last) ? id : last));
}

function gateNumberOf(gateId: string): string {
  return GATES.find((g) => g.id === gateId)?.number ?? gateId;
}

function buildSheetIndex(): SheetEntry[] {
  const bySheet = new Map<string, SheetEntry>();
  const ensure = (sheetName: string): SheetEntry => {
    let entry = bySheet.get(sheetName);
    if (!entry) {
      entry = {
        key: sheetName,
        sheetName,
        workbookTab: undefined,
        parts: [],
        groups: [],
        href: undefined,
        gateRefs: [],
        blocks: [],
        ownerRoles: [],
        specs: [],
      };
      bySheet.set(sheetName, entry);
    }
    return entry;
  };

  // The phase forms and system-reference tabs first, so a blocking rule
  // attributed to a phase sheet below always finds its entry.
  for (const sheet of NON_REGISTER_SHEETS) {
    const entry = ensure(sheet.sheetName);
    const phaseNo = PHASE_BY_SHEET_NAME.get(sheet.sheetName);
    const phaseConfig = phaseNo ? PHASE_CONFIGS[phaseNo] : undefined;
    if (phaseConfig) {
      // A phase sheet is not one block — same "several distinct tables on
      // one Excel tab" shape every multi-register sheet has (see the
      // comment on SheetEntry.parts above), just modeled via PHASE_CONFIGS
      // instead of RegisterConfig. Each checklist/requirement section is a
      // real, separately-confirmed table on the source workbook sheet (see
      // CLAUDE.md's Gate 1 option-table note: "all six pick-from-a-list
      // questions on that sheet ... share one 7-column shape") — counting
      // them individually here (2026-08-26, user-reported: the count was
      // flatly 1 for every phase regardless of how many sections it holds,
      // unlike every register-backed sheet) is what makes "N forms" mean
      // the same thing for a phase sheet as it does everywhere else on
      // this page.
      for (const section of phaseConfig.checklistSections) {
        entry.parts.push({ title: section.title, gate: section.gate, mode: 'form' });
      }
      for (const section of phaseConfig.requirementSections) {
        entry.parts.push({ title: section.title, mode: 'form' });
      }
      // Everything else on the sheet that isn't its own confirmed table —
      // the Stage/gate-flow columns, Key Gate Checks, 8 Angles, sign-off —
      // stays one catch-all part rather than being split further, since
      // (unlike the sections above) breaking those out has not been
      // checked against the real workbook cells.
      entry.parts.push({ title: 'Gate flow, Key Gate Checks, 8 Angles & sign-off', mode: 'form' });
    } else {
      entry.parts.push({ title: sheet.title, mode: 'form' });
    }
    entry.groups.push(sheet.group);
    entry.perSectionLock = true;
    if (sheet.page) entry.href = `/projects/:id/${sheet.page}`;
  }

  // Every register block, including the ~23 that are rendered inside a
  // bespoke page rather than listed in the sidebar (Formulation Safety, the
  // NPD Front-End pages, ...) — they are still real workbook content.
  for (const config of REGISTER_CONFIGS) {
    const entry = ensure(config.sheetName);
    entry.workbookTab ??= config.workbookTab;
    entry.parts.push({ title: config.title, gate: config.gate, mode: config.mode, registerKey: config.key });
    if (config.gate && !entry.gateRefs.includes(config.gate)) entry.gateRefs.push(config.gate);
    if (config.reviewOwner) {
      entry.specs.push(config.reviewOwner);
      const role = config.reviewOwner.owner.role;
      if (!entry.ownerRoles.includes(role)) entry.ownerRoles.push(role);
    }
  }

  // Nav groups give each sheet its responsibility section and, for a
  // dedicated-page sheet, the only record of it existing at all.
  for (const group of getNavGroups()) {
    for (const item of group.items) {
      if (!item.sheetName) continue;
      const entry = ensure(item.sheetName);
      entry.workbookTab ??= item.workbookTab;
      if (!entry.groups.includes(group.title)) entry.groups.push(group.title);
      if (!item.registerKey) {
        entry.parts.push({ title: item.title, gate: item.gate, mode: 'page' });
        if (item.gate && !entry.gateRefs.includes(item.gate)) entry.gateRefs.push(item.gate);
        // A dedicated page has no RegisterConfig, so its review owner is the
        // group's — exactly what its own page caption composes from.
        if (group.reviewOwner) {
          entry.specs.push(group.reviewOwner);
          const role = group.reviewOwner.owner.role;
          if (!entry.ownerRoles.includes(role)) entry.ownerRoles.push(role);
        }
      }
      // Prefer a real nav destination (dedicated page or sidebar register).
      if (!entry.href) entry.href = navItemHref(item, ':id');
    }
  }

  // Blocking rules, attributed to the sheet each check actually reads.
  for (const [gateId, reqs] of Object.entries(GATE_READINESS)) {
    for (const req of reqs) {
      const sheetName = checkSheetName(req.check, gateId);
      if (!sheetName) continue;
      const entry = bySheet.get(sheetName);
      if (!entry) continue;
      entry.blocks.push({
        gateNumber: gateNumberOf(gateId),
        tier: req.tier,
        label: req.label,
        enforced: req.check.kind !== 'manual',
      });
    }
  }

  // A register with no nav entry of its own still opens on the generic
  // single-register route, so every sheet stays reachable from this map.
  for (const entry of bySheet.values()) {
    if (entry.href) continue;
    const registerKey = entry.parts.find((p) => p.registerKey)?.registerKey;
    if (registerKey) entry.href = `/projects/:id/registers/reg/${registerKey}`;
  }

  return [...bySheet.values()].sort((a, b) => a.sheetName.localeCompare(b.sheetName));
}

const TIER_COLOR: Record<ReadinessTier, string> = {
  Mandatory: 'red',
  Conditional: 'orange',
  Supporting: 'default',
};

type SheetFilter = 'All sheets' | 'Blocks a gate' | 'Locked now' | 'Never locks';

export default function GateRulesMap() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const { user } = useSession();
  // The six facets live in the URL, not in component state: this page is the
  // one place people go to answer "which sheets block Gate 7" or "what is
  // mine", and those answers get pasted to a colleague. In local state the
  // link carried none of it, a reload dropped the filters, and Back after
  // opening a sheet came back to an unfiltered page.
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const filter = (params.get('show') as SheetFilter | null) ?? 'All sheets';
  const roleFilter = params.get('role') ?? undefined;
  const gateFilter = params.get('gate') ?? undefined;
  const onlyMine = params.get('mine') === '1';
  const view = params.get('view') === 'gates' ? 'Gate requirements' : 'Sheet map';

  // One writer for all six, so a filter change never drops a sibling. Empty
  // and default values are deleted rather than written, keeping a shared link
  // as short as the choices it actually carries.
  const setParam = (key: string, value?: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const setSearch = (v: string) => setParam('q', v);
  const setFilter = (v: SheetFilter) => setParam('show', v === 'All sheets' ? undefined : v);
  const setRoleFilter = (v?: string) => setParam('role', v);
  const setGateFilter = (v?: string) => setParam('gate', v);
  const setOnlyMine = (v: boolean) => setParam('mine', v ? '1' : undefined);
  const setView = (v: 'Sheet map' | 'Gate requirements') =>
    setParam('view', v === 'Gate requirements' ? 'gates' : undefined);

  const sheets = useMemo(buildSheetIndex, []);
  // Which review areas the signed-in person holds ON THIS PROJECT — the
  // workbook's owner tab-prefix, digitised as a per-project lookup.
  const myRoles = useMemo(
    () => rolesAssignedTo(project?.identity.reviewers, user?.displayName),
    [project?.identity.reviewers, user?.displayName],
  );

  if (!project) return <Empty description="Not found" />;
  const id = project.identity.id;
  const hrefFor = (entry: SheetEntry) => entry.href?.replace('/projects/:id', `/projects/${id}`);

  // Per gate: what blocks it (live) and what becomes read-only once it passes.
  const gateRows = GATES.map((meta) => {
    // gateReadinessChecklist now also carries `pending` (Mandatory, still
    // `manual`) and `advisory` (Conditional/Supporting tier) items for the
    // Gate Flow panel's benefit — this page already has its own, richer
    // buckets for those (`notWired`/`notInForce`, built independently below
    // with tier/evaluable detail), so exclude them here to keep "enforced"/"unmet"
    // meaning what they say: checks that actually hard-block today.
    const enforced = gateReadinessChecklist(project, meta.id).filter((i) => !i.pending && !i.advisory);
    const declared = evaluateReadinessRequirements(project, meta.id);
    // These used to be ONE number ("declared, not enforced"), which merged two
    // unrelated things and double-counted a third. Split deliberately:
    //  - notWired: Mandatory, so it SHOULD hard-block, but its check is still
    //    `manual` — no data source exists yet. This is debt, and the only one
    //    of the two that represents a gap in the system.
    //  - notInForce: Conditional whose trigger has not fired on this project,
    //    or Supporting. Not blocking is the CONFIRMED rule for these, not a
    //    shortfall.
    // A Conditional item whose trigger IS active hard-blocks exactly like a
    // Mandatory one, so it belongs in `enforced` and nowhere else — the old
    // `tier !== 'Mandatory'` filter listed it in both buckets at once.
    const enforcedIds = new Set(enforced.map((i) => i.id));
    const notWired = declared.filter((r) => !r.evaluable && r.tier === 'Mandatory');
    const notInForce = declared.filter(
      (r) => !enforcedIds.has(r.id) && !(!r.evaluable && r.tier === 'Mandatory'),
    );
    const locking = REGISTER_CONFIGS.filter((c) => c.gate && locksAfterGateId(c.gate) === meta.id);
    const lockingPages = getNavGroups()
      .flatMap((g) => g.items)
      .filter((i) => !i.registerKey && i.gate && locksAfterGateId(i.gate) === meta.id);
    return {
      meta,
      state: gateState(project, meta.id),
      enforced,
      unmet: enforced.filter((i) => !i.satisfied),
      notWired,
      notInForce,
      locking,
      lockingPages,
    };
  });

  const filtered = sheets.filter((entry) => {
    const q = search.trim().toLowerCase();
    if (q) {
      // The V18 tab string stays searchable so anyone who knows the workbook by
      // its prefixed tab names can still find the sheet — searching is not the
      // same as asserting who owns it.
      const haystack = [entry.sheetName, entry.workbookTab ?? '', ...entry.parts.map((p) => p.title), ...entry.groups]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (roleFilter && !entry.ownerRoles.includes(roleFilter)) return false;
    if (gateFilter) {
      const servesGate = entry.gateRefs.some((r) => gateRefGateIds(r).includes(gateFilter));
      const blocksGate = entry.blocks.some((b) => b.gateNumber === gateNumberOf(gateFilter));
      if (!servesGate && !blocksGate) return false;
    }
    if (onlyMine && !entry.specs.some((spec) => involvementIn(spec, myRoles).length > 0)) return false;
    const lockableRefs = entry.gateRefs.filter((r) => gateRefGateIds(r).length > 0);
    if (filter === 'Blocks a gate') return entry.blocks.length > 0;
    // A phase form belongs to neither lock bucket: it freezes per section, so
    // it is never wholly locked and never wholly exempt.
    if (filter === 'Locked now') return !entry.perSectionLock && lockableRefs.some((r) => isGateRefLocked(project, r));
    if (filter === 'Never locks') return !entry.perSectionLock && lockableRefs.length === 0;
    return true;
  });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Gate Rules &amp; Sheet Map
        </Typography.Title>
        <Typography.Text type="secondary">
          Every workbook sheet ({sheets.length}) against the two rules that control it — what a gate cannot
          pass without, and what stops being editable once a gate passes. Lock state below is live for{' '}
          <b>{id}</b>.
        </Typography.Text>
      </div>

      {/* ---- The two rules, stated once, colour-coded for the whole page ---- */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        <Card size="small" style={{ borderLeft: '4px solid #cf1322' }}>
          <div style={{ fontWeight: 600, color: '#cf1322', marginBottom: 4 }}>
            <CloseCircleFilled style={{ marginRight: 6 }} />
            Rule 1 — Blocks the gate
          </div>
          <Typography.Text style={{ fontSize: 13 }}>
            The gate cannot record a Proceed decision until this evidence exists / is complete. Mandatory items
            hard-block <b>both</b> Proceed and Proceed with Conditions; a non-critical open next action is the
            only thing Proceed with Conditions clears.
          </Typography.Text>
        </Card>
        <Card size="small" style={{ borderLeft: '4px solid #d48806' }}>
          <div style={{ fontWeight: 600, color: '#d48806', marginBottom: 4 }}>
            <LockFilled style={{ marginRight: 6 }} />
            Rule 2 — Locked after the gate passes
          </div>
          <Typography.Text style={{ fontSize: 13 }}>
            Once every gate a sheet belongs to has passed, that sheet becomes read-only across the whole app, so
            a later gate that depends on it cannot be undermined by a silent edit. Correcting it requires a{' '}
            <b>Backtrack</b> (which reopens the gate and invalidates the approvals below it). Sheets tagged{' '}
            <Tag style={{ marginInlineEnd: 0 }}>All</Tag> are cross-cutting and never lock.
          </Typography.Text>
        </Card>
      </div>

      {/* ---- Gate timeline: the whole 12-gate route at a glance ---- */}
      <Card size="small" title="The 12 gates — blocks outstanding and sheets each gate freezes">
        <div style={{ display: 'grid', gap: 12 }}>
          {PHASES.map((phase) => (
            <div key={phase.phase}>
              <div style={{ fontSize: 12, fontWeight: 600, color: phase.color, marginBottom: 6 }}>
                {phase.title} <span style={{ fontWeight: 400, color: TEXT.secondary }}>· {phase.department}</span>
              </div>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {gateRows
                  .filter((r) => r.meta.phase === phase.phase)
                  .map((r) => {
                    const frozen = r.locking.length + r.lockingPages.length;
                    const stateTag =
                      r.state === 'passed' ? (
                        <Tag color="success" icon={<CheckCircleFilled />}>
                          Passed
                        </Tag>
                      ) : r.state === 'current' ? (
                        <Tag color="processing" icon={<RightCircleFilled />}>
                          Current
                        </Tag>
                      ) : r.state === 'gap' ? (
                        <Tag color="volcano">Gap</Tag>
                      ) : r.state === 'hold' ? (
                        <Tag color="warning">Hold</Tag>
                      ) : (
                        <Tag>Locked</Tag>
                      );
                    return (
                      <Card
                        key={r.meta.id}
                        size="small"
                        style={{
                          borderTop: `3px solid ${phase.color}`,
                          background: r.state === 'passed' ? '#f6ffed' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                          <b>Gate {r.meta.number}</b>
                          {stateTag}
                        </div>
                        <div style={{ fontSize: 12, color: '#666', margin: '2px 0 6px' }}>{r.meta.name}</div>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ color: r.unmet.length > 0 ? '#cf1322' : '#389e0d' }}>
                            {r.unmet.length > 0 ? (
                              <CloseCircleFilled style={{ marginRight: 4 }} />
                            ) : (
                              <CheckCircleFilled style={{ marginRight: 4 }} />
                            )}
                            {r.enforced.length - r.unmet.length}/{r.enforced.length} enforced checks met
                          </div>
                          {r.notWired.length > 0 && (
                            <Tooltip title="Mandatory in the confirmed F1/C7 appendix, so it should hard-block — but nothing is wired to it yet, so today it does not. A gap in the system, not a rule.">
                              <div style={{ color: '#d46b08' }}>
                                <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                                {r.notWired.length} mandatory, not wired yet
                              </div>
                            </Tooltip>
                          )}
                          {r.notInForce.length > 0 && (
                            <Tooltip title="Conditional items whose trigger has not fired on this project, plus Supporting items. Not blocking is the confirmed rule for these — a Conditional item DOES hard-block once its trigger applies, and is counted in the line above when it does.">
                              <div style={{ color: '#8c8c8c' }}>
                                <MinusCircleOutlined style={{ marginRight: 4 }} />
                                {r.notInForce.length} not in force here
                              </div>
                            </Tooltip>
                          )}
                          <div style={{ color: frozen > 0 ? '#d48806' : TEXT.disabled }}>
                            <LockFilled style={{ marginRight: 4 }} />
                            {frozen} sheet{frozen === 1 ? '' : 's'} freeze here
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Segmented
          value={view}
          onChange={(v) => setView(v as typeof view)}
          options={['Sheet map', 'Gate requirements']}
        />
        {view === 'Sheet map' && (
          <>
            <Input.Search
              allowClear
              placeholder="Search sheet, form or section"
              style={{ maxWidth: 300 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Segmented
              value={filter}
              onChange={(v) => setFilter(v as SheetFilter)}
              options={['All sheets', 'Blocks a gate', 'Locked now', 'Never locks']}
            />
            {/* Responsibility as a FACET, not a folder — the workbook's owner
                tab-prefix digitised. Only roles that actually own a sheet are
                offered (5 of the 13 review areas own none). */}
            <Select
              allowClear
              placeholder="Any responsibility"
              style={{ minWidth: 190 }}
              value={roleFilter}
              onChange={setRoleFilter}
              options={REVIEW_ROLES.filter((role) => sheets.some((s) => s.ownerRoles.includes(role.key))).map(
                (role) => ({
                  value: role.key,
                  label: `${role.label} — ${project.identity.reviewers?.[role.key] ?? 'unassigned'}`,
                }),
              )}
            />
            <Select
              allowClear
              placeholder="Any gate"
              style={{ minWidth: 150 }}
              value={gateFilter}
              onChange={setGateFilter}
              options={GATES.map((g) => ({ value: g.id, label: `Gate ${g.number} — ${g.name}` }))}
            />
            <Tooltip
              title={
                myRoles.length > 0
                  ? `You hold: ${myRoles.map(reviewRoleLabel).join(', ')} on this project.`
                  : 'You are not assigned to a review area on this project, so this filter would return nothing.'
              }
            >
              <Checkbox
                checked={onlyMine}
                disabled={myRoles.length === 0}
                onChange={(e) => setOnlyMine(e.target.checked)}
              >
                Only mine
              </Checkbox>
            </Tooltip>
          </>
        )}
      </div>

      {view === 'Sheet map' ? (
        <Card size="small" title={`Workbook sheets (${filtered.length} of ${sheets.length})`}>
          <Table
            size="small"
            rowKey="key"
            dataSource={filtered}
            pagination={false}
            sticky={TABLE_STICKY}
            scroll={{ x: 1100 }}
            expandable={{
              expandedRowRender: (entry) => (
                <div style={{ fontSize: 12, display: 'grid', gap: 8 }}>
                  <div>
                    <b>Forms on this sheet</b>
                    <ul style={{ margin: '2px 0 0', paddingLeft: 18 }}>
                      {entry.parts.map((p, i) => {
                        const locked = isGateRefLocked(project, p.gate);
                        return (
                          <li key={`${p.title}-${i}`}>
                            {p.title}{' '}
                            <Tag
                              color={
                                p.mode === 'page'
                                  ? 'purple'
                                  : p.mode === 'register'
                                    ? 'blue'
                                    : p.mode === 'form'
                                      ? 'geekblue'
                                      : 'default'
                              }
                            >
                              {p.mode === 'page'
                                ? 'Page'
                                : p.mode === 'register'
                                  ? 'Register'
                                  : p.mode === 'form'
                                    ? 'Phase form'
                                    : 'Reference'}
                            </Tag>
                            {p.gate && <Tag>{formatGate(p.gate)}</Tag>}
                            {p.mode === 'form' ? (
                              <Tag icon={<LockFilled />} color="warning">
                                Locks section by section
                              </Tag>
                            ) : gateRefGateIds(p.gate).length === 0 ? (
                              <Tag icon={<UnlockOutlined />}>Never locks</Tag>
                            ) : locked ? (
                              <Tag color="error" icon={<LockFilled />}>
                                Read-only — Gate {gateNumberOf(locksAfterGateId(p.gate!)!)} has passed
                              </Tag>
                            ) : (
                              <Tag color="success" icon={<UnlockOutlined />}>
                                Editable until Gate {gateNumberOf(locksAfterGateId(p.gate!)!)} passes
                              </Tag>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {entry.blocks.length > 0 && (
                    <div>
                      <b style={{ color: '#cf1322' }}>Gates this sheet can block</b>
                      <ul style={{ margin: '2px 0 0', paddingLeft: 18 }}>
                        {entry.blocks.map((b, i) => (
                          <li key={i}>
                            <Tag color={TIER_COLOR[b.tier]}>
                              Gate {b.gateNumber} · {b.tier}
                            </Tag>
                            {b.label}
                            {!b.enforced && (
                              <Typography.Text type="secondary"> — declared, not yet enforced</Typography.Text>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ),
            }}
            columns={[
              {
                title: 'Excel sheet',
                width: 230,
                render: (_, entry: SheetEntry) => {
                  const href = hrefFor(entry);
                  return (
                    <div>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                        {href ? (
                          <a href={`#${href}`} target="_blank" rel="noopener noreferrer">
                            {entry.sheetName}
                          </a>
                        ) : (
                          entry.sheetName
                        )}
                      </div>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {entry.parts.length} form{entry.parts.length === 1 ? '' : 's'}
                      </Typography.Text>
                      {entry.workbookTab && entry.workbookTab !== entry.sheetName && (
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            Excel tab: <span style={{ fontFamily: 'monospace' }}>{entry.workbookTab}</span>
                          </Typography.Text>
                        </div>
                      )}
                    </div>
                  );
                },
              },
              {
                title: 'In the app as',
                width: 220,
                render: (_, entry: SheetEntry) => (
                  <span style={{ fontSize: 12 }}>{entry.parts.map((p) => p.title).join(' · ')}</span>
                ),
              },
              {
                // Responsibility shown as DATA (role + the person assigned on
                // this project), not just as the folder it happens to sit in —
                // several sheets are deliberately filed outside their owner's
                // section, and the person differs per project.
                title: 'Responsible',
                width: 210,
                render: (_, entry: SheetEntry) => {
                  const mine = entry.specs.some((spec) => involvementIn(spec, myRoles).length > 0);
                  return (
                    <div style={{ fontSize: 12 }}>
                      {entry.ownerRoles.length > 0 ? (
                        entry.ownerRoles.map((role) => (
                          <div key={role}>
                            <b>{ownerName({ owner: { role } }, project.identity.reviewers)}</b>{' '}
                            <Typography.Text type="secondary">({reviewRoleLabel(role)})</Typography.Text>
                          </div>
                        ))
                      ) : (
                        <Typography.Text type="secondary">No review owner</Typography.Text>
                      )}
                      {mine && (
                        <Tag color="gold" style={{ marginTop: 2 }}>
                          Yours
                        </Tag>
                      )}
                      {entry.groups.length > 0 && (
                        <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                          filed under {entry.groups.join(', ')}
                        </Typography.Text>
                      )}
                    </div>
                  );
                },
              },
              {
                title: 'Gate',
                width: 110,
                render: (_, entry: SheetEntry) =>
                  entry.gateRefs.length > 0 ? (
                    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                      {entry.gateRefs.map((r) => (
                        <Tag key={r} style={{ margin: 0 }}>
                          {formatGate(r)}
                        </Tag>
                      ))}
                    </span>
                  ) : (
                    <Typography.Text type="secondary">—</Typography.Text>
                  ),
              },
              {
                title: 'Blocks a gate?',
                width: 190,
                render: (_, entry: SheetEntry) => {
                  if (entry.blocks.length === 0) {
                    return <Typography.Text type="secondary">No — evidence only</Typography.Text>;
                  }
                  const gatesBlocked = [...new Set(entry.blocks.map((b) => b.gateNumber))].sort();
                  return (
                    <Tooltip
                      title={
                        // A plain '\n'-joined string doesn't break lines inside
                        // antd's Tooltip (its default white-space collapses
                        // them into one run-on sentence) — each reason needs
                        // to be its own block element instead.
                        <div style={{ display: 'grid', gap: 4 }}>
                          {entry.blocks.map((b, i) => (
                            <div key={i}>
                              Gate {b.gateNumber} ({b.tier}): {b.label}
                            </div>
                          ))}
                        </div>
                      }
                    >
                      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                        {gatesBlocked.map((n) => {
                          const worst = entry.blocks.find((b) => b.gateNumber === n && b.tier === 'Mandatory');
                          return (
                            <Tag key={n} color={worst ? 'red' : 'orange'} style={{ margin: 0 }}>
                              Gate {n}
                            </Tag>
                          );
                        })}
                      </span>
                    </Tooltip>
                  );
                },
              },
              {
                title: 'Edit lock',
                width: 210,
                render: (_, entry: SheetEntry) => {
                  if (entry.perSectionLock) {
                    return (
                      <Tooltip title="Each section on this form carries its own gate, so it freezes section by section as those gates pass — not as one sheet. Open the page to see which sections are already read-only.">
                        <Tag color="warning" icon={<LockFilled />}>
                          Section by section
                        </Tag>
                      </Tooltip>
                    );
                  }
                  const lockable = entry.gateRefs.filter((r) => gateRefGateIds(r).length > 0);
                  if (lockable.length === 0) {
                    return (
                      <Tag icon={<UnlockOutlined />}>
                        {entry.gateRefs.length > 0 ? 'Cross-cutting — never locks' : 'Reference — never locks'}
                      </Tag>
                    );
                  }
                  return (
                    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                      {lockable.map((r) => {
                        const after = locksAfterGateId(r);
                        const afterNumber = after ? gateNumberOf(after) : '—';
                        const locked = isGateRefLocked(project, r);
                        // Spell the direction out. "Editable · after Gate 02"
                        // reads as "editable once Gate 02 passes" — the exact
                        // opposite of the rule (editable UNTIL it passes).
                        return (
                          <Tooltip
                            key={r}
                            title={
                              locked
                                ? `Read-only: Gate ${afterNumber} has passed. Editing requires a Backtrack.`
                                : `Editable right now. It becomes read-only as soon as Gate ${afterNumber} passes.`
                            }
                          >
                            <Tag
                              color={locked ? 'error' : 'success'}
                              icon={locked ? <LockFilled /> : <UnlockOutlined />}
                              style={{ margin: 0 }}
                            >
                              {locked
                                ? `Read-only — G${afterNumber} passed`
                                : `Editable until G${afterNumber} passes`}
                            </Tag>
                          </Tooltip>
                        );
                      })}
                    </span>
                  );
                },
              },
            ]}
          />
        </Card>
      ) : (
        <Collapse
          defaultActiveKey={gateRows.find((r) => r.state === 'current')?.meta.id}
          items={gateRows.map((r) => {
            const phase = PHASES.find((p) => p.phase === r.meta.phase)!;
            return {
              key: r.meta.id,
              label: (
                <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                  <span>
                    <b style={{ color: phase.color }}>Gate {r.meta.number}</b> · {r.meta.name}
                  </span>
                  {r.unmet.length > 0 ? (
                    <Tag color="error" style={{ margin: 0 }}>
                      {r.unmet.length} blocking
                    </Tag>
                  ) : (
                    <Tag color="success" style={{ margin: 0 }}>
                      Nothing blocking
                    </Tag>
                  )}
                  {r.locking.length + r.lockingPages.length > 0 && (
                    <Tag color="warning" icon={<LockFilled />} style={{ margin: 0 }}>
                      {r.locking.length + r.lockingPages.length} freeze here
                    </Tag>
                  )}
                </span>
              ),
              children: (
                <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
                  <Typography.Text type="secondary">
                    {r.meta.purpose} · Decision owner: {r.meta.primaryOwner}
                  </Typography.Text>

                  <div>
                    <div style={{ fontWeight: 600, color: '#cf1322' }}>Enforced now — the gate cannot pass until</div>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
                      {r.enforced.map((item) => (
                        <li key={item.id} style={{ color: item.satisfied ? '#389e0d' : '#cf1322' }}>
                          {item.satisfied ? '✓ ' : ''}
                          {item.label}
                          {!item.hardBlock && !item.satisfied && ' — clears with Proceed with Conditions'}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {r.notWired.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, color: '#d46b08' }}>
                        Mandatory, but nothing is wired to it yet ({r.notWired.length}) — should block, does not
                      </div>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: '#d46b08', display: 'grid', gap: 4 }}>
                        {r.notWired.map((item) => (
                          <li key={item.id}>
                            <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                              <Tag color={TIER_COLOR[item.tier]} style={{ margin: 0 }}>
                                {item.tier}
                              </Tag>
                              <span>{item.label} — no data source wired</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {r.notInForce.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, color: '#8c8c8c' }}>
                        Not in force on this project ({r.notInForce.length}) — by the confirmed rule, not a gap
                      </div>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: '#8c8c8c', display: 'grid', gap: 4 }}>
                        {r.notInForce.map((item) => (
                          <li key={item.id}>
                            <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                              <Tag color={TIER_COLOR[item.tier]} style={{ margin: 0 }}>
                                {item.tier}
                              </Tag>
                              <span>
                                {item.label}
                                {item.tier === 'Supporting' && ' — never blocks, warns only'}
                                {item.tier === 'Conditional' &&
                                  !item.active &&
                                  ' — its trigger has not applied on this project; it would hard-block if it did'}
                                {item.tier === 'Conditional' && item.active && !item.evaluable && ' — triggered, but no data source wired'}
                                {!item.evaluable && item.tier === 'Supporting' && ' (no data source wired)'}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <div style={{ fontWeight: 600, color: '#d48806' }}>
                      <LockFilled style={{ marginRight: 4 }} />
                      Becomes read-only once Gate {r.meta.number} passes
                    </div>
                    {r.locking.length + r.lockingPages.length === 0 ? (
                      <Typography.Text type="secondary">Nothing freezes at this gate.</Typography.Text>
                    ) : (
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
                        {r.lockingPages.map((p) => (
                          <li key={p.title}>
                            <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                              <span>{p.title}</span>
                              <Tag color="purple" style={{ margin: 0 }}>
                                Page
                              </Tag>
                              <Tag style={{ margin: 0 }}>{formatGate(p.gate)}</Tag>
                              {isGateRefLocked(project, p.gate) && (
                                <Tag color="error" icon={<LockFilled />} style={{ margin: 0 }}>
                                  Read-only now
                                </Tag>
                              )}
                            </span>
                          </li>
                        ))}
                        {r.locking.map((c: RegisterConfig) => (
                          <li key={c.key}>
                            <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                              <a
                                href={`#/projects/${id}/registers/reg/${c.key}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {c.title}
                              </a>
                              <Typography.Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                                {c.sheetName}
                              </Typography.Text>
                              <Tag style={{ margin: 0 }}>{formatGate(c.gate)}</Tag>
                              {isGateRefLocked(project, c.gate) && (
                                <Tag color="error" icon={<LockFilled />} style={{ margin: 0 }}>
                                  Read-only now
                                </Tag>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Work this gate in the <Link to={`/projects/${id}/phase/${r.meta.phase}`}>Phase {r.meta.phase}</Link>{' '}
                    page.
                  </Typography.Text>
                </div>
              ),
            };
          })}
        />
      )}
    </div>
  );
}
