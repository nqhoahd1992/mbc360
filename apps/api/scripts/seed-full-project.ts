// seed-full-project.ts — DEV TOOL: create ONE project with data in every part of the app: all 12 gate records, the four phase pages
// (checklists, requirement tables, key gate checks, 8 angles, evidence summaries), every workbook register, the Formula BOM and the
// Packaging BOM with costing, three formula versions, change control records, next actions, per-market tracks, CAPA records,
// panel feedback on two samples and evidence items. (Not seeded: the study approval trail, which the server only accepts from
// people who each have a department on their account — the seed uses one administrator.)
//
//   npm run db:seed-full-project                         # 4 markets, gates left open for work
//   npm run db:seed-full-project -- --name "Demo balm" --passed 5   # also mark Gates 1-5 Complete / Proceed
//
// How it works
//   - creates the project through the real API (so every server guard runs) and fills each section through its own route,
//     in an order the guards accept (evidence rows before the BOM that uses them, formula versions before any gate passes);
//   - every person field is the FIRST pinned administrator (PINNED_ADMINS); every value is obviously fake ("SEED ...");
//   - a section the API refuses is reported and skipped — the rest still goes in; the summary at the end says what is missing;
//   - the bypasses: gate records and the two later formula versions are written straight to the database, because only the current
//     gate accepts edits through the API and a new version only while Gate 05 is open. `--passed N` sets Gates 1-N to Complete + Proceed the same way. It does NOT make readiness true or record the
//     gate/phase signatures, so a "passed" gate here is a status in the data, not a signed one — use db:seed-gate-project for that.
//
// Needs the API running (`npm run dev`, or API_URL=...) and apps/api/.env. Refuses a non-localhost database unless --allow-remote.
// It never deletes anything; every run creates a new project (SEED-FULL-<stamp>).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { sign as signJwt } from 'jsonwebtoken';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { GATES, EIGHT_ANGLES } from '../../../packages/shared/src/config/gates';
import { CHANGE_TRIGGERS } from '../../../packages/shared/src/config/changeTriggers';
import { PHASE_CONFIGS } from '../../../packages/shared/src/config/phases';
import { REGISTER_CONFIGS, type RegisterColumn, type RegisterConfig } from '../../../packages/shared/src/config/registers';
import { REVIEW_ROLES } from '../../../packages/shared/src/config/reviewers';
import type { ProjectData, RegisterRow } from '../../../packages/shared/src/types';

