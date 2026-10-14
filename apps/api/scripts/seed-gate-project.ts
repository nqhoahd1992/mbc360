// seed-gate-project.ts — DEV TOOL: create a project in which every gate up to and including a chosen one has
// all of its readiness met and has PASSED, so the next gate is open and you can work from there.
//
//   npm run db:seed-gate-project -- --gate 3            # Gates 1, 2 and 3 passed, Gate 4 open
//   npm run db:seed-gate-project -- --gate SG02 --name "Cream trial"
//   npm run db:seed-gate-project -- --gate 3 --ready    # Gates 1-2 passed; Gate 3 fully ready, Prepared + Reviewed signed,
//                                                       #   only the Approved by signature (and so the decision) left
//
// What it does
//   - creates the project through the real API (so every server guard runs), prefixed "SEED-" / "[SEED]";
//   - every reviewer, the Lead and every sign-off lane is the FIRST pinned administrator (PINNED_ADMINS);
//   - fills the evidence each readiness item reads with obviously fake values ("SEED ..."), also through the
//     API, re-reading the readiness list after each pass until nothing it knows how to fill is left;
//   - records the three gate signatures and the gate decision DIRECTLY in the database, because the real
//     route needs an authenticator code and a different person for each lane. This is the one place the script
//     bypasses a rule, and it is why this tool is for development databases only.
//
// Needs the API running (`npm run dev`) and apps/api/.env. Refuses to run against a non-localhost database
// unless --allow-remote is given. It never deletes anything.
import 'dotenv/config';
import { sign as signJwt } from 'jsonwebtoken';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { GATES } from '../../../packages/shared/src/config/gates';
import { GATE_READINESS, type ReadinessCheck } from '../../../packages/shared/src/config/gateReadiness';
import { PHASE_CONFIGS } from '../../../packages/shared/src/config/phases';
import { REGISTER_CONFIGS, createEmptyRegisterRow } from '../../../packages/shared/src/config/registers';
import { gateReadinessChecklist, isGatePassed } from '../../../packages/shared/src/utils/gateProgress';
import { registerContentHashOf } from '../src/projects/content-hash';
import { gateEvidenceSnapshot } from '../../../packages/shared/src/utils/gateSnapshot';
import { GATE_SIGNOFF_ROLES, type ChecklistItem, type ProjectData, type RegisterRow, type RequirementItem } from '../../../packages/shared/src/types';

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

const gateArg = flag('gate');
if (!gateArg) die('Usage: npm run db:seed-gate-project -- --gate <1-12 | SG01-SG12> [--ready] [--name "<title>"] [--allow-remote]');
const targetNumber = Number(gateArg.replace(/^SG/i, ''));
if (!Number.isInteger(targetNumber) || targetNumber < 1 || targetNumber > 12) die(`"${gateArg}" is not a gate (1-12)`);
// Only the gates whose evidence the script knows how to fill. Later gates are added as they are worked through.
const SUPPORTED_UP_TO = 3;
if (targetNumber > SUPPORTED_UP_TO) die(`Only Gates 1-${SUPPORTED_UP_TO} are supported so far (asked for ${targetNumber})`);
const gateId = (n: number) => `SG${String(n).padStart(2, '0')}`;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) die('DATABASE_URL is not set (run from apps/api, or set it in apps/api/.env).');
if (!has('allow-remote') && !/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)) {
  die('DATABASE_URL does not point at localhost. Pass --allow-remote if you really mean it.');
}
const API = (process.env.API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
// Same fallback the API uses outside production when SESSION_SECRET is not set (auth-config.ts).
const secret = process.env.SESSION_SECRET ?? 'dev-only-insecure-session-secret';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const today = new Date().toISOString().slice(0, 10);
const SEED = 'SEED';

// ------------------------------------------------------------------ API ----
let cookie = '';
async function api<T = any>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie, ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : undefined) as T;
}

