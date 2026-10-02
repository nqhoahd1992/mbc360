import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button, Checkbox, Collapse, Drawer, Empty, Grid, Input, Segmented, Select, Tooltip } from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  LockFilled,
  MinusCircleOutlined,
  RightOutlined,
  UnlockOutlined,
  UpOutlined,
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
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';
import '../styles/concept.css';
import '../components/DynamicTable.css';
import './GateRulesMap.css';

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

// The owner-neutral sheetName the Formula BOM nav item carries. It used to be
// the V18 tab string ('Tuan-Formula_BOM'), which stopped matching any entry
// once tab prefixes moved to `workbookTab` (2026-08-20), so every BOM check
// was silently dropped from this map.
const BOM_SHEET_NAME = 'Formula_BOM';

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
        // A dedicated page has no RegisterConfig, so prefer its own
        // `reviewOwner` override (only set when it differs from the group —
        // see registers.ts) and fall back to the group's, exactly what its
        // own page caption composes from. Without the item-level check, a
        // page filed outside its own owner's group (2026-08-27: "Formulation
        // Safety" under "Quality") would misattribute here too.
        const pageSpec = item.reviewOwner ?? group.reviewOwner;
        if (pageSpec) {
          entry.specs.push(pageSpec);
          const role = pageSpec.owner.role;
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

// Tier as a concept tag tone: the colour sits on the tag, never on the text.
const TIER_TONE: Record<ReadinessTier, string> = {
  Mandatory: 'c-tag-bad',
  Conditional: 'c-tag-warn',
  Supporting: '',
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
  const showGateSheets = (gateId: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (prev.get('gate') === gateId && prev.get('view') !== 'gates') next.delete('gate');
        else next.set('gate', gateId);
        next.delete('view');
        return next;
      },
      { replace: true },
    );
  const setView = (v: 'Sheet map' | 'Gate requirements') =>
    setParam('view', v === 'Gate requirements' ? 'gates' : undefined);

  const sheets = useMemo(buildSheetIndex, []);
  // Which review areas the signed-in person holds ON THIS PROJECT — the
  // workbook's owner tab-prefix, digitised as a per-project lookup.
  const myRoles = useMemo(
    () => rolesAssignedTo(project?.identity.reviewers, user?.displayName),
    [project?.identity.reviewers, user?.displayName],
  );

  // Which sheet's details drawer is open (by key). Details used to be an
  // always-available expanded row; in a drawer the list stays one line per
  // sheet, which is what made this page ~8,000px tall.
  const [openKey, setOpenKey] = useState<string | null>(null);
  useExclusiveDrawer(openKey !== null, () => setOpenKey(null));
  const screens = Grid.useBreakpoint();

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


  const isMine = (entry: SheetEntry) => entry.specs.some((spec) => involvementIn(spec, myRoles).length > 0);
  const currentGate = gateRows.find((r) => r.state === 'current');

  // The sheet's edit-lock state as tags — the same four cases the old "Edit
  // lock" column rendered, with the direction spelled out. "Editable · after
  // Gate 02" reads as "editable once Gate 02 passes" — the exact opposite of
  // the rule (editable UNTIL it passes).
  const lockTags = (entry: SheetEntry) => {
    if (entry.perSectionLock) {
      return (
        <Tooltip title="Each section on this form carries its own gate, so it freezes section by section as those gates pass — not as one sheet. Open the page to see which sections are already read-only.">
          <span className="c-tag">
            <LockFilled />
            Section by section
          </span>
        </Tooltip>
      );
    }
    const lockable = entry.gateRefs.filter((r) => gateRefGateIds(r).length > 0);
    if (lockable.length === 0) {
      return (
        <span className="c-tag">
          <UnlockOutlined />
          {entry.gateRefs.length > 0 ? 'Cross-cutting — never locks' : 'Reference — never locks'}
        </span>
      );
    }
    return lockable.map((r) => {
      const after = locksAfterGateId(r);
      const afterNumber = after ? gateNumberOf(after) : '—';
      const locked = isGateRefLocked(project, r);
      return (
        <Tooltip
          key={r}
          title={
            locked
              ? `Read-only: Gate ${afterNumber} has passed. Editing requires a Backtrack.`
              : `Editable right now. It becomes read-only as soon as Gate ${afterNumber} passes.`
          }
        >
          <span className={`c-tag${locked ? ' c-tag-ok' : ''}`}>
            {locked ? <LockFilled /> : <UnlockOutlined />}
            {locked ? `Read-only — G${afterNumber} passed` : `Editable until G${afterNumber} passes`}
          </span>
        </Tooltip>
      );
    });
  };

  // One tag per blocked gate, red when any of its items there is Mandatory —
  // the old "Blocks a gate?" column; the reasons live in the drawer.
  const blockTags = (entry: SheetEntry) => {
    const gatesBlocked = [...new Set(entry.blocks.map((b) => b.gateNumber))].sort();
    return gatesBlocked.map((n) => {
      const worst = entry.blocks.find((b) => b.gateNumber === n && b.tier === 'Mandatory');
      return (
        <span key={n} className={`c-tag c-tag-dot ${worst ? 'c-tag-bad' : 'c-tag-warn'}`}>
          Blocks G{n}
        </span>
      );
    });
  };

  const ownerLine = (entry: SheetEntry) =>
    entry.ownerRoles.length > 0
      ? entry.ownerRoles.map((role) => `${ownerName({ owner: { role } }, project.identity.reviewers)} (${reviewRoleLabel(role)})`).join(', ')
      : 'No review owner';

  const openIndex = openKey === null ? -1 : filtered.findIndex((e) => e.key === openKey);
  const open = openIndex >= 0 ? filtered[openIndex] : undefined;
  const step = (delta: number) => {
    if (openIndex < 0 || filtered.length === 0) return;
    setOpenKey(filtered[(openIndex + delta + filtered.length) % filtered.length].key);
  };

  const filterChips: SheetFilter[] = ['All sheets', 'Blocks a gate', 'Locked now', 'Never locks'];

  return (
    <div className="concept grm">
      <div className="grm-head">
        <div className="grm-title-row">
          <h1 className="grm-title">Gate Rules &amp; Sheet Map</h1>
          <span className="c-tag">{sheets.length} workbook sheets</span>
          {currentGate && <span className="c-tag c-tag-dot">Current: Gate {currentGate.meta.number}</span>}
        </div>
        <p className="grm-meta">
          {id} · {project.identity.productSku} · lock state below is live for this project
        </p>
        <p className="grm-desc">
          Every workbook sheet against the two rules that control it — what a gate cannot pass without, and what stops
          being editable once a gate passes.
        </p>
      </div>

      {/* ---- The two rules, stated once for the whole page ---- */}
      <div className="c-card grm-rules">
        <div className="grm-rule">
          <CloseCircleFilled className="grm-ic-bad" />
          <div>
            <div className="grm-rule-title">Rule 1 — Blocks the gate</div>
            <div className="grm-rule-text">
              The gate cannot record a Proceed decision until this evidence exists / is complete. Mandatory items
              hard-block <b>both</b> Proceed and Proceed with Conditions; a non-critical open next action is the only
              thing Proceed with Conditions clears.
            </div>
          </div>
        </div>
        <div className="grm-rule">
          <LockFilled className="grm-ic-warn" />
          <div>
            <div className="grm-rule-title">Rule 2 — Locked after the gate passes</div>
            <div className="grm-rule-text">
              Once every gate a sheet belongs to has passed, that sheet becomes read-only across the whole app, so a
              later gate that depends on it cannot be undermined by a silent edit. Correcting it requires a{' '}
              <b>Backtrack</b> (which reopens the gate and invalidates the approvals below it). Sheets tagged{' '}
              <span className="c-tag">All</span> are cross-cutting and never lock.
            </div>
          </div>
        </div>
      </div>

      {/* ---- Gate timeline: the whole 12-gate route at a glance. Scrolls
          inside itself at narrow widths; a step filters the sheet map to the
          sheets that serve or block that gate. ---- */}
      <nav className="c-card grm-steps" aria-label="The 12 gates — blocks outstanding and sheets each gate freezes">
        {PHASES.map((phase) => (
          <div key={phase.phase} className="grm-phase">
            <div className="grm-phase-label">
              {phase.title} <span>· {phase.department}</span>
            </div>
            <div className="grm-phase-steps">
              {gateRows
                .filter((r) => r.meta.phase === phase.phase)
                .map((r) => {
                  const frozen = r.locking.length + r.lockingPages.length;
                  const stateLabel =
                    r.state === 'passed' ? 'Passed' : r.state === 'current' ? 'Current' : r.state === 'gap' ? 'Gap' : r.state === 'hold' ? 'Hold' : 'Locked';
                  const pressed = gateFilter === r.meta.id && view === 'Sheet map';
                  return (
                    <button
                      key={r.meta.id}
                      type="button"
                      className={`grm-step grm-step-${r.state}`}
                      aria-pressed={pressed}
                      aria-current={r.state === 'current' ? 'step' : undefined}
                      onClick={() => showGateSheets(r.meta.id)}
                    >
                      <span className="grm-step-dot">{r.state === 'passed' ? <CheckCircleFilled /> : r.meta.number}</span>
                      <span className="grm-step-text">
                        <span className="grm-step-title">
                          Gate {r.meta.number} <span className="grm-step-state">· {stateLabel}</span>
                        </span>
                        <span className="grm-step-sub">{r.meta.name}</span>
                        <span className="grm-step-meta">
                          {r.unmet.length > 0 ? <CloseCircleFilled className="grm-ic-bad" /> : <CheckCircleFilled className="grm-ic-ok" />}
                          {r.enforced.length - r.unmet.length}/{r.enforced.length} enforced checks met
                        </span>
                        {r.notWired.length > 0 && (
                          <Tooltip title="Mandatory in the confirmed F1/C7 appendix, so it should hard-block — but nothing is wired to it yet, so today it does not. A gap in the system, not a rule.">
                            <span className="grm-step-meta">
                              <ExclamationCircleOutlined className="grm-ic-warn" />
                              {r.notWired.length} mandatory, not wired yet
                            </span>
                          </Tooltip>
                        )}
                        {r.notInForce.length > 0 && (
                          <Tooltip title="Conditional items whose trigger has not fired on this project, plus Supporting items. Not blocking is the confirmed rule for these — a Conditional item DOES hard-block once its trigger applies, and is counted in the line above when it does.">
                            <span className="grm-step-meta">
                              <MinusCircleOutlined />
                              {r.notInForce.length} not in force here
                            </span>
                          </Tooltip>
                        )}
                        <span className="grm-step-meta">
                          <LockFilled className={frozen > 0 ? 'grm-ic-warn' : undefined} />
                          {frozen} sheet{frozen === 1 ? '' : 's'} freeze here
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* ---- One filter toolbar; it wraps rather than widening the page ---- */}
      <div className="c-card grm-toolbar">
        <Segmented value={view} onChange={(v) => setView(v as typeof view)} options={['Sheet map', 'Gate requirements']} />
        {view === 'Sheet map' && (
          <>
            <Input.Search
              allowClear
              className="grm-search"
              placeholder="Search sheet, form or section"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="grm-chips" role="group" aria-label="Show">
              {filterChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="grm-chip"
                  aria-pressed={filter === chip}
                  onClick={() => setFilter(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
            {/* Responsibility as a FACET, not a folder — the workbook's owner
                tab-prefix digitised. Only roles that actually own a sheet are
                offered (5 of the 13 review areas own none). */}
            <Select
              allowClear
              className="grm-select"
              placeholder="Any responsibility"
              value={roleFilter}
              onChange={setRoleFilter}
              popupMatchSelectWidth={false}
              options={REVIEW_ROLES.filter((role) => sheets.some((s) => s.ownerRoles.includes(role.key))).map((role) => ({
                value: role.key,
                label: `${role.label} — ${project.identity.reviewers?.[role.key] ?? 'unassigned'}`,
              }))}
            />
            <Select
              allowClear
              className="grm-select"
              placeholder="Any gate"
              value={gateFilter}
              onChange={setGateFilter}
              popupMatchSelectWidth={false}
              options={GATES.map((g) => ({ value: g.id, label: `Gate ${g.number} — ${g.name}` }))}
            />
            <Tooltip
              title={
                myRoles.length > 0
                  ? `You hold: ${myRoles.map(reviewRoleLabel).join(', ')} on this project.`
                  : 'You are not assigned to a review area on this project, so this filter would return nothing.'
              }
            >
              <Checkbox checked={onlyMine} disabled={myRoles.length === 0} onChange={(e) => setOnlyMine(e.target.checked)}>
                Only mine
              </Checkbox>
            </Tooltip>
          </>
        )}
      </div>

      {view === 'Sheet map' ? (
        <div className="c-card grm-list-card">
          <div className="grm-list-head">
            <div className="grm-list-title">Workbook sheets</div>
            <span className="grm-count">
              {filtered.length} of {sheets.length}
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="rt-empty">No sheet matches these filters.</div>
          ) : (
            <ul className="grm-list">
              {filtered.map((entry) => {
                const href = hrefFor(entry);
                return (
                  <li
                    key={entry.key}
                    className="grm-row rt-row"
                    aria-selected={openKey === entry.key}
                    onClick={() => setOpenKey(entry.key)}
                  >
                    <div className="grm-row-name">
                      <div className="grm-sheet">
                        <button
                          type="button"
                          className="grm-sheet-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenKey(entry.key);
                          }}
                        >
                          {entry.sheetName}
                        </button>
                        {href && (
                          <a
                            className="c-link grm-open"
                            href={`#${href}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${entry.sheetName} in a new tab`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExportOutlined />
                          </a>
                        )}
                      </div>
                      {/* One muted line: the V18 tab (provenance, not owner) and
                          what the sheet is in the app; the full list is in the drawer. */}
                      <div className="grm-forms">
                        {entry.workbookTab && entry.workbookTab !== entry.sheetName && (
                          <>
                            Excel tab: <span className="grm-mono">{entry.workbookTab}</span> ·{' '}
                          </>
                        )}
                        {entry.parts.length} form{entry.parts.length === 1 ? '' : 's'} · {entry.parts.map((p) => p.title).join(' · ')}
                      </div>
                    </div>
                    <div className="grm-row-tags">
                      {blockTags(entry)}
                      {lockTags(entry)}
                      {entry.gateRefs.map((r) => (
                        <span key={r} className="c-tag grm-gate">
                          {formatGate(r)}
                        </span>
                      ))}
                    </div>
                    <div className="grm-row-owner">
                      <span>{ownerLine(entry)}</span>
                      {isMine(entry) && <span className="c-tag c-tag-dot c-tag-warn">Yours</span>}
                    </div>
                    <RightOutlined className="rt-chev grm-chev" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="c-card grm-gates-card">
          <Collapse
            ghost
            defaultActiveKey={gateRows.find((r) => r.state === 'current')?.meta.id}
            items={gateRows.map((r) => ({
              key: r.meta.id,
              label: (
                <span className="grm-tags">
                  <span>
                    <b>Gate {r.meta.number}</b> · {r.meta.name}
                  </span>
                  {r.unmet.length > 0 ? (
                    <span className="c-tag c-tag-dot c-tag-bad">{r.unmet.length} blocking</span>
                  ) : (
                    <span className="c-tag c-tag-dot c-tag-ok">Nothing blocking</span>
                  )}
                  {r.locking.length + r.lockingPages.length > 0 && (
                    <span className="c-tag">
                      <LockFilled />
                      {r.locking.length + r.lockingPages.length} freeze here
                    </span>
                  )}
                </span>
              ),
              children: (
                <div className="grm-gate-body">
                  <div className="grm-muted">
                    {r.meta.purpose} · Decision owner: {r.meta.primaryOwner}
                  </div>

                  <div>
                    <div className="grm-sub-title">
                      <CloseCircleFilled className="grm-ic-bad" />
                      Enforced now — the gate cannot pass until
                    </div>
                    <ul className="grm-ul">
                      {r.enforced.map((item) => (
                        <li key={item.id}>
                          {item.satisfied ? <CheckCircleFilled className="grm-ic-ok" /> : <CloseCircleFilled className="grm-ic-bad" />}
                          <span>
                            {item.label}
                            {!item.hardBlock && !item.satisfied && ' — clears with Proceed with Conditions'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {r.notWired.length > 0 && (
                    <div>
                      <div className="grm-sub-title">
                        <ExclamationCircleOutlined className="grm-ic-warn" />
                        Mandatory, but nothing is wired to it yet ({r.notWired.length}) — should block, does not
                      </div>
                      <ul className="grm-ul">
                        {r.notWired.map((item) => (
                          <li key={item.id}>
                            <span className={`c-tag ${TIER_TONE[item.tier]}`}>{item.tier}</span>
                            <span>{item.label} — no data source wired</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {r.notInForce.length > 0 && (
                    <div>
                      <div className="grm-sub-title">
                        <MinusCircleOutlined />
                        Not in force on this project ({r.notInForce.length}) — by the confirmed rule, not a gap
                      </div>
                      <ul className="grm-ul grm-muted">
                        {r.notInForce.map((item) => (
                          <li key={item.id}>
                            <span className={`c-tag ${TIER_TONE[item.tier]}`}>{item.tier}</span>
                            <span>
                              {item.label}
                              {item.tier === 'Supporting' && ' — never blocks, warns only'}
                              {item.tier === 'Conditional' &&
                                !item.active &&
                                ' — its trigger has not applied on this project; it would hard-block if it did'}
                              {item.tier === 'Conditional' && item.active && !item.evaluable && ' — triggered, but no data source wired'}
                              {!item.evaluable && item.tier === 'Supporting' && ' (no data source wired)'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <div className="grm-sub-title">
                      <LockFilled className="grm-ic-warn" />
                      Becomes read-only once Gate {r.meta.number} passes
                    </div>
                    {r.locking.length + r.lockingPages.length === 0 ? (
                      <div className="grm-muted">Nothing freezes at this gate.</div>
                    ) : (
                      <ul className="grm-ul">
                        {r.lockingPages.map((p) => (
                          <li key={p.title}>
                            <span>{p.title}</span>
                            <span className="c-tag">Page</span>
                            <span className="c-tag">{formatGate(p.gate)}</span>
                            {isGateRefLocked(project, p.gate) && (
                              <span className="c-tag c-tag-ok">
                                <LockFilled />
                                Read-only now
                              </span>
                            )}
                          </li>
                        ))}
                        {r.locking.map((c: RegisterConfig) => (
                          <li key={c.key}>
                            <a className="c-link" href={`#/projects/${id}/registers/reg/${c.key}`} target="_blank" rel="noopener noreferrer">
                              {c.title}
                            </a>
                            <span className="grm-mono grm-muted">{c.sheetName}</span>
                            <span className="c-tag">{formatGate(c.gate)}</span>
                            {isGateRefLocked(project, c.gate) && (
                              <span className="c-tag c-tag-ok">
                                <LockFilled />
                                Read-only now
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grm-muted">
                    Work this gate in the{' '}
                    <Link className="c-link" to={`/projects/${id}/phase/${r.meta.phase}`}>
                      Phase {r.meta.phase}
                    </Link>{' '}
                    page.
                  </div>
                </div>
              ),
            }))}
          />
        </div>
      )}

      {/* Sheet details: read-only, so no draft hint and no footer. */}
      <Drawer
        open={open !== undefined}
        onClose={() => setOpenKey(null)}
        size={screens.md ? 520 : '100%'}
        mask={!screens.xxl}
        closable={false}
        rootClassName="concept-tokens"
        title={
          open && (
            <div className="rt-drawer-head">
              <div style={{ minWidth: 0 }}>
                <div className="rt-drawer-count">
                  {openIndex + 1} of {filtered.length}
                </div>
                <div className="rt-drawer-name grm-mono">{open.sheetName}</div>
                {open.workbookTab && open.workbookTab !== open.sheetName && (
                  <div className="rt-sub">
                    Excel tab: <span className="grm-mono">{open.workbookTab}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <Button type="text" icon={<UpOutlined />} aria-label="Previous" onClick={() => step(-1)} />
                <Button type="text" icon={<DownOutlined />} aria-label="Next" onClick={() => step(1)} />
                <Button type="text" aria-label="Close" onClick={() => setOpenKey(null)}>
                  ✕
                </Button>
              </div>
            </div>
          )
        }
      >
        {open && (
          <div className="rt-sections">
            {hrefFor(open) && (
              <a className="c-link grm-open-link" href={`#${hrefFor(open)}`} target="_blank" rel="noopener noreferrer">
                <ExportOutlined /> Open this sheet in a new tab
              </a>
            )}
            <section>
              <div className="rt-sec-title">Responsibility</div>
              <dl className="rt-dl">
                {/* Responsibility shown as DATA (role + the person assigned on
                    this project), not just as the folder it happens to sit in —
                    several sheets are deliberately filed outside their owner's
                    section, and the person differs per project. */}
                <div className="rt-dl-row">
                  <dt>Responsible</dt>
                  <dd>
                    {open.ownerRoles.length > 0
                      ? open.ownerRoles.map((role) => (
                          <div key={role}>
                            <b>{ownerName({ owner: { role } }, project.identity.reviewers)}</b>{' '}
                            <span className="rt-muted">({reviewRoleLabel(role)})</span>
                          </div>
                        ))
                      : <span className="rt-muted">No review owner</span>}
                    {isMine(open) && <span className="c-tag c-tag-dot c-tag-warn grm-yours">Yours</span>}
                  </dd>
                </div>
                {open.groups.length > 0 && (
                  <div className="rt-dl-row">
                    <dt>Filed under</dt>
                    <dd>{open.groups.join(', ')}</dd>
                  </div>
                )}
                <div className="rt-dl-row">
                  <dt>Gate</dt>
                  <dd>
                    {open.gateRefs.length > 0 ? (
                      <span className="grm-tags">
                        {open.gateRefs.map((r) => (
                          <span key={r} className="c-tag">
                            {formatGate(r)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="rt-dl-row">
                  <dt>Edit lock</dt>
                  <dd>
                    <span className="grm-tags">{lockTags(open)}</span>
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <div className="rt-sec-title">Forms on this sheet ({open.parts.length})</div>
              <ul className="grm-ul grm-forms-ul">
                {open.parts.map((p, i) => {
                  const locked = isGateRefLocked(project, p.gate);
                  return (
                    <li key={`${p.title}-${i}`}>
                      <div className="grm-form-title">{p.title}</div>
                      <span className="grm-tags">
                        <span className="c-tag">
                          {p.mode === 'page' ? 'Page' : p.mode === 'register' ? 'Register' : p.mode === 'form' ? 'Phase form' : 'Reference'}
                        </span>
                        {p.gate && <span className="c-tag">{formatGate(p.gate)}</span>}
                        {p.mode === 'form' ? (
                          <span className="c-tag">
                            <LockFilled />
                            Locks section by section
                          </span>
                        ) : gateRefGateIds(p.gate).length === 0 ? (
                          <span className="c-tag">
                            <UnlockOutlined />
                            Never locks
                          </span>
                        ) : locked ? (
                          <span className="c-tag c-tag-ok">
                            <LockFilled />
                            Read-only — Gate {gateNumberOf(locksAfterGateId(p.gate!)!)} has passed
                          </span>
                        ) : (
                          <span className="c-tag">
                            <UnlockOutlined />
                            Editable until Gate {gateNumberOf(locksAfterGateId(p.gate!)!)} passes
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section>
              <div className="rt-sec-title">Gates this sheet can block ({open.blocks.length})</div>
              {open.blocks.length === 0 ? (
                <div className="rt-muted">None — evidence only.</div>
              ) : (
                <ul className="grm-ul grm-forms-ul">
                  {open.blocks.map((b, i) => (
                    <li key={i}>
                      <span className="grm-tags">
                        <span className={`c-tag c-tag-dot ${TIER_TONE[b.tier]}`}>
                          Gate {b.gateNumber} · {b.tier}
                        </span>
                      </span>
                      <div>
                        {b.label}
                        {!b.enforced && <span className="rt-muted"> — declared, not yet enforced</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