// ---------------------------------------------------------------- arguments ----
const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const has = (name: string) => argv.includes(`--${name}`);
function die(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const passed = Number(flag('passed') ?? 0);
if (!Number.isInteger(passed) || passed < 0 || passed > 12) die('--passed must be 0-12');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) die('DATABASE_URL is not set (run from apps/api, or set it in apps/api/.env).');
if (!has('allow-remote') && !/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)) {
  die('DATABASE_URL does not point at localhost. Pass --allow-remote if you really mean it.');
}
const API = (process.env.API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const secret = process.env.SESSION_SECRET ?? 'dev-only-insecure-session-secret';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const SEED = 'SEED';
const today = new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const MARKETS = ['Vietnam', 'Australia', 'Singapore', 'Malaysia'];

// ------------------------------------------------------------------ API ----
let cookie = '';
async function api<T = any>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie, ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.replace(/\s+/g, ' ').slice(0, 260)}`);
  return (text ? JSON.parse(text) : undefined) as T;
}

let project: ProjectData;
let version = 0;
let id = '';
const take = (env: any) => {
  project = env.project ?? env;
  version = env.version ?? version;
};
const reload = async () => take(await api('GET', `/projects/${encodeURIComponent(id)}`));
const put = async (path: string, body: Record<string, unknown>) => take(await api('PUT', `/projects/${id}${path}`, { ...body, expectedVersion: version }));

// Each step reports once and never stops the run: a refused section is listed in the summary.
const failures: string[] = [];
let ok = 0;
async function step(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
    ok += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.log(`  ✖ ${name} — ${(err as Error).message.slice(0, 150)}`);
  }
}

// ------------------------------------------------------- register values ----
let adminName = '';
const DONE = /^(complete|completed|approved|supported|closed|y|yes|released|verified)$/i;
const AVOID = /^(not started|pending|n\/a|na|not applicable|no|blocked|rejected|withdrawn)/i;

function cellValue(config: RegisterConfig, col: RegisterColumn, row: number): unknown {
  switch (col.type) {
    case 'select': {
      const options = (col.options ?? []) as string[];
      return options.find((o) => DONE.test(o)) ?? options.find((o) => !AVOID.test(o)) ?? options[0] ?? '';
    }
    case 'date':
      return inDays(-10 + row);
    case 'checkbox':
      // "No product claim" would contradict the Claim ID the same row links.
      return /^noProductClaim/.test(col.key) ? false : true;
    case 'number':
      return 10 + row;
    case 'user':
      return adminName;
    case 'market':
      return MARKETS[row % MARKETS.length];
    case 'claimRef': {
      const claims = (project.registers['claimEvidenceTraceability'] ?? []).map((r) => String(r.claimId ?? '')).filter(Boolean);
      return claims[row % Math.max(claims.length, 1)] ?? '';
    }
    case 'rowRef': {
      const ref = (col as { refRegister?: string; refColumn?: string });
      const rows = project.registers[ref.refRegister ?? ''] ?? [];
      return String(rows[row % Math.max(rows.length, 1)]?.[ref.refColumn ?? ''] ?? '');
    }
    case 'text':
    case 'textarea':
      if (/link|url|ref$/i.test(col.key)) return `https://example.com/seed/${config.key}/${col.key}`;
      return `${SEED} ${col.label}${config.mode === 'register' ? ` ${row + 1}` : ''}`;
    default:
      return undefined; // signature, multiSelect, nextActionRef ... — never invented
  }
}

// Registers whose rows must carry real keys other sections point at (the BOM picks from Supplier & RM Evidence).
const RM = [
  { rmCode: 'RM-001', inciName: 'Aqua', grade: 'Purified water', supplier: 'Local utility', pct: 62.9, cost: 0.02 },
  { rmCode: 'RM-002', inciName: 'Butyrospermum Parkii Butter', grade: 'Shea butter refined', supplier: 'Shea Co', pct: 12, cost: 6.5 },
  { rmCode: 'RM-003', inciName: 'Caprylic/Capric Triglyceride', grade: 'Emollient MCT', supplier: 'Oleo Ltd', pct: 10, cost: 4.2 },
  { rmCode: 'RM-004', inciName: 'Glycerin', grade: 'Glycerin USP', supplier: 'Glyco', pct: 5, cost: 1.8 },
  { rmCode: 'RM-005', inciName: 'Cetearyl Alcohol', grade: 'Cetearyl 50/50', supplier: 'Oleo Ltd', pct: 4, cost: 3.1 },
  { rmCode: 'RM-006', inciName: 'Panthenol', grade: 'D-Panthenol 75%', supplier: 'Vita Chem', pct: 2, cost: 22 },
  { rmCode: 'RM-007', inciName: 'Tocopherol', grade: 'Vitamin E natural', supplier: 'Vita Chem', pct: 0.6, cost: 35 },
  { rmCode: 'RM-008', inciName: 'Phenoxyethanol', grade: 'Preservative PE', supplier: 'Preserv Inc', pct: 0.8, cost: 9 },
  { rmCode: 'RM-009', inciName: 'Sodium Hyaluronate', grade: 'HA low MW', supplier: 'Bio Actives', pct: 0.1, cost: 900 },
  { rmCode: 'RM-010', inciName: 'Xanthan Gum', grade: 'Xanthan 80 mesh', supplier: 'Gum Co', pct: 0.3, cost: 12 },
  { rmCode: 'RM-011', inciName: 'Citric Acid', grade: 'pH adjuster', supplier: 'Acid Co', pct: 0.1, cost: 2 },
  { rmCode: 'RM-012', inciName: 'Allantoin', grade: 'Allantoin', supplier: 'Bio Actives', pct: 0.2, cost: 14 },
];