let project: ProjectData;
let version = 0;
const take = (env: any) => {
  project = env.project ?? env;
  version = env.version ?? version;
};
const reload = async (id: string) => take(await api('GET', `/projects/${encodeURIComponent(id)}`));

// ------------------------------------------------------------ fixers ----
// Each fixer fills ONE kind of leaf check and returns true when it wrote something. They are idempotent, and
// the main loop asks the readiness engine what is still unsatisfied after every pass instead of trusting them.
type Ctx = { id: string; adminName: string };

const HARMLESS_USER = /pregnan|breast|postpartum|infant|child|baby|teen|elder|sensitiv|eczema|compromis|dry|family|vulnerab|swim/i;

async function fixGateCheck(ctx: Ctx, gate: string, check: string, na?: boolean): Promise<boolean> {
  const row = project.gateChecks.find((c) => c.gate === gate && c.check === check);
  if (!row) return false;
  const patch = na
    ? { done: false, ynna: 'NA', date: today, initials: 'SD', notes: `${SEED}: not applicable to this seeded project` }
    : { done: true, ynna: 'Y', date: today, initials: 'SD', evidenceRef: `${SEED} evidence`, notes: `${SEED}: recorded by the seed script` };
  take(await api('PUT', `/projects/${ctx.id}/gate-checks`, { updates: [{ gate, check, patch }], expectedVersion: version }));
  return true;
}

async function fixChecklist(ctx: Ctx, section: string): Promise<boolean> {
  const items: ChecklistItem[] = project.checklists[section] ?? [];
  if (items.length === 0) return false;
  const config = Object.values(PHASE_CONFIGS)
    .flatMap((p) => p.checklistSections)
    .find((s) => s.key === section);
  const pick = items.findIndex((i) => !HARMLESS_USER.test(i.label) && !/^other/i.test(i.label));
  const chosen = pick >= 0 ? pick : 0;
  let changed = false;
  const next = items.map((item, i) => {
    if (i !== chosen) return item;
    const want = { ...item, selected: true, status: 'Y' as const, ...(config?.requiresPrimary ? { isPrimary: true } : {}) };
    if (JSON.stringify(want) !== JSON.stringify(item)) changed = true;
    return want;
  });
  if (!changed) return false;
  take(await api('PUT', `/projects/${ctx.id}/checklists/${encodeURIComponent(section)}`, { items: next, expectedVersion: version }));
  return true;
}

async function fixRequirements(ctx: Ctx, section: string): Promise<boolean> {
  const items: RequirementItem[] = project.requirements[section] ?? [];
  if (items.length === 0) return false;
  let changed = false;
  const next = items.map((r) => {
    const want: RequirementItem = {
      ...r,
      status: 'Completed',
      owner: r.owner || ctx.adminName,
      ...(r.priority === undefined || r.priority === '' ? { priority: 'Must' } : {}),
      minimumRequirement: r.minimumRequirement || `${SEED} requirement`,
      rationale: r.rationale || `${SEED} rationale`,
    };
    if (JSON.stringify(want) !== JSON.stringify(r)) changed = true;
    return want;
  });
  if (!changed) return false;
  take(await api('PUT', `/projects/${ctx.id}/requirements/${encodeURIComponent(section)}`, { items: next, expectedVersion: version }));
  return true;
}

// A register cell the script is allowed to write, by the column's own type.
function cellValue(ctx: Ctx, col: { key: string; label: string; type: string; options?: string[] }, prefer?: string[], avoid?: string[]): unknown {
  switch (col.type) {
    case 'select': {
      const options = col.options ?? [];
      const good = prefer?.find((p) => options.includes(p));
      if (good) return good;
      return options.find((o) => !avoid?.includes(o)) ?? options[0] ?? '';
    }
    case 'date':
      return today;
    case 'checkbox':
      return true;
    case 'number':
      return 1;
    case 'user':
      return ctx.adminName;
    case 'market':
    case 'markets':
      return project.identity.markets[0] ?? '';
    case 'text':
    case 'textarea':
      return /link|url/i.test(col.key + col.label) ? `https://example.com/seed/${col.key}` : `${SEED} ${col.label}`;
    default:
      return undefined; // claimRef, rowRef, signature, multiSelect ... — never invented
  }
}