const ROW_COUNT: Record<string, number> = { supplierRmEvidence: RM.length, vulnerableUserAssessment: 1 };
const OVERRIDES: Record<string, (row: number) => Record<string, unknown>> = {
  vulnerableUserAssessment: () => ({ vulnerableGroup: 'No vulnerable-user group identified' }),
  publishedInfoApproval: () => ({ workflowState: 'Draft' }),
  supplierRmEvidence: (i) => ({ rmCode: RM[i].rmCode, inciName: RM[i].inciName, grade: RM[i].grade, supplier: RM[i].supplier, approvedForUse: true, evidenceStatus: '' }),
};
// Processed first, in this order: later registers pick values out of these.
const FIRST = ['claimEvidenceTraceability', 'supplierRmEvidence', 'releasedLabelRegister', 'batchFormulaTrace', 'productFamilyRegister'];

async function fillRegister(config: RegisterConfig): Promise<void> {
  const current: RegisterRow[] = (project.registers[config.key] ?? []).map((r) => ({ ...r }));
  const count = config.mode === 'fixed' ? current.length : (ROW_COUNT[config.key] ?? 3);
  const rows: RegisterRow[] = [];
  for (let i = 0; i < count; i++) {
    const row: RegisterRow = { ...(current[i] ?? {}) };
    for (const col of config.columns) {
      if (col.editable === false || col.autoId) continue;
      const have = row[col.key];
      if (have !== undefined && have !== null && have !== '' && have !== false) continue;
      const v = cellValue(config, col, i);
      if (v !== undefined && v !== '') row[col.key] = v as never;
    }
    Object.assign(row, OVERRIDES[config.key]?.(i) ?? {});
    rows.push(row);
  }
  if (rows.length === 0) return;
  await put(`/registers/${encodeURIComponent(config.key)}`, { rows });
}

// Change and CAPA ids are unique across the whole database: continue after the highest one already there.
function nextFrom(prefix: string, codes: string[]): number {
  const re = new RegExp(`^${prefix}-([0-9]+)$`);
  return codes.reduce((m, c) => Math.max(m, Number(re.exec(c)?.[1] ?? 0)), 0) + 1;
}