async function fixRegister(
  ctx: Ctx,
  key: string,
  opts: { columns?: string[]; some?: { column: string; values: string[] }; noBad?: { column: string; bad: string[] }; ensureRow?: boolean },
): Promise<boolean> {
  const config = REGISTER_CONFIGS.find((c) => c.key === key);
  if (!config) return false;
  const rows: RegisterRow[] = (project.registers[key] ?? []).map((r) => ({ ...r }));
  if (rows.length === 0) {
    if (config.mode === 'fixed') return false; // fixed registers are seeded; nothing to add
    rows.push(createEmptyRegisterRow(key));
  }
  let changed = JSON.stringify(rows) !== JSON.stringify(project.registers[key] ?? []);
  const cols = new Set<string>(opts.columns ?? []);
  if (opts.some) cols.add(opts.some.column);
  if (opts.noBad) cols.add(opts.noBad.column);
  rows.forEach((row, index) => {
    for (const colKey of cols) {
      const col = config.columns.find((c) => c.key === colKey);
      if (!col || col.editable === false) continue;
      let value: unknown;
      if (opts.some?.column === colKey && index === 0) value = cellValue(ctx, col, opts.some.values);
      else if (opts.noBad?.column === colKey) value = cellValue(ctx, col, undefined, opts.noBad.bad);
      else if (colKey === 'vulnerableGroup') value = cellValue(ctx, col, ['No vulnerable-user group identified']);
      else value = cellValue(ctx, col);
      if (value === undefined || value === '') continue;
      const current = row[colKey];
      const empty = current === undefined || current === null || current === '';
      // Only touch a cell that is empty, or that the check needs to read differently.
      if (!empty && !(opts.some?.column === colKey && index === 0) && !(opts.noBad?.column === colKey)) continue;
      if (current !== value) {
        row[colKey] = value as never;
        changed = true;
      }
    }
  });
  // A cell the register itself requires because of what another cell of the row says (`requiredWhen`).
  for (const row of rows) {
    for (const col of config.columns) {
      const rule = col.requiredWhen;
      if (!rule || col.editable === false) continue;
      const hit = (r: { column: string; values: readonly string[] }) => r.values.includes(String(row[r.column] ?? ''));
      if (!hit(rule) || (rule.and && !hit(rule.and))) continue;
      const current = row[col.key];
      if (current !== undefined && current !== null && current !== '') continue;
      const value = cellValue(ctx, col);
      if (value !== undefined && value !== '') {
        row[col.key] = value as never;
        changed = true;
      }
    }
  }
  if (!changed) return false;
  take(await api('PUT', `/projects/${ctx.id}/registers/${encodeURIComponent(key)}`, { rows, expectedVersion: version }));
  return true;
}

async function fixIdentity(ctx: Ctx, field: 'initialScope' | 'initialTargetUsers'): Promise<boolean> {
  if ((project.identity[field] ?? '').trim()) return false;
  take(await api('PUT', `/projects/${ctx.id}/identity`, { patch: { [field]: `${SEED} ${field}` }, expectedVersion: version }));
  return true;
}

// anyOf: take the branch that is the cheapest HONEST one — "no claims proposed" for a seeded project, then a Key
// Gate Check, then whatever comes first. A seeded project proposes no claims, so it must not invent a claim.
const branchRank = (c: ReadinessCheck) => (c.kind === 'noClaimsDeclared' ? 0 : c.kind === 'gateCheckDone' ? 1 : 2);

async function fix(ctx: Ctx, check: ReadinessCheck): Promise<boolean> {
  switch (check.kind) {
    case 'allOf': {
      let any = false;
      for (const sub of check.checks) any = (await fix(ctx, sub)) || any;
      return any;
    }
    case 'anyOf': {
      const branch = [...check.checks].sort((a, b) => branchRank(a) - branchRank(b))[0];
      return branch ? fix(ctx, branch) : false;
    }
    case 'gateCheckDone': {
      const row = project.gateChecks.find((c) => c.gate === check.gate && c.check === check.check);
      if (row && ((row.done && row.ynna === 'Y') || (row.ynna === 'NA' && row.notes?.trim()))) return false;
      return fixGateCheck(ctx, check.gate, check.check);
    }
    case 'noClaimsDeclared':
      return fixGateCheck(ctx, '03', 'Claim/benefit areas selected and evidence route identified', true);
    case 'checklistHasSelection':
    case 'checklistPrimarySelected':
      return fixChecklist(ctx, check.section);
    case 'requirementDone':
    case 'requirementsDispositioned':
    case 'requirementsNoOpenDeferrals':
    case 'requirementSectionDispositioned':
      return fixRequirements(ctx, check.section);
    case 'identityFieldFilled':
      return fixIdentity(ctx, check.field);
    case 'registerHasRows':
      return fixRegister(ctx, check.register, { ensureRow: true });
    case 'registerColumnFilled':
      return fixRegister(ctx, check.register, { columns: [check.column] });
    case 'registerRowsComplete':
      return fixRegister(ctx, check.register, { columns: check.columns });
    case 'registerNoBadRows':
      return fixRegister(ctx, check.register, { noBad: { column: check.column, bad: check.badValues } });
    case 'registerSomeRow':
      return fixRegister(ctx, check.register, { some: { column: check.column, values: check.values } });
    default:
      return false; // identityMarketsRecorded is met at creation; gateSignedOff is handled last; the rest is reported
  }
}

// A critical item whose N/A the engine wrote itself needs the responsible reviewer — the one nominated as "Reviewed
// by" on the PHASE sign-off — to acknowledge it. Nominating is the Lead's act (the administrator is the Lead), then
// the same person acknowledges, through the real route.
const nominatedPhases = new Set<number>();
async function acknowledgeGeneratedNa(ctx: Ctx, adminId: string, gate: string): Promise<void> {
  const pending = gateReadinessChecklist(project, gate).filter(
    (i) => i.acknowledgement && i.acknowledgement.state !== 'acknowledged' && !i.advisory,
  );
  if (pending.length === 0) return;
  const phase = GATES.find((g) => g.id === gate)!.phase;
  if (!nominatedPhases.has(phase)) {
    take(
      await api('PUT', `/projects/${ctx.id}/phases/${phase}/sign-off-assignees`, {
        assignments: ['Prepared by', 'Reviewed by', 'Approved by'].map((role) => ({ role, userId: adminId })),
        expectedVersion: version,
      }),
    );
    nominatedPhases.add(phase);
  }
  for (const item of pending) {
    take(
      await api('POST', `/projects/${ctx.id}/readiness-acknowledgements`, {
        gateId: gate,
        itemId: item.id,
        outcome: 'Acknowledged',
        comment: `${SEED}: acknowledged by the seed script`,
        expectedVersion: version,
      }),
    );
  }
}

// ----------------------------------------------------- gate completion ----
async function completeGateFlow(ctx: Ctx, gate: string): Promise<void> {
  const record = project.gates.find((g) => g.gateId === gate)!;
  const patch = {
    status: 'Complete',
    owner: ctx.adminName,
    dueDate: today,
    evidenceLink: `https://example.com/seed/${gate}`,
    notes: record.notes || `${SEED}: gate completed by the seed script`,
  };
  take(await api('PUT', `/projects/${ctx.id}/gates/${gate}`, { ...patch, expectedVersion: version }));
}