// ----------------------------------------------------------------- main ----
async function main() {
  const pinned = (process.env.PINNED_ADMINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)[0];
  if (!pinned) die('PINNED_ADMINS is empty in apps/api/.env — there is no administrator to act as.');
  const admin = await prisma.user.findFirst({ where: { email: { equals: pinned, mode: 'insensitive' } } });
  if (!admin) die(`The pinned administrator ${pinned} has no user row yet — start the API once so it is created.`);
  adminName = admin.displayName;
  cookie = `mbc360_session=${signJwt({ sub: admin.id }, secret, { expiresIn: 3600 })}`;
  try {
    await api('GET', '/projects');
  } catch (err) {
    die(`Cannot reach the API at ${API} as ${pinned}: ${(err as Error).message}`);
  }

  const stamp = Date.now().toString(36).toUpperCase();
  id = `${SEED}-FULL-${stamp}`;
  const title = flag('name') ?? 'Full demo project';
  console.log(`Creating ${id} ...`);
  take(
    await api(
      'POST',
      '/projects',
      {
        id,
        productCode: id,
        projectLead: adminName,
        productGroup: `${SEED} group`,
        brandCustomer: `${SEED} brand`,
        dateOpened: today,
        targetLaunchDate: inDays(240),
        productSku: `[${SEED}] ${title}`,
        ownerDepartment: 'NPD',
        markets: MARKETS,
        reviewers: Object.fromEntries(REVIEW_ROLES.map((r) => [r.key, adminName])),
      },
      { 'Idempotency-Key': `seed-${id}` },
    ),
  );

  // ---- phase pages: checklists, requirement tables, key gate checks, angles, evidence summaries
  console.log('Phase pages');
  const benign = /pregnan|breast|postpartum|infant|child|baby|teen|elder|sensitiv|eczema|compromis|dry|family|vulnerab|swim/i;
  await step('checklists (first benign option ticked in each)', async () => {
    for (const section of Object.values(PHASE_CONFIGS).flatMap((p) => p.checklistSections)) {
      const items = project.checklists[section.key] ?? [];
      if (items.length === 0) continue;
      const pick = Math.max(0, items.findIndex((i) => !benign.test(i.label) && !/^other/i.test(i.label)));
      const next = items.map((item, i) => (i === pick ? { ...item, selected: true, status: 'Y' as const, notes: `${SEED} note`, ...(section.requiresPrimary ? { isPrimary: true } : {}) } : item));
      try {
        await put(`/checklists/${encodeURIComponent(section.key)}`, { items: next });
      } catch (err) {
        failures.push(`checklist ${section.key}: ${(err as Error).message.slice(0, 140)}`);
      }
    }
  });
  await step('requirement tables (every row complete)', async () => {
    for (const section of Object.values(PHASE_CONFIGS).flatMap((p) => p.requirementSections)) {
      const items = project.requirements[section.key] ?? [];
      if (items.length === 0) continue;
      const doneWord = section.statusOptions?.includes('Complete') ? 'Complete' : 'Completed';
      const next = items.map((r) => ({ ...r, status: doneWord, owner: r.owner || adminName, priority: r.priority || 'Must', minimumRequirement: r.minimumRequirement || `${SEED} requirement`, rationale: r.rationale || `${SEED} rationale` }));
      try {
        await put(`/requirements/${encodeURIComponent(section.key)}`, { items: next });
      } catch (err) {
        failures.push(`requirements ${section.key}: ${(err as Error).message.slice(0, 140)}`);
      }
    }
  });
  await step('key gate checks (all done)', async () => {
    const updates = project.gateChecks.map((c) => ({ gate: c.gate, check: c.check, patch: { done: true, ynna: 'Y', date: today, initials: 'SD', evidenceRef: `${SEED} evidence`, notes: `${SEED} note` } }));
    for (let i = 0; i < updates.length; i += 25) await put('/gate-checks', { updates: updates.slice(i, i + 25) });
  });
  for (const phase of [1, 2, 3, 4]) {
    await step(`phase ${phase}: 8 angles, evidence summary, key links`, async () => {
      await put(`/phases/${phase}/angles`, {
        angles: EIGHT_ANGLES.map((angle) => ({ angle, ynna: 'Y', covered: true, date: today, evidenceRef: `${SEED} evidence`, initials: 'SD', comments: `${SEED} covered` })),
      });
      await put(`/phases/${phase}/evidence-summary`, { value: `${SEED}: evidence summary for phase ${phase}.` });
      const labels = (PHASE_CONFIGS[phase as 1 | 2 | 3 | 4].keyLinks ?? []).map((l) => l.label);
      if (labels.length > 0) await put(`/phases/${phase}/key-links`, { links: Object.fromEntries(labels.map((l) => [l, `https://example.com/seed/${phase}/${encodeURIComponent(l)}`])) });
    });
  }

  // ---- registers (company-reference dependencies first)
  console.log('Registers');
  const ordered = [...FIRST.map((k) => REGISTER_CONFIGS.find((c) => c.key === k)).filter((c): c is RegisterConfig => !!c), ...REGISTER_CONFIGS.filter((c) => !FIRST.includes(c.key))];
  for (const config of ordered) {
    await step(`register ${config.key}`, async () => {
      await reload();
      await fillRegister(config);
    });
  }

  // ---- formula: properties, BOM, packaging, costing, then three versions
  console.log('Formula, packaging, costing');
  await step('formula properties', () => put('/formula-properties', { patch: { microSusceptibility: 'Susceptible', microRationale: `${SEED} water-based emulsion`, confirmedProductForm: 'Balm' } }));
  await step('Formula BOM (12 lines = 100 %)', () =>
    put('/bom', {
      lines: RM.map((r, i) => ({ line: i + 1, rmCode: r.rmCode, inciName: r.inciName, functionRole: i === 0 ? 'Solvent' : i < 4 ? 'Emollient' : 'Functional', supplier: r.supplier, percentWw: r.pct, costPerKg: r.cost, rmDisplayName: `${r.grade} | ${r.rmCode}`, evidenceLink: `https://example.com/seed/bom/${r.rmCode}` })),
    }),
  );
  await step('Packaging BOM (4 lines)', () =>
    put('/packaging-bom', {
      lines: [
        { component: 'Tube 50 mL', componentType: 'Primary', supplier: 'Pack Co', unitsPerFinishedUnit: 1, unitCost: 0.28, wastagePercent: 3 },
        { component: 'Cap', componentType: 'Primary', supplier: 'Pack Co', unitsPerFinishedUnit: 1, unitCost: 0.08, wastagePercent: 2 },
        { component: 'Carton', componentType: 'Secondary', supplier: 'Print Ltd', unitsPerFinishedUnit: 1, unitCost: 0.19, wastagePercent: 4 },
        { component: 'Leaflet', componentType: 'Secondary', supplier: 'Print Ltd', unitsPerFinishedUnit: 1, unitCost: 0.03, wastagePercent: 5 },
      ].map((l, i) => ({ line: i + 1, ...l })),
    }),
  );
  await step('costing and commercial feasibility', () =>
    put('/costing', {
      patch: { batchSizeKg: 100, fillSizeG: 50, targetUnits: 10000, packagingCostPerUnit: 0.58, labourOverheadPerUnit: 0.35, freightOtherPerUnit: 0.12, targetSellPrice: 7.9, feasibilityStatus: 'Commercially Feasible', assessor: adminName, reviewDate: today, assumptions: `${SEED}: volumes and prices assumed`, evidenceLink: 'https://example.com/seed/costing' },
    }),
  );
  await step('formula versions F1.1 (Minor) and F2.0 (Major)', async () => {
    // Straight to the database: the route needs Gate 05 to be the open gate. Each version keeps its own copy of the BOM.
    const first = await prisma.formulaVersion.findFirstOrThrow({ where: { projectId: id }, include: { bomLines: true }, orderBy: { createdAt: 'desc' } });
    const tweak = (lines: typeof first.bomLines, n: number) =>
      lines.map((l) => ({ line: l.line, rmCode: l.rmCode, inciName: l.inciName, functionRole: l.functionRole, supplier: l.supplier, percentWw: l.rmCode === 'RM-008' ? 0.8 + n * 0.1 : l.rmCode === 'RM-001' ? Math.round((l.percentWw - n * 0.1) * 10) / 10 : l.percentWw, costPerKg: l.costPerKg, evidenceLink: l.evidenceLink, rmDisplayName: l.rmDisplayName, fromCosmetri: false, reconciled: false }));
    let previous = first;
    for (const [n, spec] of [
      { version: 'F1.1', changeType: 'Minor', reason: `${SEED}: preservative level adjusted` },
      { version: 'F2.0', changeType: 'Major', reason: `${SEED}: new emollient system and preservative` },
    ].entries()) {
      await prisma.formulaVersion.update({ where: { id: previous.id }, data: { status: 'Superseded' } });
      previous = await prisma.formulaVersion.create({
        data: {
          projectId: id,
          version: spec.version,
          previousVersionId: previous.id,
          changeType: spec.changeType,
          reason: spec.reason,
          initiatedBy: adminName,
          classificationConfirmedBy: adminName,
          status: 'Active',
          createdAt: new Date(Date.now() + (n + 1) * 1000),
          bomLines: { create: tweak(previous.bomLines, n + 1) },
        },
        include: { bomLines: true },
      });
    }
    await prisma.project.update({ where: { id }, data: { version: { increment: 1 } } });
    await reload();
  });

  // ---- next actions, change control, evidence, markets, CAPA, feedback, study
  console.log('Records');
  await reload();
  let changeBase = 1;
  const capaBase = await nextFrom('CAPA', (await prisma.capaRecord.findMany({ select: { code: true } })).map((c) => c.code));
  const capaId = (n: number) => `CAPA-${String(capaBase + n).padStart(3, '0')}`;
  await step('next actions (one per gate, in different states)', () =>
    put('/next-actions', {
      gateIds: GATES.map((g) => g.id),
      actions: GATES.map((g, i) => ({ id: `NA-${String(i + 1).padStart(3, '0')}`, gateId: g.id, description: `${SEED}: follow-up for ${g.name}`, owner: adminName, dueDate: inDays(10 + i * 7), status: (['Open', 'In Progress', 'Awaiting Information'] as const)[i % 3], priority: i % 4 === 0 ? 'High' : 'Medium' })),
    }),
  );
  await step('change control (3 records)', async () => {
    // Only a trigger that applies to every gate can be opened before any gate has passed (SW-30); three records reuse it.
    const always = CHANGE_TRIGGERS.filter((t) => t.gates.includes('ALL'));
    const triggers = [0, 1, 2].map((i) => always[i % Math.max(always.length, 1)]);
    changeBase = await nextFrom('CHG', (await prisma.changeRecord.findMany({ select: { changeId: true } })).map((c) => c.changeId));
    const statuses = ['Draft', 'Under Review', 'In Implementation'] as const;
    await put('/changes', {
      records: triggers.map((t, i) => ({ changeId: `CHG-${String(changeBase + i).padStart(3, '0')}`, projectId: id, triggerId: t.id, trigger: t.label, productSku: project.identity.productSku, affectedArea: 'Formula / ingredient', oldVersion: 'F1.0', riskLevel: i === 0 ? 'Medium' : 'Low', impactAreas: ['Formula', 'Packaging'], requiredAction: `${SEED} action`, communicationRequired: true, salesMarketingMessage: `${SEED} message`, dueDate: inDays(20 + i), owner: adminName, status: statuses[i], notes: `${SEED} change` })),
    });
  });
  await step('evidence summary items', () => put('/evidence', { items: project.evidence.map((e) => ({ ...e, status: 'Complete', evidenceLink: e.evidenceLink || `https://example.com/seed/evidence/${encodeURIComponent(e.area)}`, notes: `${SEED} note` })) }));
  await step('market tracks (one launched, three in progress)', () =>
    put('/market-tracks', {
      tracks: MARKETS.map((m, i) => ({ ...(project.marketTracks.find((t) => t.market === m) ?? { market: m }), market: m, formulaVersion: project.formulaVersion, pifStatus: i === 0 ? 'Approved' : 'In Progress', regulatoryStatus: i === 0 ? 'Approved' : 'In Progress', claimsApproval: i === 0 ? 'Approved' : 'In Progress', launchApproval: i === 0 ? 'Approved' : 'Not Started', regulatoryNotes: `${SEED} note`, ...(i === 0 ? { pifApprovedDate: inDays(-30), launchApprovedDate: inDays(-14) } : {}) })),
    }),
  );
  await step('post-market / CAPA (3 records)', () =>
    put('/capa', {
      records: [
        { id: capaId(0), market: MARKETS[0], eventType: 'Complaint', summary: `${SEED}: customer reports a thin texture`, severity: 'Low', status: 'In Progress', owner: adminName, productSku: project.identity.productSku, investigationLink: 'https://example.com/seed/inv', capaLink: 'https://example.com/seed/capa', pifPmfImpact: 'None' },
        { id: capaId(1), market: MARKETS[1], eventType: 'Packaging issue', summary: `${SEED}: cap loosens in transit`, severity: 'Medium', status: 'Not Started', owner: adminName, productSku: project.identity.productSku },
        { id: capaId(2), market: MARKETS[0], eventType: 'Adverse event / PV signal', summary: `${SEED}: mild skin reaction reported`, severity: 'High', status: 'Needs Review', owner: adminName, productSku: project.identity.productSku, investigationLink: 'https://example.com/seed/inv3' },
      ],
    }),
  );
  await step('panel feedback (2 samples, 3 testers each)', async () => {
    const [s1, s2] = [randomUUID(), randomUUID()];
    const entry = (n: number, sampleId: string, name: string, scores: [number, number, number], oily: string) => ({ id: `FB-${String(n).padStart(3, '0')}`, sampleId, testerName: name, gender: n % 2 ? 'F' : 'M', dept: 'QA', dateTested: today, texture: scores[0], fragrance: scores[1], overall: scores[2], tooOilySlippery: oily, wouldRecommend: scores[2] >= 4 ? 'Yes' : 'Maybe' });
    await put('/feedback', {
      samples: [
        { id: s1, productFamily: undefined, developmentStage: 'Prototype', sampleBatchCode: 'B-001', formulaVersion: 'F1.0', dateIssued: inDays(-60), panelCoordinator: adminName },
        { id: s2, developmentStage: 'Pilot', sampleBatchCode: 'B-002', formulaVersion: 'F1.1', dateIssued: inDays(-25), panelCoordinator: adminName, linkedChangeId: `CHG-${String(changeBase).padStart(3, '0')}` },
      ],
      entries: [
        entry(1, s1, 'Tester A', [3, 3, 3], 'No'), entry(2, s1, 'Tester B', [3, 4, 3], 'Borderline'), entry(3, s1, 'Tester C', [2, 3, 3], 'No'),
        entry(4, s2, 'Tester D', [4, 4, 4], 'No'), entry(5, s2, 'Tester E', [5, 4, 5], 'No'), entry(6, s2, 'Tester F', [4, 3, 4], 'No'),
      ],
    });
  });

  // ---- gate flow records: straight to the database (only the current gate accepts edits through the API)
  console.log('Gate records');
  await step('12 gate records (owner, due date, evidence link, notes)', async () => {
    for (let n = 1; n <= 12; n++) {
      const gate = `SG${String(n).padStart(2, '0')}`;
      await prisma.gateRecord.update({
        where: { projectId_gateId: { projectId: id, gateId: gate } },
        data: {
          owner: adminName,
          dueDate: new Date(inDays(n * 18)),
          evidenceLink: `https://example.com/seed/gates/${gate}`,
          notes: `${SEED}: gate ${n} notes`,
          ...(n <= passed ? { status: 'Complete', decision: 'Proceed' } : n === passed + 1 ? { status: 'In Progress' } : {}),
        },
      });
    }
    await prisma.project.update({ where: { id }, data: { version: { increment: 1 } } });
  });
  if (passed > 0) console.log(`  (Gates 1-${passed} are Complete / Proceed in the data; their readiness and signatures are NOT recorded)`);

  await reload();
  const filled = Object.values(project.registers).reduce((n, rows) => n + rows.length, 0);
  console.log(`\n${failures.length === 0 ? '✔' : '⚠'} ${id}: ${ok} steps done, ${failures.length} refused; ${Object.keys(project.registers).length} registers (${filled} rows), formula ${project.formulaVersion}, ${project.formulaVersionHistory.length} earlier versions, ${project.changes?.length ?? 0} change records, ${project.capa.length} CAPA records.`);
  if (failures.length > 0) {
    console.log('\nRefused sections:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log(`\nOpen it at  /#/projects/${id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