// The second bypass: the closing act on every register the gate must see closed (Review owner + Co-sign) needs an
// authenticator code from two different people, so it is written straight to the database as well. The hash is the
// one the server compares on every read, so a closure written here does not read as stale.
async function closeRegisters(ctx: Ctx, adminId: string, gate: string): Promise<void> {
  const item = gateReadinessChecklist(project, gate).find((i) => i.id === 'unclosed-registers');
  const keys = (item?.list?.rows ?? []).filter((r) => !r.done).map((r) => r.key);
  const now = new Date();
  for (const key of keys) {
    const hash = registerContentHashOf(project, key);
    const closure = await prisma.registerClosure.upsert({
      where: { projectId_registerKey: { projectId: ctx.id, registerKey: key } },
      create: { projectId: ctx.id, registerKey: key },
      update: {},
    });
    for (const role of ['Review owner', 'Co-sign']) {
      const data = {
        name: ctx.adminName,
        signedByUserId: adminId,
        signedAt: now,
        recordVersion: version,
        signatureVerifiedAt: now,
        contentHash: hash ?? null,
      };
      await prisma.registerClosureSignOff.upsert({
        where: { closureId_role: { closureId: closure.id, role } },
        create: { closureId: closure.id, role, ...data },
        update: data,
      });
    }
  }
  if (keys.length > 0) await reload(ctx.id);
}

// The one bypass: three signatures and the gate decision, written straight to the database (see the header).
// `leaveApproval` stops short of the third signature: Prepared by and Reviewed by are signed, Approved by is only
// nominated, and the gate decision is not recorded — the state in which the approver has one click left.
async function signGateDirectly(ctx: Ctx, adminId: string, gate: string, leaveApproval = false): Promise<void> {
  const admin = await prisma.user.findUniqueOrThrow({ where: { id: adminId }, include: { roles: { include: { role: true } } } });
  const roleNames = admin.roles.map((r) => r.role.name).join(', ') || null;
  const initials = ctx.adminName.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').join('').slice(0, 4);
  // The signed snapshot is taken from the project exactly as the server will read it, so the signatures are not stale.
  const snapshot = gateEvidenceSnapshot(project, gate, undefined);
  const now = new Date();
  for (const role of GATE_SIGNOFF_ROLES) {
    const existing = await prisma.gateSignOff.findFirst({ where: { projectId: ctx.id, gateId: gate, market: null, role } });
    if (leaveApproval && role === 'Approved by') {
      if (!existing) await prisma.gateSignOff.create({ data: { projectId: ctx.id, gateId: gate, role, assignedToUserId: adminId } });
      else await prisma.gateSignOff.update({ where: { id: existing.id }, data: { assignedToUserId: adminId } });
      continue;
    }
    const data = {
      assignedToUserId: adminId,
      signedByUserId: adminId,
      name: ctx.adminName,
      initials,
      signedAt: now,
      roleAtSigning: roleNames,
      decision: 'Proceed',
      comment: `${SEED}: signed by the seed script`,
      signatureVerifiedAt: now,
      snapshot: snapshot as never,
    };
    if (existing) await prisma.gateSignOff.update({ where: { id: existing.id }, data });
    else await prisma.gateSignOff.create({ data: { projectId: ctx.id, gateId: gate, role, ...data } });
  }
  if (!leaveApproval) {
    await prisma.gateRecord.update({ where: { projectId_gateId: { projectId: ctx.id, gateId: gate }, }, data: { decision: 'Proceed' } });
  }
  await prisma.project.update({ where: { id: ctx.id }, data: { version: { increment: 1 } } });
}

// ---------------------------------------------------------------- main ----
async function main() {
  const pinned = (process.env.PINNED_ADMINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)[0];
  if (!pinned) die('PINNED_ADMINS is empty in apps/api/.env — there is no administrator to act as.');
  const admin = await prisma.user.findFirst({ where: { email: { equals: pinned, mode: 'insensitive' } } });
  if (!admin) die(`The pinned administrator ${pinned} has no user row yet — start the API once so it is created.`);
  const adminName = admin.displayName;
  cookie = `mbc360_session=${signJwt({ sub: admin.id }, secret, { expiresIn: 3600 })}`;
  try {
    await api('GET', '/projects');
  } catch (err) {
    die(`Cannot reach the API at ${API} as ${pinned}: ${(err as Error).message}`);
  }

  const stamp = Date.now().toString(36).toUpperCase();
  const id = `${SEED}-G${targetNumber}-${stamp}`;
  const title = flag('name') ?? `Gate ${targetNumber} passed`;
  const reviewers = Object.fromEntries(
    (await import('../../../packages/shared/src/config/reviewers')).REVIEW_ROLES.map((r) => [r.key, adminName]),
  );
  const ctx: Ctx = { id, adminName };

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
        targetLaunchDate: new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10),
        productSku: `[${SEED}] ${title}`,
        ownerDepartment: 'NPD',
        markets: ['Vietnam'],
        reviewers,
      },
      { 'Idempotency-Key': `seed-${id}` },
    ),
  );
  console.log(`Created ${id} (Lead and all 13 reviewers: ${adminName})`);

  for (let n = 1; n <= targetNumber; n++) {
    const gate = gateId(n);
    const items = GATE_READINESS[gate] ?? [];
    // The gate's own three-signature item is satisfied last, by signGateDirectly.
    const signOffIds = new Set(items.filter((c) => c.check.kind === 'gateSignedOff').map((c) => c.id));
    for (let pass = 1; pass <= 8; pass++) {
      const open = gateReadinessChecklist(project, gate).filter((i) => !i.satisfied && !i.advisory);
      const fixable = open.filter((i) => !signOffIds.has(i.id) && i.id !== 'unclosed-registers');
      if (fixable.length === 0) break;
      let wrote = false;
      for (const item of fixable) {
        const config = items.find((c) => c.id === item.id);
        if (config) wrote = (await fix(ctx, config.check)) || wrote;
      }
      if (!wrote) break;
    }
    await acknowledgeGeneratedNa(ctx, admin.id, gate);
    const left = gateReadinessChecklist(project, gate).filter((i) => !i.satisfied && !i.advisory && !signOffIds.has(i.id) && i.id !== 'unclosed-registers');
    if (left.length > 0) {
      console.error(`\n⚠ Gate ${n}: ${left.length} readiness item(s) the script could not fill:`);
      for (const item of left) console.error(`   - ${item.id}: ${item.label}`);
      console.error(`The project ${id} was created and filled as far as possible; it stops here.`);
      process.exit(2);
    }
    await closeRegisters(ctx, admin.id, gate);
    await completeGateFlow(ctx, gate);
    // --ready applies to the TARGET gate only; every earlier gate is passed in full.
    const readyOnly = has('ready') && n === targetNumber;
    await signGateDirectly(ctx, admin.id, gate, readyOnly);
    await reload(id);
    if (readyOnly) {
      const still = gateReadinessChecklist(project, gate).filter((i) => !i.satisfied && !i.advisory);
      const onlyApproval = still.length === 1 && signOffIds.has(still[0].id);
      console.log(`Gate ${n}: readiness met, Prepared by and Reviewed by signed — ${onlyApproval ? 'only the Approved by signature is left' : 'NOT as expected, still open:'}`);
      if (!onlyApproval) {
        for (const item of still) console.error(`   - ${item.id}: ${item.label}`);
        process.exit(2);
      }
      console.log(`
✔ Done. Open it at  /#/projects/${id}   (Gate ${n} waits for the Approved by signature)`);
      return;
    }
    const ok = isGatePassed(project, gate);
    console.log(`Gate ${n}: readiness met, signed, ${ok ? 'PASSED' : 'NOT passed (see the readiness panel)'}`);
    if (!ok) {
      const still = gateReadinessChecklist(project, gate).filter((i) => !i.satisfied);
      for (const item of still) console.error(`   - ${item.id}: ${item.label}`);
      process.exit(2);
    }
  }
  console.log(`\n✔ Done. Open it at  /#/projects/${id}   (${GATES.find((g) => g.id === gateId(targetNumber))?.name ?? ''} passed)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
