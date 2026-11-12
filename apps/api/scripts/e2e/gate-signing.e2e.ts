// Gate signing and the SW-4 / SW-5 freeze rules, end to end over real HTTP (see run.ts).
//
// Real dev-login sessions, real authenticator enrolment (codes generated with the repo's own TOTP
// module), real step-up proofs and three real signatures per gate (per market at SG10-SG12) for SG01..SG12, then edits
// through the API. The unit-level cases live in packages/shared/scripts/verify-register-freeze.ts;
// this proves the SAME rules hold through the real HTTP, session, transaction and snapshot path,
// which a unit test structurally cannot.
import { join, resolve } from 'node:path';
import type { Client } from 'pg';
import { base32Decode, currentStep, hotp } from '../../src/verification/totp';

const ROOT = resolve(__dirname, '..', '..', '..', '..');
/* eslint-disable @typescript-eslint/no-require-imports */
const { GATE_READINESS } = require(join(ROOT, 'packages/shared/dist/config/gateReadiness.js'));
const { REGISTER_CONFIGS } = require(join(ROOT, 'packages/shared/dist/config/registers.js'));
const gp = require(join(ROOT, 'packages/shared/dist/utils/gateProgress.js'));
const { GATES } = require(join(ROOT, 'packages/shared/dist/config/gates.js'));
const rc = require(join(ROOT, 'packages/shared/dist/utils/registerClosures.js'));
const snap = require(join(ROOT, 'packages/shared/dist/utils/gateSnapshot.js'));
const refSnap = require(join(ROOT, 'packages/shared/dist/utils/referenceSnapshot.js'));
const { registerClosureSignerRole } = require(join(ROOT, 'packages/shared/dist/config/reviewers.js'));
/* eslint-enable @typescript-eslint/no-require-imports */
// The same cut the API process makes (harness.js), so readiness evaluated in this process agrees.
for (const gate of ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11', 'SG12']) {
  GATE_READINESS[gate] = GATE_READINESS[gate].filter((item: { check: { kind: string } }) => item.check.kind === 'gateSignedOff' || item.id === 'sg07-maternal-caution' || item.id === 'sg08-infant-testing');
}

const PROJECT = 'MBC-2026-001';
const ROLES = ['Prepared by', 'Reviewed by', 'Approved by'] as const;
type Role = (typeof ROLES)[number];
const WHO: Record<Role, string> = { 'Prepared by': 'tuan', 'Reviewed by': 'sekar', 'Approved by': 'admin' };
// A code is valid for one 30-second step and may be used once, so one account can sign only about
// twice a minute. Each role therefore has a POOL of equivalent accounts (clones of the same user, same
// roles) and each gate lane signs with its own, which is what keeps the run to a few minutes instead of
// waiting on the code window. Which account signs a lane makes no difference to any rule under test.
const POOL = 8;
const TEMPLATE_EMAIL: Record<Role, string> = {
  'Prepared by': 'tuan@demo.mbc360.local',
  'Reviewed by': 'sekar@demo.mbc360.local',
  'Approved by': 'app.admin@maxbiocare.com',
};
const poolKey = (role: Role, n: number) => (n === 0 ? WHO[role] : `${WHO[role]}${n}`);

interface Session {
  email: string;
  cookie: string;
  id: string;
  secret?: string;
  lastStep: number;
}

export async function run(base: string, db: Client): Promise<number> {
  let bad = 0;
  const t = (name: string, ok: boolean, extra = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `   ${extra}`}`);
    if (!ok) bad += 1;
  };
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const sessions: Record<string, Session> = {};
  const short = (v: unknown) => (JSON.stringify(v) ?? 'undefined').slice(0, 220);

  async function api(key: string, method: string, path: string, body?: unknown) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json', cookie: sessions[key].cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, json };
  }
  async function login(key: string, email: string) {
    const res = await fetch(`${base}/auth/dev-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(`login ${email}: ${res.status} ${await res.text()}`);
    const cookie = (res.headers.getSetCookie() ?? []).map((c) => c.split(';')[0]).join('; ');
    sessions[key] = { email, cookie, id: '', lastStep: 0 };
    sessions[key].id = (await api(key, 'GET', '/auth/me')).json?.id ?? '';
  }
  // One pool slot per gate lane (gate + market), in the order lanes are first met; the same lane keeps
  // the same signers, so a withdraw or a re-sign is done by the person who signed.
  const lanes = new Map<string, number>();
  const signerKey = (gate: string, role: Role, market?: string): string => {
    const lane = `${gate}|${market ?? ''}`;
    if (!lanes.has(lane)) lanes.set(lane, lanes.size % POOL);
    return poolKey(role, lanes.get(lane) as number);
  };
  const project = async () => (await api('admin', 'GET', `/projects/${PROJECT}`)).json;
  const version = async () => (await project()).version as number;

  // A code is single-use per 30-second step, so each use needs a later step than the last; wait
  // only when the ±1 window has run out.
  async function code(key: string): Promise<string> {
    const s = sessions[key];
    const target = Math.max(s.lastStep + 1, currentStep() - 1);
    while (target > currentStep() + 1) await sleep(2000);
    s.lastStep = target;
    return hotp(base32Decode(s.secret as string), target);
  }
  async function enroll(key: string) {
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const sig = await api(key, 'PUT', '/account/signature', { imageData: png });
    if (sig.status >= 300) throw new Error(`signature ${key}: ${sig.status} ${short(sig.json)}`);
    const e = await api(key, 'POST', '/account/totp/enroll');
    sessions[key].secret = String(e.json.secret).replace(/\s+/g, '');
    const a = await api(key, 'POST', '/account/totp/activate', { code: await code(key) });
    if (a.status >= 300) throw new Error(`activate ${key}: ${a.status} ${short(a.json)}`);
  }
  // What the signer is shown first: the whole snapshot and the hash the signature is bound to.
  const previewOf = async (key: string, gate: string, market?: string) =>
    (await api(key, 'GET', `/projects/${PROJECT}/gates/${gate}/sign-offs/preview${market ? `?market=${encodeURIComponent(market)}` : ''}`)).json;
  // `between` runs after the preview and before the submit — where somebody else's edit lands.
  async function sign(gate: string, role: Role, market?: string, between?: () => Promise<void>, decision = 'Proceed') {
    const key = signerKey(gate, role, market);
    const preview = await previewOf(key, gate, market);
    const su = await api(key, 'POST', `/projects/${PROJECT}/gates/${gate}/sign-offs/step-up`, {
      role,
      market,
      code: await code(key),
      expectedHash: preview.hash,
    });
    if (su.status >= 300) return { status: su.status, json: su.json, stage: 'step-up' };
    if (between) await between();
    const r = await api(key, 'POST', `/projects/${PROJECT}/gates/${gate}/sign-offs/sign`, {
      role,
      market,
      decision,
      comment: 'checked',
      stepUpToken: su.json.stepUpToken,
      expectedHash: preview.hash,
      seen: { snapshot: preview.snapshot, previewedAt: preview.previewedAt },
    });
    return { ...r, stage: 'sign' };
  }
  const stale = async (gate: string, role: Role, market?: string): Promise<string[]> =>
    gp.gateSignOffStaleChanges((await project()).project, gate, market, role);
  // Critical gates (SW-35): the Lead names the independent-function representative first — here the "Approved by" account, which
  // holds every function — and that slot is theirs; the other two are nominated as on any gate.
  const CRITICAL_E2E = ['SG03', 'SG04', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11'];
  const nominate = async (gate: string, market?: string) => {
    const critical = CRITICAL_E2E.includes(gate);
    if (critical) {
      const named = await api('admin', 'PUT', `/projects/${PROJECT}/gates/${gate}/sign-off-representative`, {
        market,
        userId: sessions[signerKey(gate, 'Approved by', market)].id,
        slot: 'Approved by',
        expectedVersion: await version(),
      });
      if (named.status >= 300) return named;
    }
    return api('admin', 'PUT', `/projects/${PROJECT}/gates/${gate}/sign-off-assignees`, {
      market,
      assignments: ROLES.filter((role) => !(critical && role === 'Approved by')).map((role) => ({
        role,
        userId: sessions[signerKey(gate, role, market)].id,
      })),
      expectedVersion: await version(),
    });
  };
  // SW-26: a passing signature needs the Phase Gate Flow card filled in (owner, due date, evidence link) as well as Complete.
  const complete = async (gate: string) =>
    api('admin', 'PUT', `/projects/${PROJECT}/gates/${gate}`, {
      status: 'Complete',
      owner: 'e2e owner',
      dueDate: '2030-01-01',
      evidenceLink: 'https://example.com/e2e-evidence',
      expectedVersion: await version(),
    });
  // ---- phase sign-off helpers (the same three roles, one lane per phase) ------------------------
  const phaseKey = (phase: number, role: Role) => signerKey(`PHASE${phase}`, role);
  const nominatePhase = async (phase: number) =>
    api('admin', 'PUT', `/projects/${PROJECT}/phases/${phase}/sign-off-assignees`, {
      assignments: ROLES.map((role) => ({ role, userId: sessions[phaseKey(phase, role)].id })),
      expectedVersion: await version(),
    });
  // What the phase signer is shown first: everything the phase page shows, and the hash the signature is bound to.
  const phasePreviewOf = async (key: string, phase: number) =>
    (await api(key, 'GET', `/projects/${PROJECT}/phases/${phase}/sign-offs/preview`)).json;
  async function signPhase(phase: number, role: Role, between?: () => Promise<void>) {
    const key = phaseKey(phase, role);
    const preview = await phasePreviewOf(key, phase);
    const su = await api(key, 'POST', `/projects/${PROJECT}/phases/${phase}/sign-offs/step-up`, {
      role,
      code: await code(key),
      expectedHash: preview.hash,
    });
    if (su.status >= 300) return { status: su.status, json: su.json, stage: 'step-up' };
    if (between) await between();
    const out = await api(key, 'POST', `/projects/${PROJECT}/phases/${phase}/sign-offs/sign`, {
      role,
      decision: 'Proceed',
      comments: 'checked',
      stepUpToken: su.json.stepUpToken,
      expectedHash: preview.hash,
    });
    return { ...out, stage: 'sign' };
  }
  // Closing a phase the way a person does: nominate, then three real signatures.
  async function closePhaseBySigning(phase: number) {
    const n = await nominatePhase(phase);
    t(`Phase ${phase} signers are nominated`, n.status < 300, short(n.json));
    for (const role of ROLES) {
      const out = await signPhase(phase, role);
      t(`${role} signs Phase ${phase}`, out.status < 300, `${out.stage} ${out.status} ${short(out.json)}`);
    }
  }
  const putClaims = async (mutate: (rows: any[]) => any[]) => {
    const current = (await project()).project.registers.claimEvidenceTraceability ?? [];
    return api('admin', 'PUT', `/projects/${PROJECT}/registers/claimEvidenceTraceability`, {
      rows: mutate(current.map((x: any) => ({ ...x }))),
      expectedVersion: await version(),
    });
  };

  console.log('--- setup: sessions, authenticator enrolment (real codes), register closing');
  await login('admin', 'app.admin@maxbiocare.com');
  await login('tuan', 'tuan@demo.mbc360.local');
  await login('sekar', 'sekar@demo.mbc360.local');
  // Clone the three signer accounts POOL-1 times (same department, same roles) so lanes can sign in parallel.
  for (const role of ROLES) {
    for (let n = 1; n < POOL; n += 1) {
      const email = `e2e.${poolKey(role, n)}@demo.mbc360.local`;
      await db.query(
        `INSERT INTO users (id, email, "displayName", "departmentId", active, "createdAt", "updatedAt")
         SELECT md5(random()::text || clock_timestamp()::text), $2, "displayName" || ' #' || $3::text, "departmentId", true, now(), now()
         FROM users WHERE email = $1`,
        [TEMPLATE_EMAIL[role], email, n],
      );
      await db.query(
        `INSERT INTO user_roles ("userId", "roleId")
         SELECT c.id, ur."roleId" FROM users c, users s JOIN user_roles ur ON ur."userId" = s.id
         WHERE c.email = $2 AND s.email = $1`,
        [TEMPLATE_EMAIL[role], email],
      );
      await login(poolKey(role, n), email);
    }
  }
  const accounts = Object.keys(sessions);
  await Promise.all(accounts.map((key) => enroll(key)));
  t(`${accounts.length} accounts enrolled an authenticator with real codes`, true);

  // ============================================================ closing a next action: the same authority as the screen (SW-37)
  console.log('\n--- closing a next action: the gate\'s nominated Approved-by signer may, as the screen says (no Role Editor grant)');
  {
    // Who may close an action they did not raise and do not own: the raiser, the gate owner, or "an authorised reviewer" — read as
    // whoever may decide that gate. Since SW-37 that is the gate's nominated Approved-by signer, the Lead or an administrator, not a
    // `gate:SGxx|decide` grant (migration 20261015180000 removed those). The server used to ask that removed grant, so it refused
    // exactly the people the screen offered the button to.
    const GATE = 'SG02';
    const nameOfUser = async (key: string): Promise<string> =>
      (await db.query(`SELECT "displayName" FROM users WHERE id = $1`, [sessions[key].id])).rows[0]?.displayName;
    const [raiser, approver, adminName] = [await nameOfUser('tuan'), await nameOfUser('sekar'), await nameOfUser('admin')];
    const lead = (await project()).project.identity.projectLead as string;
    t('the Lead is neither the raiser nor the would-be approver (so only the nomination can grant the authority)', lead !== raiser && lead !== approver, `lead=${lead}`);
    const gateOwner = (await project()).project.gates.find((g: any) => g.gateId === GATE)?.owner ?? '';
    t(`${GATE} has no gate owner among our accounts`, ![raiser, approver].includes(gateOwner), `owner=${gateOwner}`);

    const actions = async () => ((await project()).project.nextActions as any[]).filter((a) => a.gateId === GATE);
    const put = async (key: string, list: any[]) =>
      api(key, 'PUT', `/projects/${PROJECT}/next-actions`, { gateIds: [GATE], actions: list, expectedVersion: await version() });
    const ID = 'NA-E2E-CLOSE';
    const mine = () => ({ id: ID, gateId: GATE, description: 'e2e: authority to close', owner: adminName, dueDate: '2030-01-01', status: 'Open', priority: 'Medium' });

    // Raised by someone else, owned by a third person: the approver has no claim on it except the gate authority.
    let r: any = await put('tuan', [...(await actions()), mine()]);
    t('a contributor raises a next action on the gate', r.status < 300, `${r.status} ${short(r.json)}`);
    const closeAs = async (key: string) =>
      put(key, (await actions()).map((a) => (a.id === ID ? { ...a, status: 'Closed' } : a)));

    r = await closeAs('sekar');
    t('a person with no authority over the gate cannot close it (403)', r.status === 403, `${r.status} ${short(r.json)}`);
    t('...and the action is still open', (await actions()).find((a) => a.id === ID)?.status === 'Open');

    r = await api('admin', 'PUT', `/projects/${PROJECT}/gates/${GATE}/sign-off-assignees`, {
      assignments: [{ role: 'Approved by', userId: sessions.sekar.id }],
      expectedVersion: await version(),
    });
    t(`the Lead (admin) nominates that person as ${GATE}'s Approved-by signer`, r.status < 300, `${r.status} ${short(r.json)}`);

    r = await closeAs('sekar');
    t('the nominated Approved-by signer can now close it, with no role grant involved', r.status < 300, `${r.status} ${short(r.json)}`);
    const closed = (await actions()).find((a) => a.id === ID);
    t('...and is recorded as who verified the closure', closed?.status === 'Closed' && closed?.verifiedBy === approver, short(closed));

    // Put the gate back as found.
    r = await api('admin', 'PUT', `/projects/${PROJECT}/gates/${GATE}/sign-off-assignees`, {
      assignments: [{ role: 'Approved by', userId: null }],
      expectedVersion: await version(),
    });
    t('the nomination is cleared again', r.status < 300, `${r.status} ${short(r.json)}`);
  }

  // ============================================================ N/A with a rationale on the Phase 2-4 requirement tables
  console.log('\n--- requirement tables: N/A with a rationale counts as dealt with on Phase 2-4, except where a row is always mandatory');
  {
    // The status list of these tables always included N/A, but no rule accepted it, so picking it left a Mandatory gate item
    // unsatisfiable (Gate 5's compatibility item). It now counts when it carries a rationale (project owner, 2026-10-30).
    const SECTION = 'formulationDesign';
    const ROW = 'Compatibility / use-with constraints';
    const rowOf = async (section: string, requirement: string) =>
      ((await project()).project.requirements[section] as any[]).find((r) => r.requirement === requirement);
    const setRow = async (section: string, requirement: string, patch: Record<string, unknown>) => {
      const items = ((await project()).project.requirements[section] as any[]).map((r) =>
        r.requirement === requirement ? { ...r, ...patch } : { ...r },
      );
      return api('admin', 'PUT', `/projects/${PROJECT}/requirements/${section}`, { items, expectedVersion: await version() });
    };
    const settled = async (section: string, requirement: string) => gp.requirementRowSettled(section, await rowOf(section, requirement));

    const original = (await rowOf(SECTION, ROW)).status as string;
    let r: any = await setRow(SECTION, ROW, { status: 'N/A', naRationale: '' });
    t('N/A with no rationale is stored', r.status < 300 && (await rowOf(SECTION, ROW)).status === 'N/A', `${r.status} ${short(r.json)}`);
    t('...but does not count as dealt with', !(await settled(SECTION, ROW)));

    r = await setRow(SECTION, ROW, { status: 'N/A', naRationale: 'Nothing to use this product with' });
    const stored = await rowOf(SECTION, ROW);
    t('N/A with a rationale is stored and the rationale survives the round trip', r.status < 300 && stored.naRationale === 'Nothing to use this product with', `${r.status} ${short(stored)}`);
    t('...and counts as dealt with', await settled(SECTION, ROW));

    r = await setRow(SECTION, ROW, { status: 'Gap', naRationale: 'left over from N/A' });
    t('moving the row to Gap clears the rationale on the server (a reason cannot outlive its disposition)', r.status < 300 && !(await rowOf(SECTION, ROW)).naRationale, short(await rowOf(SECTION, ROW)));
    t('...and a Gap row does not count as dealt with', !(await settled(SECTION, ROW)));

    r = await setRow(SECTION, ROW, { status: 'Complete' });
    t('Complete counts as dealt with, as before', r.status < 300 && (await settled(SECTION, ROW)));

    // Put the row back as found.
    await setRow(SECTION, ROW, { status: original, naRationale: '' });

    // The row the answer calls "always mandatory" never accepts N/A, rationale or not.
    const MUST = 'Must-have product requirements';
    r = await setRow('projectRequirements', MUST, { status: 'N/A', naRationale: 'trying to skip it' });
    t('Must-have product requirements: N/A is stored on that table…', r.status < 300, `${r.status} ${short(r.json)}`);
    t('...but never counts as dealt with, whatever its rationale', !(await settled('projectRequirements', MUST)));
    await setRow('projectRequirements', MUST, { status: 'Not Started', naRationale: '' });

    // The four compartment tables use the workbook's shorter list, which has no N/A.
    const first = ((await project()).project.requirements.pregnancySafety as any[])[0];
    r = await setRow('pregnancySafety', first.requirement, { status: 'N/A', naRationale: 'x' });
    t('a compartment table still refuses N/A (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  }

  // ============================================================ register closing: review before signing
  console.log('\n--- register closing: the closer reads the register first, and the signature is bound to what they read');
  {
    // A free-form register (so a row can be added), owned by a person one of our accounts IS, and used
    // late enough that nothing else in this run touches it.
    const reviewerRows = (await db.query(`SELECT "roleKey", name FROM project_reviewers WHERE "projectId" = $1`, [PROJECT])).rows as {
      roleKey: string;
      name: string;
    }[];
    const nameOf = (roleKey: string) => reviewerRows.find((r) => r.roleKey === roleKey)?.name;
    const accountName: Record<string, string> = {};
    for (const key of ['tuan', 'sekar', 'admin']) {
      accountName[key] = (await db.query(`SELECT "displayName" FROM users WHERE id = $1`, [sessions[key].id])).rows[0]?.displayName;
    }
    let pick: { registerKey: string; gateId: string; signer: string; textColumn: string } | undefined;
    for (const cfg of REGISTER_CONFIGS) {
      const spec = rc.registerReviewSpec(cfg);
      if (cfg.mode !== 'register' || !spec) continue;
      const gateId = rc.registerClosureGateIds(cfg).find((g: string) => Number(g.slice(2)) >= 8);
      if (!gateId) continue;
      const owner = nameOf(registerClosureSignerRole(spec, 'Review owner'));
      const signer = Object.keys(accountName).find((k) => accountName[k] === owner);
      // A column this gate closes: it is what the closure will lock.
      const textColumn = rc.closureColumns(cfg, gateId).find((k: string) => cfg.columns.find((c: any) => c.key === k)?.type === 'text');
      if (signer && textColumn) {
        pick = { registerKey: cfg.key, gateId, signer, textColumn };
        break;
      }
    }
    t('a free-form register whose Review owner is one of our accounts exists', !!pick, short(reviewerRows.slice(0, 3)));
    if (pick) {
      const { registerKey, gateId, signer, textColumn } = pick;
      const base = `/projects/${PROJECT}/registers/${registerKey}/close`;
      const signed = async (): Promise<boolean> =>
        (
          await db.query(
            `SELECT count(*)::int AS n FROM register_closure_sign_offs s JOIN register_closures c ON c.id = s."closureId"
              WHERE c."projectId" = $1 AND c."registerKey" = $2 AND c."gateId" = $3 AND s.role = 'Review owner' AND s."signedAt" IS NOT NULL`,
            [PROJECT, registerKey, gateId],
          )
        ).rows[0].n === 1;
      const addRow = async (text: string) => {
        const cur = (await project()).project.registers[registerKey] ?? [];
        return api('admin', 'PUT', `/projects/${PROJECT}/registers/${registerKey}`, {
          rows: [...cur.map((x: any) => ({ ...x })), { [textColumn]: text }],
          expectedVersion: await version(),
        });
      };

      let pv = (await api(signer, 'GET', `${base}/preview?gateId=${gateId}`)).json;
      t('the closing preview carries the register title, its columns, its rows and a 64-character hash',
        typeof pv.hash === 'string' && pv.hash.length === 64 && Array.isArray(pv.columns) && pv.columns.length > 0 && Array.isArray(pv.rows) && typeof pv.title === 'string',
        short(Object.keys(pv)));
      const pv2 = (await api(signer, 'GET', `${base}/preview?gateId=${gateId}`)).json;
      t('two previews of an unchanged register give the same hash', pv.hash === pv2.hash);

      let r: any = await api(signer, 'POST', `${base}/step-up`, { gateId, role: 'Review owner', code: '000000' });
      t('a step-up with no hash is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
      r = await api(signer, 'POST', `${base}/sign`, { gateId, role: 'Review owner', stepUpToken: 'x' });
      t('a sign with no hash is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);

      // A stale preview must be refused BEFORE the one-time code is spent, so the same code still works.
      const oneCode = await code(signer);
      r = await api(signer, 'POST', `${base}/step-up`, { gateId, role: 'Review owner', code: oneCode, expectedHash: 'f'.repeat(64) });
      t('a step-up bound to a hash the register does not have is refused (422, REGISTER_CONTENT_CHANGED)',
        r.status === 422 && r.json?.code === 'REGISTER_CONTENT_CHANGED', `${r.status} ${short(r.json)}`);
      r = await api(signer, 'POST', `${base}/step-up`, { gateId, role: 'Review owner', code: oneCode, expectedHash: pv.hash });
      t('...and that refusal did not spend the code: the same code then works with the right hash', r.status < 300 && !!r.json?.stepUpToken, `${r.status} ${short(r.json)}`);
      const staleToken = r.json?.stepUpToken;

      // Somebody else edits the register after the closer opened the preview.
      r = await addRow('edited while the closer was reading');
      t('another person edits the register after the preview', r.status < 300, `${r.status} ${short(r.json)}`);
      r = await api(signer, 'POST', `${base}/sign`, { gateId, role: 'Review owner', stepUpToken: staleToken, expectedHash: pv.hash });
      t('signing with the old hash is refused (422, REGISTER_CONTENT_CHANGED)', r.status === 422 && r.json?.code === 'REGISTER_CONTENT_CHANGED', `${r.status} ${short(r.json)}`);
      t('...and nothing was signed', !(await signed()));

      // Reviewing again gives a new hash, and that one signs.
      const pv3 = (await api(signer, 'GET', `${base}/preview?gateId=${gateId}`)).json;
      t('the new preview has a different hash and shows the new row', pv3.hash !== pv.hash && pv3.rows.length === pv.rows.length + 1, `${pv.rows.length} -> ${pv3.rows.length}`);
      const su = await api(signer, 'POST', `${base}/step-up`, { gateId, role: 'Review owner', code: await code(signer), expectedHash: pv3.hash });
      t('a step-up bound to the new hash is accepted', su.status < 300 && !!su.json?.stepUpToken, `${su.status} ${short(su.json)}`);
      r = await api(signer, 'POST', `${base}/sign`, { gateId, role: 'Review owner', stepUpToken: su.json?.stepUpToken, expectedHash: pv3.hash });
      t('signing with the hash of what was just reviewed succeeds', r.status < 300, `${r.status} ${short(r.json)}`);
      t('...and the signature is recorded', await signed());

      // ---- while a closing signature stands the register is LOCKED; stale only catches what got past that ----
      {
        const closureRow = async () =>
          ((await project()).project.registerClosures[`${registerKey}|${gateId}`]?.signOffs ?? []).find((x: any) => x.role === 'Review owner');
        const dbHash = async (): Promise<string | null> =>
          (
            await db.query(
              `SELECT s."contentHash" FROM register_closure_sign_offs s JOIN register_closures c ON c.id = s."closureId"
                WHERE c."projectId" = $1 AND c."registerKey" = $2 AND c."gateId" = $3 AND s.role = 'Review owner'`,
              [PROJECT, registerKey, gateId],
            )
          ).rows[0]?.contentHash ?? null;
        // A change nobody can make through the API (somebody with database access, a bug, an old import):
        // the only way a signed register can now differ from what was signed.
        const outOfBandEdit = async (text: string) =>
          db.query(
            `UPDATE register_rows SET data = jsonb_set(data, ARRAY[$3], to_jsonb($4::text))
              WHERE id = (SELECT id FROM register_rows WHERE "projectId" = $1 AND "registerKey" = $2 ORDER BY "rowOrder" LIMIT 1)`,
            [PROJECT, registerKey, textColumn, text],
          );
        t('right after signing, the signature stored the hash of what was shown and is not stale',
          (await dbHash()) === pv3.hash && !(await closureRow())?.stale, `${await dbHash()} ${short(await closureRow())}`);
        r = await addRow('changed AFTER the Review owner signed');
        t('while ONE of the two closing signatures stands, the register gains no row (403)',
          r.status === 403 && String(r.json?.message).includes('Rows cannot be added'), `${r.status} ${short(r.json)}`);
        t('...and the signature is still current', !(await closureRow())?.stale, short(await closureRow()));

        await outOfBandEdit('changed out of band, after the Review owner signed');
        t('a change that got past the lock (out of band) makes the signature stale', (await closureRow())?.stale === true, short(await closureRow()));
        t('...the stale flag was computed, not stored: the stored hash is still the one that was signed', (await dbHash()) === pv3.hash, String(await dbHash()));

        const pv4 = (await api(signer, 'GET', `${base}/preview?gateId=${gateId}`)).json;
        const su4 = await api(signer, 'POST', `${base}/step-up`, { gateId, role: 'Review owner', code: await code(signer), expectedHash: pv4.hash });
        r = await api(signer, 'POST', `${base}/sign`, { gateId, role: 'Review owner', stepUpToken: su4.json?.stepUpToken, expectedHash: pv4.hash });
        t('a stale signature is replaced by signing again, without withdrawing first', r.status < 300, `${r.status} ${short(r.json)}`);
        t('...after which it counts again and carries the new hash', !(await closureRow())?.stale && (await dbHash()) === pv4.hash, short(await closureRow()));

        // A signature recorded before hashes existed has nothing to compare with: unknown is never stale.
        await db.query(
          `UPDATE register_closure_sign_offs SET "contentHash" = NULL
            WHERE role = 'Review owner' AND "closureId" IN (SELECT id FROM register_closures WHERE "projectId" = $1 AND "registerKey" = $2 AND "gateId" = $3)`,
          [PROJECT, registerKey, gateId],
        );
        await outOfBandEdit('changed out of band again, after a signature that has no stored hash');
        t('a signature recorded without a hash is never marked stale', !(await closureRow())?.stale, short(await closureRow()));
      }
      // Put a hash back, so that "withdrawing clears it" below proves something (the legacy case left it NULL).
      await db.query(
        `UPDATE register_closure_sign_offs SET "contentHash" = 'to-be-cleared'
          WHERE role = 'Review owner' AND "closureId" IN (SELECT id FROM register_closures WHERE "projectId" = $1 AND "registerKey" = $2 AND "gateId" = $3)`,
        [PROJECT, registerKey, gateId],
      );
      // The project version moved while the closer read; the signature never depended on it.
      r = await api(signer, 'POST', `${base}/withdraw`, { gateId, role: 'Review owner', reason: 'e2e cleanup', expectedVersion: await version() });
      t('the signer withdraws it again (leaves the register as it was)', r.status < 300 && !(await signed()), `${r.status} ${short(r.json)}`);
      t('...and withdrawing clears the stored hash', (
        await db.query(
          `SELECT s."contentHash" FROM register_closure_sign_offs s JOIN register_closures c ON c.id = s."closureId"
            WHERE c."projectId" = $1 AND c."registerKey" = $2 AND c."gateId" = $3 AND s.role = 'Review owner'`,
          [PROJECT, registerKey, gateId],
        )
      ).rows[0]?.contentHash == null);
    }
  }

  // ============================================================ signature cell: review before signing
  console.log('\n--- a signature cell: the signer reads the row first, and the signature is bound to what they read');
  {
    const registerKey = 'formulationChangeRegister';
    const column = 'npSignOff';
    const cfg = REGISTER_CONFIGS.find((c: any) => c.key === registerKey);
    // The Formulation Change Register is a view of the Change Control log (Round 5 question 11): its row is the Final Approver's overlay on a master change,
    // so the test edits the first column of that overlay a person can type in, not a base column read from the change record.
    const textColumn = 'actionNpd' as string | undefined;
    t('the register with a signature column exists', !!cfg && !!textColumn);
    if (cfg && textColumn) {
      const signer = 'admin';
      const regRows = async () => ((await project()).project.registers[registerKey] ?? []) as any[];
      const putRows = async (rows: any[]) =>
        api('admin', 'PUT', `/projects/${PROJECT}/registers/${registerKey}`, { rows, expectedVersion: await version() });
      const before = await regRows();
      // A formulation change raised on the Change Control page brings its row into the register; nothing is added to the register by hand.
      const changesNow = async () => ((await project()).project.changes ?? []) as any[];
      const fcChange = {
        changeId: 'CHG-E2E-FC', projectId: PROJECT, triggerId: 'pif-any-change', trigger: 'e2e formulation change', productSku: 'e2e',
        affectedArea: 'Formula / ingredient', riskLevel: 'Low', communicationRequired: false, status: 'Draft', owner: 'e2e owner',
      };
      let r: any = await api('admin', 'PUT', `/projects/${PROJECT}/changes`, { records: [...(await changesNow()), fcChange], expectedVersion: await version() });
      t('a formulation change is recorded on the Change Control page', r.status < 300, `${r.status} ${short(r.json)}`);
      const afterRaise = await regRows();
      const index = afterRaise.findIndex((x: any) => x.masterChangeId === 'CHG-E2E-FC');
      t('...and its row appears in the register, with the change as its master and its FC number as an alias', index >= 0 && afterRaise.length === before.length + 1 && /^FC-\d+$/.test(String(afterRaise[index].changeId)), short(afterRaise[index]));
      t('the row\'s base data is read from the change record, not typed on the row', afterRaise[index]?.changeTitle === 'e2e formulation change' && afterRaise[index]?.productFamilySku === 'e2e', short(afterRaise[index]));
      r = await putRows([...afterRaise, { changeId: 'FC-999', actionNpd: 'typed by hand' }].map((x) => ({ ...x })));
      t('a row cannot be added to the register by hand (400)', r.status === 400 && /view of the Change Control log/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
      r = await putRows(afterRaise.filter((_: any, i: number) => i !== index).map((x) => ({ ...x })));
      t('...nor removed from it (400)', r.status === 400 && /view of the Change Control log/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
      {
        const edited = afterRaise.map((x: any, i: number) => (i === index ? { ...x, changeTitle: 'typed on the register', [textColumn!]: 'e2e original text' } : { ...x }));
        r = await putRows(edited);
        const stored = (await db.query(`SELECT data FROM register_rows WHERE "projectId" = $1 AND "registerKey" = $2 AND "rowOrder" = (SELECT "rowOrder" FROM register_rows WHERE "projectId" = $1 AND "registerKey" = $2 AND data->>'masterChangeId' = 'CHG-E2E-FC')`, [PROJECT, registerKey])).rows[0]?.data ?? {};
        t('an edit of the overlay is stored, and a base column sent with it is never written back', r.status < 300 && stored[textColumn!] === 'e2e original text' && !('changeTitle' in stored), `${r.status} ${short(stored)}`);
      }
      const base = `/projects/${PROJECT}/registers/${registerKey}/rows/${index}/signature`;
      const isSigned = async () => !!(await regRows())[index]?.['npSignOff__userId'];

      const pv = (await api(signer, 'GET', `${base}/preview?column=${column}`)).json;
      t('the preview carries title, column label, the row and a 64-character hash',
        typeof pv.hash === 'string' && pv.hash.length === 64 && typeof pv.title === 'string' && pv.columnLabel === cfg.columns.find((c: any) => c.key === column).label && pv.row?.[textColumn] === 'e2e original text',
        short(pv));
      t('the column being signed is not part of what is shown', !pv.columns?.some((c: any) => c.key === column));
      const pv2 = (await api(signer, 'GET', `${base}/preview?column=${column}`)).json;
      t('two previews of an unchanged row give the same hash', pv.hash === pv2.hash);
      r = await api(signer, 'GET', `/projects/${PROJECT}/registers/${registerKey}/rows/9999/signature/preview?column=${column}`);
      t('a preview of a row that does not exist is refused (404)', r.status === 404, `${r.status} ${short(r.json)}`);
      r = await api(signer, 'GET', `${base}/preview?column=${textColumn}`);
      t('a preview for a column that is not a signature column is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);

      r = await api(signer, 'POST', `${base}/step-up`, { column, code: '000000' });
      t('a step-up with no hash is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
      r = await api(signer, 'POST', `${base}/sign`, { column, stepUpToken: 'x' });
      t('a sign with no hash is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);

      const oneCode = await code(signer);
      r = await api(signer, 'POST', `${base}/step-up`, { column, code: oneCode, expectedHash: 'f'.repeat(64) });
      t('a step-up bound to a hash the row does not have is refused (422, REGISTER_CONTENT_CHANGED)',
        r.status === 422 && r.json?.code === 'REGISTER_CONTENT_CHANGED', `${r.status} ${short(r.json)}`);
      r = await api(signer, 'POST', `${base}/step-up`, { column, code: oneCode, expectedHash: pv.hash });
      t('...and that refusal did not spend the code: the same code then works with the right hash', r.status < 300 && !!r.json?.stepUpToken, `${r.status} ${short(r.json)}`);
      const staleToken = r.json?.stepUpToken;

      // Somebody else edits the row after the signer opened the preview.
      const cur = await regRows();
      cur[index] = { ...cur[index], [textColumn]: 'e2e text edited while the signer was reading' };
      r = await putRows(cur.map((x) => ({ ...x })));
      t('another person edits the row after the preview', r.status < 300, `${r.status} ${short(r.json)}`);
      r = await api(signer, 'POST', `${base}/sign`, { column, stepUpToken: staleToken, expectedHash: pv.hash });
      t('signing with the old hash is refused (422, REGISTER_CONTENT_CHANGED)', r.status === 422 && r.json?.code === 'REGISTER_CONTENT_CHANGED', `${r.status} ${short(r.json)}`);
      t('...and nothing was signed', !(await isSigned()));

      const pv3 = (await api(signer, 'GET', `${base}/preview?column=${column}`)).json;
      t('the new preview has a different hash and shows the edited text',
        pv3.hash !== pv.hash && String(pv3.row?.[textColumn]).includes('edited while the signer was reading'), short(pv3.row));
      const su = await api(signer, 'POST', `${base}/step-up`, { column, code: await code(signer), expectedHash: pv3.hash });
      t('a step-up bound to the new hash is accepted', su.status < 300 && !!su.json?.stepUpToken, `${su.status} ${short(su.json)}`);
      r = await api(signer, 'POST', `${base}/sign`, { column, stepUpToken: su.json?.stepUpToken, expectedHash: pv3.hash });
      t('signing with the hash of what was just reviewed succeeds', r.status < 300, `${r.status} ${short(r.json)}`);
      t('...and the signature is recorded', await isSigned());

      // ---- while a cell signature stands its row is LOCKED; stale only catches what got past that --------
      {
        const dbRow = async (): Promise<Record<string, unknown>> =>
          (
            await db.query(`SELECT data FROM register_rows WHERE "projectId" = $1 AND "registerKey" = $2 AND "rowOrder" = $3`, [PROJECT, registerKey, index])
          ).rows[0]?.data ?? {};
        const outOfBandEdit = async (text: string) =>
          db.query(
            `UPDATE register_rows SET data = jsonb_set(data, ARRAY[$4], to_jsonb($5::text)) WHERE "projectId" = $1 AND "registerKey" = $2 AND "rowOrder" = $3`,
            [PROJECT, registerKey, index, textColumn, text],
          );
        const fresh = (await regRows())[index];
        t('right after signing the row is not stale and the derived approved tick is on (the tick is not part of what was signed)',
          !fresh['npSignOff__stale'] && fresh['approvedByNp'] === 'Approved', short(fresh));
        t('the signature stored the hash of what was shown', (await dbRow())['npSignOff__hash'] === pv3.hash, short(await dbRow()));

        const cur2 = await regRows();
        cur2[index] = { ...cur2[index], [textColumn]: 'e2e text changed AFTER it was signed', npSignOff__hash: 'forged', npSignOff__stale: false };
        r = await putRows(cur2.map((x) => ({ ...x })));
        t('a signed row cannot be edited (403), and the client forging the hash and the stale flag changes nothing',
          r.status === 403 && String(r.json?.message).includes('locked'), `${r.status} ${short(r.json)}`);
        const kept = await dbRow();
        t('...the stored row, its hash and its approved tick are untouched',
          kept[textColumn] === pv3.row?.[textColumn] && kept['npSignOff__hash'] === pv3.hash && kept['approvedByNp'] === 'Approved', short(kept));
        t('a different row of the same register can still be edited (only the signed row is locked)', (await regRows()).length >= 1);

        await outOfBandEdit('e2e text changed out of band, after it was signed');
        const afterEdit = (await regRows())[index];
        t('a change that got past the lock (out of band) makes the signature stale and turns the approved tick off',
          afterEdit['npSignOff__stale'] === true && afterEdit['approvedByNp'] === 'Pending Final Approver decision', short(afterEdit));
        // Edited through the API while stale: a stale signature locks nothing, and the committed copy the
        // server reads already carries the computed flag, which is exactly how it could be written back.
        const cur2b = await regRows();
        cur2b[index] = { ...cur2b[index], [textColumn]: 'e2e text changed again through the API, while the signature was already stale' };
        r = await putRows(cur2b.map((x) => ({ ...x })));
        const storedAgain = await dbRow();
        t('a stale signature does not lock the row, and the flag is still never stored',
          r.status < 300 && !('npSignOff__stale' in storedAgain) && storedAgain['npSignOff__hash'] === pv3.hash, `${r.status} ${short(storedAgain)}`);

        const pv4 = (await api(signer, 'GET', `${base}/preview?column=${column}`)).json;
        const su4 = await api(signer, 'POST', `${base}/step-up`, { column, code: await code(signer), expectedHash: pv4.hash });
        r = await api(signer, 'POST', `${base}/sign`, { column, stepUpToken: su4.json?.stepUpToken, expectedHash: pv4.hash });
        t('a stale signature is replaced by signing again, without withdrawing first', r.status < 300, `${r.status} ${short(r.json)}`);
        const resigned = (await regRows())[index];
        t('...after which it counts again, the tick is back on, and the new hash is stored',
          !resigned['npSignOff__stale'] && resigned['approvedByNp'] === 'Approved' && (await dbRow())['npSignOff__hash'] === pv4.hash, short(resigned));

        // A signature recorded before hashes existed has nothing to compare with: unknown is never stale.
        await db.query(
          `UPDATE register_rows SET data = data - 'npSignOff__hash' WHERE "projectId" = $1 AND "registerKey" = $2 AND "rowOrder" = $3`,
          [PROJECT, registerKey, index],
        );
        await outOfBandEdit('e2e text changed out of band once more, after a signature with no stored hash');
        const legacy = (await regRows())[index];
        t('a signature recorded without a hash is never marked stale', !legacy['npSignOff__stale'] && legacy['approvedByNp'] === 'Approved', short(legacy));
      }

      // Clean up: withdraw, then remove the row so later steps see the register as it was.
      r = await api(signer, 'POST', `${base}/withdraw`, { column, reason: 'e2e cleanup', expectedVersion: await version() });
      t('the signer withdraws it again', r.status < 300 && !(await isSigned()), `${r.status} ${short(r.json)}`);
      r = await api('admin', 'PUT', `/projects/${PROJECT}/changes`, { records: (await changesNow()).filter((c: any) => c.changeId !== 'CHG-E2E-FC'), expectedVersion: await version() });
      t('the test change is discarded (a Draft can be), and its row leaves the register with it', r.status < 300 && (await regRows()).length === before.length, `${r.status} ${short(r.json)}`);
    }
  }

  // Register closing is a precondition of passing a gate, and a CLOSED register is read-only — so a
  // gate's registers are closed only when that gate is about to pass, as in real use, never earlier.
  // The closing signatures themselves are not under test.
  const closeRegistersOf = async (gates: string[]): Promise<number> => {
    // Closures are created when somebody signs (SW-36), per register AND gate, so they are written here directly.
    let count = 0;
    for (const gate of gates) {
      for (const { registerKey } of rc.requiredRegisterClosures(gate)) {
        const closure = await db.query(
          `INSERT INTO register_closures (id, "projectId", "registerKey", "gateId") VALUES (gen_random_uuid()::text, $1, $2, $3)
             ON CONFLICT ("projectId", "registerKey", "gateId") DO UPDATE SET "gateId" = EXCLUDED."gateId" RETURNING id`,
          [PROJECT, registerKey, gate],
        );
        for (const role of rc.registerClosureRoles(REGISTER_CONFIGS.find((c: any) => c.key === registerKey))) {
          await db.query(
            `INSERT INTO register_closure_sign_offs (id, "closureId", role, name, "signedByUserId", "signedAt")
               VALUES (gen_random_uuid()::text, $1, $2, 'x', $3, now())
               ON CONFLICT ("closureId", role) DO UPDATE SET name = 'x', "signedByUserId" = $3, "signedAt" = now()`,
            [closure.rows[0].id, role, sessions.admin.id],
          );
        }
        count += 1;
      }
    }
    return count;
  };
  // A register is closed per gate and a closure locks its rows (SW-36), so each gate's registers are closed only when that
  // gate is about to pass, as in real use.
  // Key Gate Checks are part of a gate's evidence (and of its signature snapshot), and phase closing
  // requires them all done. Ticking them AFTER a gate was signed would turn that signature stale, so
  // they are ticked before anything is signed — as a real project must do.
  await db.query(`UPDATE gate_checks SET done = true, ynna = 'Y' WHERE "projectId" = $1 AND gate IN ('01','02','03','04','05','06','07','08','09','10','11','12','ALL')`, [PROJECT]);

  // ============================================================ Change Control: when may one be opened (SW-30)
  console.log('\n--- Change Control: a trigger is available once its earliest gate has passed (SW-30)');
  const newChange = (changeId: string, triggerId: string) => ({
    changeId,
    projectId: PROJECT,
    triggerId,
    trigger: triggerId,
    productSku: 'e2e',
    affectedArea: 'Other',
    riskLevel: 'Low',
    communicationRequired: false,
    status: 'Draft',
    owner: 'e2e owner',
  });
  const putChanges = async (records: unknown[]) =>
    api('admin', 'PUT', `/projects/${PROJECT}/changes`, { records, expectedVersion: await version() });
  let cr: any = await putChanges([newChange('CHG-E2E-1', 'formula-ingredient')]);
  t('a Gate 1 project cannot open a formula change (earliest gate 05 has not passed) (400)', cr.status === 400 && /Gate 05 has not passed/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putChanges([newChange('CHG-E2E-2', 'pif-launch')]);
  t('...nor a dossier change (earliest gate 10) (400)', cr.status === 400, `${cr.status} ${short(cr.json)}`);
  const cpj = await project();
  t('...and the refusal recorded nothing', (cpj.changes ?? []).length === 0, short(cpj.changes));
  cr = await putChanges([newChange('CHG-E2E-3', 'pif-any-change')]);
  t('a trigger naming ALL gates can be opened at any time', cr.status < 300, `${cr.status} ${short(cr.json)}`);
  cr = await putChanges([]);
  t('...and a Draft can be discarded again (leaves the run as it found it)', cr.status < 300, `${cr.status} ${short(cr.json)}`);

  // ---- SW-55: duplicate ids, closing needs the final disposition, a closed change is frozen, Reopen needs a reason
  console.log('\n--- Change Control: id uniqueness, closing, freezing and reopening (SW-55)');
  cr = await putChanges([newChange('CHG-E2E-D', 'pif-any-change'), newChange('CHG-E2E-D', 'pif-any-change')]);
  t('the same change id twice in one save is refused with a message (400, not a 500)', cr.status === 400 && /appears twice/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  const closable = { ...newChange('CHG-E2E-C1', 'pif-any-change'), impactAreas: ['Administrative only'] };
  // Round 5 question 10: a change is triaged by the project's Quality / change-control reviewer before it can be approved or
  // completed. The test user holds that function only for the duration of the act, so no later check sees it assigned.
  let triageActs = 0; // each call assigns and clears the function, which the later function-assignee audit count has to allow for
  const triage = async (changeId: string, outcome = 'No material impact', confirmedGates: string[] = []) => {
    triageActs++;
    await api('admin', 'PUT', `/projects/${PROJECT}/function-assignees`, { assignments: [{ roleKey: 'quality-change-control', userId: sessions['admin'].id }], expectedVersion: await version() });
    const res = await api('admin', 'POST', `/projects/${PROJECT}/changes/${changeId}/triage`, { outcome, confirmedGates, reason: 'e2e assessment', expectedVersion: await version() });
    await api('admin', 'PUT', `/projects/${PROJECT}/function-assignees`, { assignments: [{ roleKey: 'quality-change-control', userId: null }], expectedVersion: await version() });
    return res;
  };
  cr = await putChanges([closable]);
  t('a new change is recorded untriaged', cr.status < 300 && !(cr.json?.project?.changes ?? []).find((c: any) => c.changeId === 'CHG-E2E-C1')?.impactTriage, `${cr.status} ${short(cr.json)}`);
  cr = await api('admin', 'POST', `/projects/${PROJECT}/changes/CHG-E2E-C1/triage`, { outcome: 'No material impact', confirmedGates: [], reason: 'x', expectedVersion: await version() });
  t('nobody holds Quality / change-control yet, so nobody can triage it (400)', cr.status === 400 && /Nobody is assigned/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putChanges([{ ...closable, status: 'Approved - Implementation Pending' }]);
  t('an untriaged change cannot be approved to implement (400)', cr.status === 400 && /impact has not been assessed/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putChanges([{ ...closable, impactTriage: 'Material impact', triageBy: 'forged', confirmedGates: ['SG05'] }]);
  const stillBlank = (cr.json?.project?.changes ?? []).find((c: any) => c.changeId === 'CHG-E2E-C1');
  t('a triage sent by the client in an ordinary save is discarded', cr.status < 300 && !stillBlank?.impactTriage && !stillBlank?.triageBy, `${cr.status} ${short(stillBlank)}`);
  cr = await api('admin', 'POST', `/projects/${PROJECT}/changes/CHG-E2E-C1/triage`, { outcome: 'Material impact', confirmedGates: [], reason: 'x', expectedVersion: await version() });
  t('a Material triage with no confirmed scope is refused (400)', cr.status === 400, `${cr.status} ${short(cr.json)}`);
  cr = await triage('CHG-E2E-C1');
  const triaged = (cr.json?.project?.changes ?? []).find((c: any) => c.changeId === 'CHG-E2E-C1');
  t('the holder records the triage as themselves, with the date', cr.status < 300 && triaged?.impactTriage === 'No material impact' && !!triaged?.triageBy && !!triaged?.triageDate, `${cr.status} ${short(triaged)}`);
  cr = await triage('CHG-E2E-C1');
  t('a recorded triage can be revised by the holder, and the earlier assessment stays in the audit trail', cr.status < 300 && !!(await triage('CHG-E2E-C1')).json?.project, `${cr.status} ${short(cr.json)}`);
  cr = await putChanges([{ ...closable, status: 'Completed', closedDate: '2030-01-02' }]);
  t('closing as Completed without the final disposition is refused, naming what is missing (400)', cr.status === 400 && /final disposition/.test(String(cr.json?.message)) && /closureOutcome/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  const closed = {
    ...closable,
    status: 'Completed',
    closedDate: '2030-01-02',
    closureOutcome: 'replaced',
    closureImplementation: 'supplier swapped',
    closureEvidence: 'https://example.com/e2e-closure',
    closureImpactedVersions: 'F1.0',
    closureVerifier: 'e2e verifier',
  };
  cr = await putChanges([closed]);
  t('with the disposition recorded the same change can be closed (200)', cr.status < 300, `${cr.status} ${short(cr.json)}`);
  cr = await putChanges([{ ...closed, riskLevel: 'High' }]);
  t('a closed change is frozen: editing a field is refused (400)', cr.status === 400 && /frozen/.test(String(cr.json?.message)) && /riskLevel/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putChanges([{ ...closed, status: 'In Implementation' }]);
  t('...and so is moving it back to an open status by a plain save (400) — a gate cannot be un-passed that way', cr.status === 400 && /frozen/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putChanges([]);
  t('...and it cannot be deleted (only a Draft can) (400)', cr.status === 400 && /only a Draft/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  const reopen = async (reason: unknown) =>
    api('admin', 'POST', `/projects/${PROJECT}/changes/CHG-E2E-C1/reopen`, { reason, expectedVersion: await version() });
  cr = await reopen('   ');
  t('reopening without a reason is refused (400)', cr.status === 400 && /reason is required/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await reopen('the supplier reversed the change');
  const reopened = (cr.json?.project?.changes ?? []).find((c: any) => c.changeId === 'CHG-E2E-C1');
  t('reopening with a reason puts it back to Under Review and keeps what was recorded', cr.status < 300 && reopened?.status === 'Under Review' && reopened?.closureOutcome === 'replaced', `${cr.status} ${short(cr.json)}`);
  const reopenAudit = (
    await db.query(`SELECT after FROM audit_events WHERE "projectId" = $1 AND action = 'change.reopened' ORDER BY "occurredAt" DESC, id DESC LIMIT 1`, [PROJECT])
  ).rows[0]?.after;
  t('...and the audit row carries the reason and the status it left', reopenAudit?.reason === 'the supplier reversed the change' && reopenAudit?.from === 'Completed', short(reopenAudit));
  cr = await reopen('again');
  t('a change that is not closed cannot be reopened (400)', cr.status === 400 && /not closed/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putChanges([{ ...reopened, riskLevel: 'Medium' }]);
  t('once reopened it can be edited again (200)', cr.status < 300, `${cr.status} ${short(cr.json)}`);
  cr = await putChanges([{ ...closed, riskLevel: 'Medium' }]);
  t('...and closed again, with its disposition still there (200)', cr.status < 300, `${cr.status} ${short(cr.json)}`);
  // A change id belongs to ONE project; this run has a single project, so the cross-project half is covered by the
  // same message in the unit above.

  // ---- the per-market regulatory checklist holds ONE row per market: Gate 10 reads the first row of a market, so a
  // second one would be ignored without a word
  console.log('\n--- Regulatory Checklist Status: one row per market');
  const nonAsean = 'Australia';
  const dossierRow = (market: string) => ({ market, dossierType: 'e2e dossier' });
  const putDossier = async (rows: unknown[]) =>
    api('admin', 'PUT', `/projects/${PROJECT}/registers/regulatoryChecklistStatus`, { rows, expectedVersion: await version() });
  cr = await putDossier([dossierRow(nonAsean), dossierRow(nonAsean)]);
  t('two rows for the same market are refused (400), naming the market and the rows', cr.status === 400 && /Applicable market/.test(String(cr.json?.message)) && /rows 1, 2/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putDossier([dossierRow(nonAsean), dossierRow(nonAsean.toUpperCase())]);
  t('...whatever the capitalisation (400)', cr.status === 400, `${cr.status} ${short(cr.json)}`);
  cr = await putDossier([dossierRow('Vietnam')]);
  t('an ASEAN market is refused here — the ASEAN PIF checklist covers it (400)', cr.status === 400 && /ASEAN market/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putDossier([dossierRow(nonAsean)]);
  t('one row for a market is accepted', cr.status < 300, `${cr.status} ${short(cr.json)}`);
  cr = await putDossier([]);
  t('...and removed again so the run is left as it was', cr.status < 300, `${cr.status} ${short(cr.json)}`);

  // ---- the Change Control assessment, listed per post-market finding (Round 4 question 8, R5-Q11)
  console.log('\n--- Change Control assessment: one entry per post-market finding');
  const me = (await api('admin', 'GET', '/auth/me')).json?.displayName as string;
  const putAssessments = async (entries: unknown[]) =>
    api('admin', 'PUT', `/projects/${PROJECT}/change-control-assessments`, { entries, expectedVersion: await version() });
  const mk = (await project()).project.identity.markets[0] as string;
  const today = new Date().toISOString().slice(0, 10);
  const noEntry = (finding: string, over: Record<string, unknown> = {}) => ({
    id: '', finding, category: 'Complaint trend', markets: mk, answer: 'No', reviewer: me, reviewDate: today,
    rationale: 'within the expected range', ...over,
  });
  cr = await putAssessments([noEntry('Rising complaints', { answer: 'Yes', reviewer: undefined, rationale: undefined })]);
  t('Yes without a linked record is refused (400)', cr.status === 400 && /Yes needs a linked/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints', { rationale: undefined })]);
  t('No without a rationale is refused (400)', cr.status === 400 && /No needs the reviewer, the review date and the rationale/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints', { reviewDate: undefined })]);
  t('...and so is a No without a review date (Round 5 question 2(c))', cr.status === 400, `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints', { category: undefined })]);
  t('a finding with no source / category is refused (400)', cr.status === 400 && /category is required/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints', { markets: undefined })]);
  t('a finding that names no market is refused (400)', cr.status === 400 && /choose the market/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints', { answer: 'Yes', linkedRecordId: 'CHG-999', reviewer: undefined, rationale: undefined })]);
  t('a record that is not on this project is refused (400)', cr.status === 400 && /not a change record of this project/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints', { reviewer: 'Somebody Else' })]);
  t('a reviewer that is not the person saving is refused (400)', cr.status === 400 && /can only be set to yourself/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('')]);
  t('an entry that does not say which finding it is about is refused (400)', cr.status === 400, `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints', { findingId: 'FND-099' }), noEntry('Eye irritation, Singapore', { answer: 'Pending assessment' })]);
  t('two findings are recorded as two entries', cr.status < 300 && (cr.json?.project?.changeControlAssessments ?? []).length === 2, `${cr.status} ${short(cr.json)}`);
  let list: any[] = cr.json?.project?.changeControlAssessments ?? [];
  t('...in the order given, each with its own id and its market', list[0]?.finding === 'Rising complaints' && list[1]?.markets === mk && !!list[0]?.id && list[0].id !== list[1]?.id, short(list));
  t('...each with a generated Finding ID, whatever the client sent', list[0]?.findingId === 'FND-001' && list[1]?.findingId === 'FND-002', short(list.map((x) => x.findingId)));
  t('...and the Pending one holds Gate 12 on the Change-control item', gp.evaluateTrigger(cr.json.project, 'openChangeControl') === 'notAssessed');
  const keptId = list[0].id;
  cr = await putAssessments([{ ...list[0], finding: 'Rising irritation complaints (renamed)' }]);
  list = cr.json?.project?.changeControlAssessments ?? [];
  t('saving with an existing id edits it in place, and leaving the other out removes it', cr.status < 300 && list.length === 1 && list[0].id === keptId && /renamed/.test(list[0].finding), `${cr.status} ${short(cr.json)}`);
  t('...so with only a No left, the item no longer applies', gp.evaluateTrigger(cr.json.project, 'openChangeControl') === 'doesNotApply');
  const ccAudit = (
    await db.query(`SELECT after FROM audit_events WHERE "projectId" = $1 AND action = 'change_control_assessments.updated' ORDER BY "occurredAt" DESC, id DESC LIMIT 1`, [PROJECT])
  ).rows[0]?.after;
  t('the audit event names what was removed, so nothing disappears silently', Array.isArray(ccAudit?.removed) && ccAudit.removed.length === 1 && /Eye irritation/.test(ccAudit.removed[0].finding), short(ccAudit));
  // A Pending finding holds the close-out of the review it belongs to (answer 2(c)); a review elsewhere is not held by it.
  const putReviews = async (reviews: unknown[]) =>
    api('admin', 'PUT', `/projects/${PROJECT}/post-launch-reviews`, { reviews, expectedVersion: await version() });
  cr = await putReviews([{ id: '', market: mk, milestone: 'signal', dueDate: today }]);
  t('a review is recorded (a signal review exists only once recorded)', cr.status < 300, `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([{ ...list[0], reviewCycle: `${mk}|signal`, answer: 'Pending assessment' }]);
  t('a finding is linked to that review cycle', cr.status < 300 && cr.json?.project?.changeControlAssessments?.[0]?.reviewCycle === `${mk}|signal`, `${cr.status} ${short(cr.json)}`);
  cr = await putReviews([{ id: '', market: mk, milestone: 'signal', dueDate: today, completedDate: today, reviewer: me, outcome: 'No action' }]);
  t('the review cannot be closed while its finding is Pending (400, names the finding)', cr.status === 400 && /FND-001/.test(String(cr.json?.message)) && /still pending/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([{ ...list[0], reviewCycle: `${mk}|signal`, answer: 'No' }]);
  t('...and the finding can then be answered No (the run is left with a plain No)', cr.status < 300, `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([]);
  t('an empty list is accepted as a save, and then blocks the gate again (not "nothing to assess")', cr.status < 300 && gp.evaluateTrigger(cr.json.project, 'openChangeControl') === 'notAssessed', `${cr.status} ${short(cr.json)}`);

  // ============================================================ SG01: identity data
  console.log('\n--- SG01 (the identity fields are Gate 1 data)');
  let r: any = await nominate('SG01');
  t('SG01 nominations accepted', r.status < 300, short(r.json));
  // SW-26: Complete alone is not enough — the owner, due date and evidence link of the Phase Gate Flow card
  // must be saved before a passing signature, or the gate is signed on data that is still to be filled in.
  r = await api('admin', 'PUT', `/projects/${PROJECT}/gates/SG01`, { status: 'Complete', expectedVersion: await version() });
  t('SG01 stage status set to Complete without the other Phase Gate Flow fields', r.status < 300, short(r.json));
  r = await sign('SG01', 'Prepared by');
  t('signing Proceed with the Phase Gate Flow incomplete is refused (400) and names what is missing',
    r.stage === 'sign' && r.status === 400 && /Phase Gate Flow/.test(JSON.stringify(r.json)) && /Owner/.test(JSON.stringify(r.json)) && /Due date/.test(JSON.stringify(r.json)),
    `${r.stage} ${r.status} ${short(r.json)}`);
  await closeRegistersOf(['SG01']);
  r = await complete('SG01');
  t('SG01 Phase Gate Flow completed (owner, due date, evidence link) and Complete', r.status < 300, short(r.json));
  r = await sign('SG01', 'Prepared by');
  t('Prepared by signs SG01 through a real step-up', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  const row = (
    await db.query(
      `SELECT snapshot IS NOT NULL AS a, snapshot::jsonb ? 'projectData' AS b, snapshot::jsonb ? 'registerCells' AS c
         FROM gate_sign_offs WHERE "projectId" = $1 AND "gateId" = 'SG01' AND role = 'Prepared by'`,
      [PROJECT],
    )
  ).rows[0];
  t('the stored snapshot carries projectData and registerCells', !!row && row.a && row.b && row.c, short(row));
  await api('admin', 'PUT', `/projects/${PROJECT}/identity`, { patch: { projectLead: 'Nguyen' }, expectedVersion: await version() });
  t('re-saving a field readiness does not read leaves the signature current', (await stale('SG01', 'Prepared by')).length === 0, short(await stale('SG01', 'Prepared by')));
  r = await api('admin', 'PUT', `/projects/${PROJECT}/identity`, {
    patch: { initialScope: 'A different scope after signing' },
    expectedVersion: await version(),
  });
  t('editing initialScope (Gate 1 data) while the Prepared signature stands is refused (403), naming what is locked',
    r.status === 403 && String(r.json?.message).includes('Project identity') && String(r.json?.message).includes('locked'), `${r.status} ${short(r.json)}`);
  t('...and the signature is still current', (await stale('SG01', 'Prepared by')).length === 0, short(await stale('SG01', 'Prepared by')));
  // 2026-10-11: the gate's whole page is signed content, so the requester and the gate card's own fields are locked too.
  r = await api('admin', 'PUT', `/projects/${PROJECT}/identity`, { patch: { requesterName: 'Someone else' }, expectedVersion: await version() });
  t('editing the requester (Opportunity & Request) while the Prepared signature stands is refused (403)',
    r.status === 403 && String(r.json?.message).includes('Requester name'), `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/gates/SG01`, { notes: 'a note after signing', expectedVersion: await version() });
  t('editing the gate notes while the Prepared signature stands is refused (403)',
    r.status === 403 && String(r.json?.message).includes('Gate notes'), `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/gates/SG01`, { owner: 'Somebody', expectedVersion: await version() });
  t('editing the gate owner while the Prepared signature stands is refused (403)',
    r.status === 403 && String(r.json?.message).includes('Gate owner'), `${r.status} ${short(r.json)}`);
  t('...and the signature is still current after those refusals', (await stale('SG01', 'Prepared by')).length === 0, short(await stale('SG01', 'Prepared by')));
  r = await api(signerKey('SG01', 'Prepared by'), 'POST', `/projects/${PROJECT}/gates/SG01/sign-offs/withdraw`, {
    role: 'Prepared by',
    reason: 'scope changed',
    expectedVersion: await version(),
  });
  t('Prepared withdraws the signature (the way to change what was signed)', r.status < 300, short(r.json));
  r = await api('admin', 'PUT', `/projects/${PROJECT}/identity`, {
    patch: { initialScope: 'A different scope after signing' },
    expectedVersion: await version(),
  });
  t('...after which the same edit is accepted', r.status < 300, short(r.json));
  for (const role of ROLES) {
    r = await sign('SG01', role);
    t(`${role} signs SG01`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  let pj = await project();
  const g1 = pj.project.gates.find((g: any) => g.gateId === 'SG01');
  t("the approver's decision became the gate decision and SG01 passed", g1.decision === 'Proceed' && gp.isGatePassed(pj.project, 'SG01'), short(g1));
  r = await api('admin', 'PUT', `/projects/${PROJECT}/identity`, { patch: { initialScope: 'Edited after SG01 passed' }, expectedVersion: await version() });
  t('after SG01 passed, editing initialScope is refused (403)', r.status === 403, `${r.status} ${short(r.json)}`);

  // ============================================================ SG02
  // While an acknowledgement stands, the target user that would make its "not applicable" untrue cannot be ticked (project owner,
  // 2026-11-06). Gate 2 is still open here, so the checklist is editable and the guard is what answers. The infant item is used
  // because the harness keeps it; everything is put back so the later sections start from the same state.
  console.log('\n--- SG02: a target user that would void an acknowledgement waits for its withdrawal');
  // The administrator's own account is the holder here: asking for a signer key this early would change which accounts the later
  // sections are given, and the checks there count on those being different people.
  const voidHolder = sessions['admin'];
  const voidHolderKey = 'admin';
  // Maternal and infant exclusions are a person's answer (Round 5 question 1(d)), so the project records that no such contact is
  // reasonably foreseeable before anything below can read "not applicable".
  const adminDisplayName: string = (await db.query(`SELECT "displayName" FROM users WHERE id = $1`, [sessions['admin'].id])).rows[0]?.displayName;
  // Reason and confirmer are one record (project owner, 2026-11-09): a reason nobody has confirmed is refused, and so is a
  // confirmation in somebody else's name.
  r = await api('admin', 'PUT', `/projects/${PROJECT}/assessments`, { patch: { foreseeableContactRationale: 'e2e: adult product' }, expectedVersion: await version() });
  t('a foreseeable-contact reason with nobody confirming it is refused', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/assessments`, { patch: { foreseeableContactRationale: 'e2e: adult product', foreseeableContactConfirmedBy: 'Somebody Else' }, expectedVersion: await version() });
  t('...and a confirmation in the name of another person is refused', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/assessments`, { patch: { administrativeOnly: 'Yes', administrativeOnlyConfirmedBy: adminDisplayName }, expectedVersion: await version() });
  t('an administrative-only Yes with no reason is refused', r.status === 400, `${r.status} ${short(r.json)}`);
  // The four surveillance conditions are the same shape: a No needs its reason AND the person who confirmed it.
  r = await api('admin', 'PUT', `/projects/${PROJECT}/assessments`, { patch: { pmsNewActive: 'No', pmsNewActiveRationale: 'e2e: none' }, expectedVersion: await version() });
  t('a surveillance No with a reason but nobody confirming it is refused', r.status === 400 && /confirmed it/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/assessments`, { patch: { pmsNewActive: 'No', pmsNewActiveRationale: 'e2e: none', pmsNewActiveConfirmedBy: 'Somebody Else' }, expectedVersion: await version() });
  t('...and a confirmation in the name of another person is refused', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/assessments`, { patch: { pmsNewActive: 'No', pmsNewActiveRationale: 'e2e: none', pmsNewActiveConfirmedBy: adminDisplayName }, expectedVersion: await version() });
  t('a surveillance No with reason and confirmer is stored', r.status < 300 && (await project()).project.assessments.pmsNewActiveConfirmedBy === adminDisplayName, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/assessments`, { patch: { foreseeableContactRationale: 'e2e: adult product', foreseeableContactConfirmedBy: adminDisplayName }, expectedVersion: await version() });
  t('no maternal or infant contact is recorded as reasonably foreseeable (Gate 2)', r.status < 300, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/function-assignees`, { assignments: [{ roleKey: 'safety-study-reviewer', userId: voidHolder.id }], expectedVersion: await version() });
  t('Safety / study reviewer is assigned for this check', r.status < 300, short(r.json));
  r = await api(voidHolderKey, 'POST', `/projects/${PROJECT}/readiness-acknowledgements`, { gateId: 'SG08', itemId: 'sg08-infant-testing', functionKey: 'safety-study-reviewer', expectedVersion: await version() });
  t('the infant-testing "not applicable" is acknowledged early', r.status < 300, `${r.status} ${short(r.json)}`);
  const targetItems = ((await project()).project.checklists.targetUsers ?? []).map((i: any) => ({ ...i, selected: i.label === 'Infant 0+' ? true : i.selected }));
  r = await api('admin', 'PUT', `/projects/${PROJECT}/checklists/targetUsers`, { items: targetItems, expectedVersion: await version() });
  t('while that acknowledgement stands, ticking Infant 0+ is refused and says to withdraw it first (400)', r.status === 400 && /withdraw the acknowledgement first/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  t('...and the target users did not change', !(((await project()).project.checklists.targetUsers ?? []).find((i: any) => i.label === 'Infant 0+')?.selected));
  r = await api(voidHolderKey, 'POST', `/projects/${PROJECT}/readiness-acknowledgements/withdraw`, { gateId: 'SG08', itemId: 'sg08-infant-testing', functionKey: 'safety-study-reviewer', expectedVersion: await version() });
  t('the acknowledgement is withdrawn', r.status < 300, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/function-assignees`, { assignments: [{ roleKey: 'safety-study-reviewer', userId: null }], expectedVersion: await version() });
  t('and the function is left Unassigned again for the later checks', r.status < 300, short(r.json));

  console.log('\n--- SG02 (only to move the project to SG03)');
  await nominate('SG02');
  await closeRegistersOf(['SG02']);
  await complete('SG02');
  // F9 (SME, 2026-07-21): an open change control "prevents plain Proceed"; the approver may only sign Proceed with
  // Conditions, which records that they accept it. An ALL-gates trigger affects every gate, so SG02 is named.
  console.log('\n--- F9: an open change control that names the gate forbids a plain Proceed at the approver');
  r = await api('admin', 'PUT', `/projects/${PROJECT}/changes`, {
    records: [...(await project()).project.changes, newChange('CHG-E2E-F9', 'pif-any-change')],
    expectedVersion: await version(),
  });
  t('an open change that names SG02 is recorded', r.status < 300, `${r.status} ${short(r.json)}`);
  // Untriaged, it also holds the readiness of every gate that has not passed (Round 5 question 10).
  r = await api('admin', 'GET', `/projects/${PROJECT}`);
  t('an untriaged change holds the gate that is not yet passed (a hard block)', gp.hardGateBlockers(r.json.project, 'SG02').some((b: any) => b.id === 'change-hold'), short(gp.hardGateBlockers(r.json.project, 'SG02').map((b: any) => b.id)));
  r = await triage('CHG-E2E-F9');
  t('once triaged (no material impact) the hold is lifted but the open change still soft-locks the gate (F9)', r.status < 300 && !gp.hardGateBlockers(r.json.project, 'SG02').some((b: any) => b.id === 'change-hold'), `${r.status}`);
  for (const role of ['Prepared by', 'Reviewed by'] as const) {
    r = await sign('SG02', role);
    if (r.status >= 300) console.log('   SG02', role, r.stage, r.status, short(r.json));
  }
  r = await sign('SG02', 'Approved by');
  t('the approver signing a plain Proceed is refused while it is open (400, F9)', r.status === 400 && /open change control/.test(String(r.json?.message)), `${r.status} ${r.stage} ${short(r.json)}`);
  pj = await project();
  t('...and the gate did not pass', !gp.isGatePassed(pj.project, 'SG02'));
  r = await sign('SG02', 'Approved by', undefined, undefined, 'Proceed with Conditions');
  t('Proceed with Conditions is accepted, which is the approver accepting the open change', r.status < 300, `${r.status} ${r.stage} ${short(r.json)}`);
  const accepted = (
    await db.query(`SELECT after FROM audit_events WHERE "projectId" = $1 AND action = 'gate_sign_off.signed' ORDER BY "occurredAt" DESC, id DESC LIMIT 1`, [PROJECT])
  ).rows[0]?.after;
  t('...and the signature records which open change was accepted', JSON.stringify(accepted ?? {}).includes('CHG-E2E-F9'), short(accepted));
  // Close it (with its disposition) so it does not hold the gates that follow.
  {
    const current = (await project()).project.changes as any[];
    const f9 = current.find((c) => c.changeId === 'CHG-E2E-F9');
    r = await api('admin', 'PUT', `/projects/${PROJECT}/changes`, {
      records: current.map((c) =>
        c.changeId === 'CHG-E2E-F9'
          ? { ...f9, impactAreas: ['Administrative only'], status: 'Completed', closedDate: '2030-01-03', closureOutcome: 'none needed', closureImplementation: 'e2e', closureEvidence: 'https://example.com/e2e-f9', closureImpactedVersions: 'none', closureVerifier: 'e2e verifier' }
          : c,
      ),
      expectedVersion: await version(),
    });
    t('the test change is closed again so it holds nothing', r.status < 300, `${r.status} ${short(r.json)}`);
  }
  pj = await project();
  t('SG02 passed (with conditions)', gp.isGatePassed(pj.project, 'SG02'));

  // ============================================================ SG03: register columns
  console.log('\n--- SG03 (claim ledger: Gate 3 columns versus later-gate columns)');
  // The independent-function representative (project owner, 2026-10-15): named by the Lead before anyone signs.
  const sg3Url = `/projects/${PROJECT}/gates/SG03/sign-off-representative`;
  const sg3Assign = `/projects/${PROJECT}/gates/SG03/sign-off-assignees`;
  r = await api('admin', 'PUT', sg3Assign, { assignments: [{ role: 'Reviewed by', userId: sessions[signerKey('SG03', 'Reviewed by')].id }], expectedVersion: await version() });
  t('Reviewed by cannot be nominated on a critical gate before the representative is named (400)', r.status === 400 && /represents/.test(JSON.stringify(r.json)), `${r.status} ${short(r.json)}`);
  r = await api('tuan', 'PUT', sg3Url, { userId: sessions[signerKey('SG03', 'Approved by')].id, slot: 'Approved by', expectedVersion: await version() });
  t('only the Lead or an administrator names the representative (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', sg3Url, { userId: sessions[signerKey('SG03', 'Reviewed by')].id, slot: 'Reviewed by', expectedVersion: await version() });
  t('a person who does not represent the gate function is refused (400)', r.status === 400 && /does not represent/.test(JSON.stringify(r.json)), `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', sg3Url, { userId: sessions[signerKey('SG03', 'Approved by')].id, expectedVersion: await version() });
  t('the signature slot must be said (400)', r.status === 400 && /Reviewed by/.test(JSON.stringify(r.json)), `${r.status} ${short(r.json)}`);
  await nominate('SG03');
  r = await api('admin', 'PUT', sg3Assign, { assignments: [{ role: 'Approved by', userId: sessions[signerKey('SG03', 'Reviewed by')].id }], expectedVersion: await version() });
  t('the representative\'s slot cannot be nominated over (400)', r.status === 400 && /representative/.test(JSON.stringify(r.json)), `${r.status} ${short(r.json)}`);
  const repRows = (await project()).project.gateSignOffs.filter((x: any) => x.gateId === 'SG03' && x.representsFunction);
  t('the representative is stored on the Approved by slot with its function', repRows.length === 1 && repRows[0].role === 'Approved by', short(repRows));
  r = await putClaims(() => [{ approvedWording: 'Hydrates skin', claimCategory: 'Cosmetic' }]);
  t('a claim row is saved while SG03 is the open gate', r.status < 300, short(r.json));
  const rows0 = (await project()).project.registers.claimEvidenceTraceability;
  t('the server assigns the claim its ID (CLM-001): row IDs are generated, not typed', rows0[0].claimId === 'CLM-001', short(rows0[0]));
  t('the server no longer stamps rows (SW-4 was replaced by the row rule)', rows0[0].__rowId === undefined && rows0[0].__bornAtGate === undefined, short(rows0[0]));
  // Guard parity (2026-10-10): the signing panel holds back a passing signature until the stage status
  // is Complete, because the status is inside the signed snapshot. The server must refuse it too, or a
  // direct call signs a gate whose work is not marked done and the later status change turns it stale.
  const stageBefore = (await project()).project.gates.find((g: any) => g.gateId === 'SG03');
  t('SG03 stage status is not Complete yet (precondition for the next case)', stageBefore.status !== 'Complete', short(stageBefore));
  r = await sign('SG03', 'Prepared by');
  t('signing Proceed while the stage status is not Complete is refused (400)', r.stage === 'sign' && r.status === 400, `${r.stage} ${r.status} ${short(r.json)}`);
  t('...and the refusal says the stage must be Complete', /Complete/.test(JSON.stringify(r.json)), short(r.json));
  t('...and nothing was signed', !(await project()).project.gateSignOffs.some((s: any) => s.gateId === 'SG03' && s.signedAt), '');
  await complete('SG03');
  // The signing preview and the content hash (2026-10-09). Somebody else edits between the signer's
  // preview and the submit.
  const pv = await previewOf(signerKey('SG03', 'Prepared by'), 'SG03');
  t('the preview carries a hash and the full snapshot', typeof pv.hash === 'string' && pv.hash.length === 64 && !!pv.snapshot?.registerCells, short(Object.keys(pv)));
  const pv2 = await previewOf(signerKey('SG03', 'Prepared by'), 'SG03');
  t('two previews of unchanged evidence give the same hash', pv.hash === pv2.hash);
  r = await sign('SG03', 'Prepared by', undefined, async () => {
    await putClaims((rows) => {
      rows[0].approvedWording = 'Edited while the signer was reading';
      return rows;
    });
  });
  t('a change to what is being signed, made after the preview, refuses the submit (422)', r.status === 422 && r.json?.code === 'GATE_CONTENT_CHANGED', `${r.stage} ${r.status} ${short(r.json)}`);
  t('...naming what changed', (r.json?.changes ?? []).some((c: string) => c.includes('approvedWording')), short(r.json?.changes));
  t('...and who changed it', (r.json?.editedBy ?? []).length > 0, short(r.json?.editedBy));
  t('...and nothing was signed', (await stale('SG03', 'Prepared by')).length === 0 && !(await project()).project.gateSignOffs.some((s: any) => s.gateId === 'SG03' && s.signedAt), '');
  await putClaims((rows) => {
    rows[0].approvedWording = 'Hydrates skin';
    return rows;
  });
  r = await sign('SG03', 'Prepared by', undefined, async () => {
    await putClaims((rows) => {
      rows[0].evidenceGrade = 'A';
      return rows;
    });
  });
  t('a change to a later gate\'s column after the preview does NOT stop the signature', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  // A code bound to one version of the evidence cannot sign another.
  const keyP = signerKey('SG03', 'Reviewed by');
  const old = await previewOf(keyP, 'SG03');
  const suOld = await api(keyP, 'POST', `/projects/${PROJECT}/gates/SG03/sign-offs/step-up`, { role: 'Reviewed by', code: await code(keyP), expectedHash: old.hash });
  r = await api(keyP, 'POST', `/projects/${PROJECT}/gates/SG03/sign-offs/sign`, {
    role: 'Reviewed by',
    decision: 'Proceed',
    comment: 'checked',
    stepUpToken: suOld.json.stepUpToken,
    expectedHash: 'f'.repeat(64),
  });
  t('a step-up proof bound to one hash cannot sign with another', r.status === 422 || r.status === 400, `${r.status} ${short(r.json)}`);
  r = await api(keyP, 'POST', `/projects/${PROJECT}/gates/SG03/sign-offs/sign`, { role: 'Reviewed by', decision: 'Proceed', comment: 'x', stepUpToken: 'x' });
  t('a submit with no hash is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await putClaims((rows) => {
    rows[0].evidenceGrade = 'B';
    return rows;
  });
  t('filling a Gate 8 column (evidenceGrade) of the signed claim is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
  t('...and it does NOT make the Gate 3 Prepared signature stale', (await stale('SG03', 'Prepared by')).length === 0, short(await stale('SG03', 'Prepared by')));
  const stored = (
    await db.query(`SELECT snapshot FROM gate_sign_offs WHERE "projectId" = $1 AND "gateId" = 'SG03' AND role = 'Prepared by'`, [PROJECT])
  ).rows[0].snapshot;
  const laterInfo: string[] = snap.snapshotLaterChanges(stored, snap.gateEvidenceSnapshot((await project()).project, 'SG03'));
  t('...but the change IS reported as information (owned by a later gate)', laterInfo.some((c) => c.includes('later gate')), short(laterInfo));
  r = await putClaims((rows) => {
    rows[0].approvedWording = 'Hydrates skin deeply';
    return rows;
  });
  t('editing the Gate 3 column (approvedWording) while the Prepared signature stands is refused (403)',
    r.status === 403 && String(r.json?.message).includes('Register changed'), `${r.status} ${short(r.json)}`);
  t('...and the signature is still current', (await stale('SG03', 'Prepared by')).length === 0, short(await stale('SG03', 'Prepared by')));
  // Closed only now: a closure locks the same Gate 3 columns, and the cases above are about the signature's own lock.
  await closeRegistersOf(['SG03']);
  for (const role of ['Reviewed by', 'Approved by'] as const) {
    r = await sign('SG03', role);
    t(`${role} signs SG03`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  pj = await project();
  t('SG03 passed', gp.isGatePassed(pj.project, 'SG03'));

  console.log('\n--- SG03 has passed: what the API now allows');
  r = await putClaims((rows) => {
    rows[0].approvedWording = 'Changed after SG03 passed';
    return rows;
  });
  t('editing the frozen Gate 3 column is refused (403) and names the gate', r.status === 403 && String(r.json.message).includes('SG03'), `${r.status} ${short(r.json)}`);
  r = await putClaims((rows) => {
    rows[0].evidenceGrade = 'B';
    return rows;
  });
  t('editing the Gate 8 column of the same row is still accepted', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  t("...and SG03 is STILL passed (the later gate's work did not un-pass it)", gp.isGatePassed(pj.project, 'SG03') && (await stale('SG03', 'Approved by')).length === 0);
  r = await putClaims((rows) => [...rows, { approvedWording: 'A claim raised after SG03 passed' }]);
  t('adding a claim after SG03 passed is refused (403): part of the register belongs to Gate 3', r.status === 403 && String(r.json.message).includes('Rows cannot be added'), `${r.status} ${short(r.json)}`);
  r = await putClaims((rows) => rows.filter((x: any) => x.approvedWording !== 'Hydrates skin'));
  t('removing the claim Gate 3 signed is refused (403)', r.status === 403 && String(r.json.message).includes('Rows cannot be removed'), `${r.status} ${short(r.json)}`);
  pj = await project();
  t('SG03 is still passed and its signatures still current after the refused writes', gp.isGatePassed(pj.project, 'SG03') && (await stale('SG03', 'Approved by')).length === 0);

  // ============================================================ SG04 / SG05: BOM, costing
  console.log('\n--- Phase 1 closes (SG03 is the last gate of its phase, so SG04 only opens once the phase is signed)');
  await db.query(
    `UPDATE angle_rows SET covered = true, ynna = 'Y'
      WHERE "phaseClosureId" IN (SELECT id FROM phase_closures WHERE "projectId" = $1 AND phase = 1)`,
    [PROJECT],
  );
  // The phase signatures are real (SW-22), with a change elsewhere in the project landing between the
  // code and the signature, which used to refuse it (409).
  const phaseAngles = async () => (await project()).project.phaseClosures[1].angles;
  // Nomination is the Lead's; a plain account that is not the Lead may not.
  r = await api('tuan', 'PUT', `/projects/${PROJECT}/phases/1/sign-off-assignees`, {
    assignments: [{ role: 'Prepared by', userId: sessions[phaseKey(1, 'Prepared by')].id }],
    expectedVersion: await version(),
  });
  t('somebody who is not the project Lead cannot nominate a phase signer (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  // SW-37: inside a project authority is assignment — a person who is neither the gate's nominated approver nor the Lead
  // nor an administrator records no decision, and a person outside Regulatory / Project Manager changes no market approval.
  r = await api('tuan', 'PUT', `/projects/${PROJECT}/gates/SG04`, { decision: 'Proceed', expectedVersion: await version() });
  t('a person who is not the gate approver, the Lead or an administrator cannot record a gate decision (403)', r.status === 403 && String(r.json?.message).includes('Approved by'), `${r.status} ${short(r.json)}`);
  r = await api('tuan', 'PUT', `/projects/${PROJECT}/market-tracks`, { tracks: [], expectedVersion: await version() });
  t('...nor change market approvals (403)', r.status === 403 && String(r.json?.message).includes('Regulatory'), `${r.status} ${short(r.json)}`);
  r = await signPhase(1, 'Prepared by');
  t('signing with nobody nominated is refused (400)', r.status === 400 || r.status === 403 || r.status === 404, `${r.stage} ${r.status} ${short(r.json)}`);
  r = await nominatePhase(1);
  t('Phase 1 signers are nominated by the Lead', r.status < 300, short(r.json));
  r = await api(phaseKey(1, 'Reviewed by'), 'POST', `/projects/${PROJECT}/phases/1/sign-offs/sign`, { role: 'Prepared by', decision: 'Proceed', comments: 'x', stepUpToken: 'x' });
  t("signing somebody else's row is refused (403)", r.status === 403, `${r.status} ${short(r.json)}`);
  r = await api(phaseKey(1, 'Prepared by'), 'POST', `/projects/${PROJECT}/phases/1/sign-offs/sign`, { role: 'Prepared by', decision: 'Hold', stepUpToken: 'x' });
  t('a decision other than a plain Proceed needs a comment (400)', r.status === 400 && String(r.json?.message).includes('comment'), `${r.status} ${short(r.json)}`);
  r = await api(phaseKey(1, 'Prepared by'), 'POST', `/projects/${PROJECT}/phases/1/sign-offs/sign`, { role: 'Prepared by', decision: 'Proceed', comments: 'x' });
  t('signing without an authenticator step-up is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  // Phase 2 is far from closed, so its closure conditions refuse a signature.
  r = await nominatePhase(2);
  r = await signPhase(2, 'Prepared by');
  t('a phase whose closure conditions are not met cannot be signed (400)', r.status === 400 && String(r.json?.message).includes('closure conditions'), `${r.stage} ${r.status} ${short(r.json)}`);
  // ---- a phase signature: the signer reads what the phase page shows, and signs exactly that ----------
  console.log('\n--- phase signing: the signer reads the phase first, and the signature is bound to what they read');
  {
    const key = phaseKey(1, 'Prepared by');
    const base = `/projects/${PROJECT}/phases/1/sign-offs`;
    const pv = await phasePreviewOf(key, 1);
    const titles: string[] = (pv.sections ?? []).map((x: any) => x.title);
    t('the phase preview carries a 64-character hash and the sections of the phase page',
      typeof pv.hash === 'string' && pv.hash.length === 64 && titles.includes('Phase gate flow') && titles.includes('8 Angles coverage') && titles.includes('Next Actions') && titles.includes('Key Gate Checks'),
      short(titles));
    const flow = (pv.sections ?? []).find((x: any) => x.title === 'Phase gate flow');
    // SG02 was passed with conditions by the F9 case above, so a passing decision is either.
    t('the gate flow lists the three gates of Phase 1, all passed', flow?.rows?.length === 3 && flow.rows.every((x: any) => x.decision === 'Proceed' || x.decision === 'Proceed with Conditions'), short(flow?.rows));
    const pv2 = await phasePreviewOf(key, 1);
    t('two previews of an unchanged phase give the same hash', pv.hash === pv2.hash);
    t('a preview of an unknown phase is refused (400)', (await api(key, 'GET', `/projects/${PROJECT}/phases/9/sign-offs/preview`)).status === 400);

    let r: any = await api(key, 'POST', `${base}/step-up`, { role: 'Prepared by', code: '000000' });
    t('a phase step-up with no hash is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
    r = await api(key, 'POST', `${base}/sign`, { role: 'Prepared by', decision: 'Proceed', stepUpToken: 'x' });
    t('a phase sign with no hash is refused (400, naming the hash)', r.status === 400 && String(r.json?.message).includes('expectedHash'), `${r.status} ${short(r.json)}`);

    // A stale preview must be refused BEFORE the one-time code is spent, so the same code still works.
    const oneCode = await code(key);
    r = await api(key, 'POST', `${base}/step-up`, { role: 'Prepared by', code: oneCode, expectedHash: 'f'.repeat(64) });
    t('a phase step-up bound to a hash the phase does not have is refused (422, PHASE_CONTENT_CHANGED)',
      r.status === 422 && r.json?.code === 'PHASE_CONTENT_CHANGED', `${r.status} ${short(r.json)}`);
    r = await api(key, 'POST', `${base}/step-up`, { role: 'Prepared by', code: oneCode, expectedHash: pv.hash });
    t('...and that refusal did not spend the code: the same code then works with the right hash', r.status < 300 && !!r.json?.stepUpToken, `${r.status} ${short(r.json)}`);
    const staleToken = r.json?.stepUpToken;

    // Somebody changes something the phase page shows (an 8 Angles comment) after the signer opened the preview.
    const original = await phaseAngles();
    const edited = original.map((a: any, i: number) => (i === 0 ? { ...a, comments: 'edited while the signer was reading' } : a));
    r = await api('admin', 'PUT', `/projects/${PROJECT}/phases/1/angles`, { angles: edited, expectedVersion: await version() });
    t('another person edits an 8 Angles comment after the preview', r.status < 300, `${r.status} ${short(r.json)}`);
    r = await api(key, 'POST', `${base}/sign`, { role: 'Prepared by', decision: 'Proceed', comments: 'checked', stepUpToken: staleToken, expectedHash: pv.hash });
    t('signing with the old hash is refused (422, PHASE_CONTENT_CHANGED)', r.status === 422 && r.json?.code === 'PHASE_CONTENT_CHANGED', `${r.status} ${short(r.json)}`);
    t('...and nothing was signed', !(await project()).project.phaseClosures[1].signOffs.some((x: any) => x.signedAt));
    const pv3 = await phasePreviewOf(key, 1);
    const angles3 = (pv3.sections ?? []).find((x: any) => x.title === '8 Angles coverage');
    t('the new preview has a different hash and shows the edited comment', pv3.hash !== pv.hash && angles3?.rows?.some((x: any) => x.comments === 'edited while the signer was reading'), `${pv.hash.slice(0, 8)} -> ${pv3.hash.slice(0, 8)}`);
    r = await api('admin', 'PUT', `/projects/${PROJECT}/phases/1/angles`, { angles: original, expectedVersion: await version() });
    t('the angle comment is put back', r.status < 300, `${r.status} ${short(r.json)}`);
  }

  const originalBatch = (await project()).project.costing.batchSizeKg;
  r = await signPhase(1, 'Prepared by', async () => {
    // Somebody edits something unrelated (costing, Gate 5 data) after the signer entered the code.
    await api('admin', 'PUT', `/projects/${PROJECT}/costing`, { patch: { batchSizeKg: 123 }, expectedVersion: await version() });
  });
  t('a phase signature is not refused because the project changed elsewhere meanwhile', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/phases/1/angles`, { angles: await phaseAngles(), expectedVersion: await version() });
  t('with a phase signature standing, the 8 Angles are read-only (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/phases/1/evidence-summary`, { value: 'changed', expectedVersion: await version() });
  t('...and so is the evidence summary (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'POST', `/projects/${PROJECT}/phases/1/accept-pre-work`, { expectedVersion: await version() });
  t('...and so is accepting pre-work (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/phases/1/sign-off-assignees`, {
    assignments: [{ role: 'Prepared by', userId: sessions[phaseKey(1, 'Reviewed by')].id }],
    expectedVersion: await version(),
  });
  t('a signed row cannot be reassigned (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await api(phaseKey(1, 'Reviewed by'), 'POST', `/projects/${PROJECT}/phases/1/sign-offs/withdraw`, { role: 'Prepared by', reason: 'not mine' });
  t("somebody else cannot withdraw another person's signature (403)", r.status === 403, `${r.status} ${short(r.json)}`);
  r = await api(phaseKey(1, 'Prepared by'), 'POST', `/projects/${PROJECT}/phases/1/sign-offs/withdraw`, { role: 'Prepared by', reason: '' });
  t('withdrawing needs a reason (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await api(phaseKey(1, 'Prepared by'), 'POST', `/projects/${PROJECT}/phases/1/sign-offs/withdraw`, { role: 'Prepared by', reason: 'angles to correct' });
  t('the signer withdraws, with no project version needed', r.status < 300, short(r.json));
  r = await api('admin', 'PUT', `/projects/${PROJECT}/phases/1/angles`, { angles: await phaseAngles(), expectedVersion: await version() });
  t('...and the angles are editable again', r.status < 300, `${r.status} ${short(r.json)}`);
  for (const role of ROLES) {
    r = await signPhase(1, role);
    t(`${role} signs Phase 1`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  await api('admin', 'PUT', `/projects/${PROJECT}/costing`, { patch: { batchSizeKg: originalBatch }, expectedVersion: await version() });
  pj = await project();
  t('Phase 1 is complete, so the project moves on to SG04', gp.phaseCompletionChecklist(pj.project, 1).signOffsComplete && gp.currentGateIndex(pj.project) === 3, `index ${gp.currentGateIndex(pj.project)} ${short(gp.phaseCompletionChecklist(pj.project, 1))}`);

  console.log('\n--- SG04 (the Formula BOM is Gate 5 data; Gate 4 reads it but does not own it)');
  const bomLine = (percent: number) => ({
    line: 1, rmCode: 'RM-1', inciName: 'Aqua', functionRole: 'Solvent', supplier: 'Acme', percentWw: percent, costPerKg: 1,
  });
  const putBom = async (percent: number) =>
    api('admin', 'PUT', `/projects/${PROJECT}/bom`, { lines: [bomLine(percent)], expectedVersion: await version() });
  await nominate('SG04');
  r = await putBom(100);
  t('a BOM line is saved while SG05 has not passed', r.status < 300, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/registers/supplierRmEvidence`, {
    rows: [{ rmCode: 'RM-1', inciName: 'Aqua', supplier: 'Acme', allergenStatement: 'none' }],
    expectedVersion: await version(),
  });
  t('a supplier evidence row is saved while SG04 is the open gate', r.status < 300, `${r.status} ${short(r.json)}`);
  await closeRegistersOf(['SG04']);
  await complete('SG04');
  r = await sign('SG04', 'Prepared by');
  t('Prepared signs SG04', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  const sg04 = (
    await db.query(
      `SELECT snapshot::jsonb->'projectData' ? 'bom' AS settled, snapshot::jsonb->'projectDataLater' ? 'bom' AS later
         FROM gate_sign_offs WHERE "projectId" = $1 AND "gateId" = 'SG04' AND role = 'Prepared by'`,
      [PROJECT],
    )
  ).rows[0];
  t('the SG04 snapshot records the BOM as data a LATER gate owns (not as its own)', sg04 && sg04.later === true && sg04.settled === false, short(sg04));
  r = await putBom(95);
  t('changing the BOM is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
  t('...and it does NOT make the SG04 Prepared signature stale', (await stale('SG04', 'Prepared by')).length === 0, short(await stale('SG04', 'Prepared by')));
  const bomInfo: string[] = snap.snapshotLaterChanges(
    (await db.query(`SELECT snapshot FROM gate_sign_offs WHERE "projectId" = $1 AND "gateId" = 'SG04' AND role = 'Prepared by'`, [PROJECT])).rows[0].snapshot,
    snap.gateEvidenceSnapshot((await project()).project, 'SG04'),
  );
  t('...but the change is reported as information', bomInfo.some((c) => c.startsWith('Formula BOM changed')), short(bomInfo));
  await putBom(100);
  for (const role of ['Reviewed by', 'Approved by'] as const) {
    r = await sign('SG04', role);
    t(`${role} signs SG04`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  pj = await project();
  t('SG04 passed', gp.isGatePassed(pj.project, 'SG04'));

  console.log('\n--- SG04 has passed: Supplier & RM Evidence (entered at Gates 4 and 7, only re-checked at 10 and 11)');
  const putSupplier = async (mutate: (rows: any[]) => any[]) => {
    const rows = ((await project()).project.registers.supplierRmEvidence ?? []).map((x: any) => ({ ...x }));
    return api('admin', 'PUT', `/projects/${PROJECT}/registers/supplierRmEvidence`, { rows: mutate(rows), expectedVersion: await version() });
  };
  r = await putSupplier((rows) => {
    rows[0].approvedForUse = true;
    rows[0].evidenceStatus = '';
    return rows;
  });
  t('the conclusion columns of the supplier register (Gate 7) can still be changed after SG04 passed', r.status < 300, `${r.status} ${short(r.json)}`);
  r = await putSupplier((rows) => {
    rows[0].allergenStatement = 'Changed after SG04';
    return rows;
  });
  t('a screening column (allergenStatement, Gate 4) is frozen after SG04 passed (403)', r.status === 403 && String(r.json.message).includes('SG04'), `${r.status} ${short(r.json)}`);
  r = await putSupplier((rows) => [...rows, { rmCode: 'RM-NEW', inciName: 'New material' }]);
  t('a new material after SG04 is refused (403): it means going back to Gate 4', r.status === 403 && String(r.json.message).includes('Rows cannot be added'), `${r.status} ${short(r.json)}`);

  console.log('\n--- the watch-list (gates 04 and 07): the columns Gate 4 enters versus the ones Gate 7 enters');
  const putWatch = async (patch: Record<string, string>) => {
    const rows = ((await project()).project.registers.prohibitedIngredients ?? []).map((x: any) => ({ ...x }));
    Object.assign(rows[0], patch);
    return api('admin', 'PUT', `/projects/${PROJECT}/registers/prohibitedIngredients`, { rows, expectedVersion: await version() });
  };
  r = await putWatch({ reviewerAssessment: 'Not a true match' });
  t('reviewerAssessment is entered at Gate 4: once SG04 has passed it is frozen (403), although the register stays open to Gate 7', r.status === 403 && String(r.json.message).includes('SG04'), `${r.status} ${short(r.json)}`);
  r = await putWatch({ productStatus: 'Not present - evidence linked' });
  t('productStatus is Gate 7\'s column: still editable after SG04 passed', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('...and SG04 is still passed with its signature current (its change is information only)', gp.isGatePassed(pj.project, 'SG04') && (await stale('SG04', 'Approved by')).length === 0, short(await stale('SG04', 'Approved by')));

  console.log('\n--- SG05 (the Formula BOM, costing and formula properties are Gate 5 data)');
  await nominate('SG05');
  await closeRegistersOf(['SG05']);
  await complete('SG05');
  r = await sign('SG05', 'Prepared by');
  t('Prepared signs SG05', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  const sg05 = (
    await db.query(
      `SELECT snapshot::jsonb->'projectData' ? 'bom' AS bom, snapshot::jsonb->'projectData' ? 'costing' AS costing
         FROM gate_sign_offs WHERE "projectId" = $1 AND "gateId" = 'SG05' AND role = 'Prepared by'`,
      [PROJECT],
    )
  ).rows[0];
  t('the SG05 snapshot records the BOM and costing as its own accountable data', sg05 && sg05.bom === true && sg05.costing === true, short(sg05));
  r = await putBom(90);
  t('changing the BOM (Gate 5 data) while the Prepared signature stands is refused (403)', r.status === 403 && String(r.json?.message).includes('Formula BOM'), `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/costing`, { patch: { batchSizeKg: 250 }, expectedVersion: await version() });
  t('...and so is a costing change (403)', r.status === 403 && String(r.json?.message).includes('Costing'), `${r.status} ${short(r.json)}`);
  t('...and the signature is still current', (await stale('SG05', 'Prepared by')).length === 0, short(await stale('SG05', 'Prepared by')));
  for (const role of ['Reviewed by', 'Approved by'] as const) {
    r = await sign('SG05', role);
    t(`${role} signs SG05`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  pj = await project();
  t('SG05 passed', gp.isGatePassed(pj.project, 'SG05'));
  r = await putBom(80);
  t('after SG05 passed, changing the BOM is refused (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  r = await api('admin', 'PUT', `/projects/${PROJECT}/costing`, { patch: { batchSizeKg: 300 }, expectedVersion: await version() });
  t('after SG05 passed, changing the costing is refused (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('SG04 and SG03 are still passed and their signatures still current',
    gp.isGatePassed(pj.project, 'SG04') && gp.isGatePassed(pj.project, 'SG03') &&
      (await stale('SG04', 'Approved by')).length === 0 && (await stale('SG03', 'Approved by')).length === 0);

  // ============================================================ SG06
  console.log('\n--- SG06 (packaging & artwork: Gate 6 columns versus Gate 10 columns of the same row)');
  const putArt = async (mutate: (rows: any[]) => any[]) => {
    const rows = ((await project()).project.registers.packagingSpecsArtwork ?? []).map((x: any) => ({ ...x }));
    return api('admin', 'PUT', `/projects/${PROJECT}/registers/packagingSpecsArtwork`, { rows: mutate(rows), expectedVersion: await version() });
  };
  await nominate('SG06');
  r = await putArt(() => [{ artworkVersion: 'v1', supplier: 'Acme Pack', specLink: 'https://example.test/spec' }]);
  t('a packaging row is saved while SG06 is the open gate', r.status < 300, `${r.status} ${short(r.json)}`);
  await closeRegistersOf(['SG06']);
  await complete('SG06');
  for (const role of ROLES) {
    r = await sign('SG06', role);
    t(`${role} signs SG06`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  pj = await project();
  t('SG06 passed', gp.isGatePassed(pj.project, 'SG06'));
  r = await putArt((rows) => {
    rows[0].artworkVersion = 'v2 after SG06 passed';
    return rows;
  });
  t('artworkVersion (Gate 6 data) is frozen after SG06 passed (403)', r.status === 403 && String(r.json.message).includes('SG06'), `${r.status} ${short(r.json)}`);
  r = await putArt((rows) => {
    rows[0].approval = 'Needs Review';
    return rows;
  });
  t('approval (Gate 10 data) of the same row is still editable', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('...and SG06 is still passed with its signature current', gp.isGatePassed(pj.project, 'SG06') && (await stale('SG06', 'Approved by')).length === 0, short(await stale('SG06', 'Approved by')));

  // ============================================================ SG07
  console.log('\n--- Phase 2 closes (SG06 is its last gate), then SG07');
  await db.query(
    `UPDATE phase_closures SET "preWorkAcceptedBy" = 'x', "preWorkAcceptedDate" = now() WHERE "projectId" = $1 AND phase = 2`,
    [PROJECT],
  );
  await db.query(
    `UPDATE angle_rows SET covered = true, ynna = 'Y'
      WHERE "phaseClosureId" IN (SELECT id FROM phase_closures WHERE "projectId" = $1 AND phase = 2)`,
    [PROJECT],
  );
  await closePhaseBySigning(2);
  pj = await project();
  t('Phase 2 is complete, so the project moves on to SG07', gp.phaseCompletionChecklist(pj.project, 2).signOffsComplete && gp.currentGateIndex(pj.project) === 6, `index ${gp.currentGateIndex(pj.project)} ${short(gp.phaseCompletionChecklist(pj.project, 2))}`);
  await nominate('SG07');
  await complete('SG07');
  r = await sign('SG07', 'Prepared by');
  t('Prepared signs SG07', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  const sg07 = (
    await db.query(
      `SELECT snapshot::jsonb->'projectData' ? 'bom' AS bom_settled,
              (snapshot::jsonb->'registerCells'->>'prohibitedIngredients') LIKE '%productStatus=%' AS watch_status,
              (snapshot::jsonb->'registerCells'->>'prohibitedIngredients') LIKE '%reviewerAssessment=%' AS watch_review
         FROM gate_sign_offs WHERE "projectId" = $1 AND "gateId" = 'SG07' AND role = 'Prepared by'`,
      [PROJECT],
    )
  ).rows[0];
  t('the SG07 snapshot is accountable for the BOM (Gate 5 is earlier, so Gate 7 approves that data too)', sg07 && sg07.bom_settled === true, short(sg07));
  t('...for the shared watch-list column it owns (productStatus)', sg07 && sg07.watch_status === true, short(sg07));
  t('...and for the Gate 4 watch-list column (reviewerAssessment): Gate 7 approves Gate 4 data as well', sg07 && sg07.watch_review === true, short(sg07));
  r = await putWatch({ productStatus: 'Present within restriction' });
  t('changing productStatus (Gate 7 data) while the Prepared signature stands is refused (403)',
    r.status === 403 && String(r.json?.message).includes('Register changed'), `${r.status} ${short(r.json)}`);
  t('...and the SG07 signature is still current', (await stale('SG07', 'Prepared by')).length === 0, short(await stale('SG07', 'Prepared by')));
  t('the SG07 registers are closed now that SG07 is about to pass', (await closeRegistersOf(['SG07'])) > 0);
  r = await sign('SG07', 'Reviewed by');
  t('Reviewed signs SG07', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);

  // ---- Round 4 question 16 / Round 5 question 1: a critical item's auto-generated N/A must be acknowledged by the
  // person holding the FUNCTION the review team names for it (here Safety / Scientific Review) before the gate can close.
  // The kept item is sg07-maternal-caution: this project has no pregnancy/breastfeeding user, so its N/A is generated.
  console.log('\n--- SG07: acknowledging a generated N/A (question 16)');
  const ACK_ITEM = 'sg07-maternal-caution';
  const ackItem = (p: any) => gp.gateReadinessChecklist(p, 'SG07').find((i: any) => i.id === ACK_ITEM);
  const postAck = async (key: string, gateId: string, itemId: string, functionKey = 'safety-scientific') =>
    api(key, 'POST', `/projects/${PROJECT}/readiness-acknowledgements`, { gateId, itemId, functionKey, expectedVersion: await version() });
  const assignFunction = async (roleKey: string, userId: string | null) =>
    api('admin', 'PUT', `/projects/${PROJECT}/function-assignees`, { assignments: [{ roleKey, userId }], expectedVersion: await version() });
  const ackRows = async () =>
    (
      await db.query(
        `SELECT "acknowledgedByUserId", "acknowledgedByName", "acknowledgedAs", "functionKey", rationale FROM readiness_acknowledgements
          WHERE "projectId" = $1 AND "gateId" = 'SG07' AND "itemId" = $2 ORDER BY "acknowledgedAt", id`,
        [PROJECT, ACK_ITEM],
      )
    ).rows;
  pj = await project();
  t('the critical auto-N/A waits for an acknowledgement and blocks SG07', ackItem(pj.project)?.acknowledgement?.state === 'missing' && gp.hardGateBlockers(pj.project, 'SG07').some((b: any) => b.id === ACK_ITEM), short(ackItem(pj.project)));
  r = await sign('SG07', 'Approved by');
  t('the Approved signature (the gate decision) is refused while it is unacknowledged (400)', r.status === 400, `${r.stage} ${r.status} ${short(r.json)}`);
  pj = await project();
  t('...and the gate did not pass', !gp.isGatePassed(pj.project, 'SG07'));

  // Nobody holds Safety / Scientific Review on this project yet: the function reads Unassigned and nobody can acknowledge,
  // an administrator included. Nobody is substituted for it, and the phase's "Reviewed by" has no standing here.
  const holderKey = phaseKey(3, 'Reviewed by');
  const holder = sessions[holderKey];
  pj = await project();
  t('the item names the function that has to acknowledge it, and nobody holds it', ackItem(pj.project)?.acknowledgement?.slots?.[0]?.label === 'Safety / Scientific Review' && ackItem(pj.project)?.acknowledgement?.slots?.[0]?.holders?.length === 0, short(ackItem(pj.project)));
  r = await postAck('admin', 'SG07', ACK_ITEM);
  t('Safety / Scientific Review is Unassigned: even an administrator cannot acknowledge (400)', r.status === 400 && /nobody is assigned/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await postAck(holderKey, 'SG07', ACK_ITEM);
  t('the phase "Reviewed by" is not a substitute for the function (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await assignFunction('safety-scientific', holder.id);
  t('the Lead assigns Safety / Scientific Review to a person', r.status < 300, short(r.json));
  r = await postAck('admin', 'SG07', ACK_ITEM);
  t('an administrator who does not hold the function still cannot acknowledge (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  r = await postAck(holderKey, 'SG07', 'sg07-signoff');
  t('an item that is not waiting for an acknowledgement is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await postAck(holderKey, 'SG99', ACK_ITEM);
  t('an unknown gate is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await postAck(holderKey, 'SG07', ACK_ITEM, 'finance');
  t('a function the item does not name is refused (400)', r.status === 400 && /not one of the functions/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  // The maternal caution register is dedicated to that pathway and this project has no maternal user: read-only, and acknowledging
  // clears what was entered in it (project owner, 2026-11-06). The workbook's reference rows stay.
  pj = await project();
  const cautionRows = (pj.project.registers.pbCautionLimits ?? []).map((x: any) => ({ ...x }));
  cautionRows[0].formulaExposure = '0.5 %';
  r = await api('admin', 'PUT', `/projects/${PROJECT}/registers/pbCautionLimits`, { rows: cautionRows, expectedVersion: await version() });
  t('the maternal caution register does not apply to this project, so even an administrator cannot write it (400)', r.status === 400 && /does not apply/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  await db.query(
    `UPDATE register_rows SET data = jsonb_set(data::jsonb, '{formulaExposure}', '"0.5 %"') WHERE "projectId" = $1 AND "registerKey" = 'pbCautionLimits' AND "rowOrder" = 0`,
    [PROJECT],
  );
  pj = await project();
  t('the engine sees one row with entered data in that register', gp.generatedNaEntries(pj.project).find((e: any) => e.itemId === ACK_ITEM)?.dedicatedSection?.rowsWithData === 1, short(gp.generatedNaEntries(pj.project).find((e: any) => e.itemId === ACK_ITEM)));
  r = await postAck(holderKey, 'SG07', ACK_ITEM);
  t('acknowledging without confirming the clearing is refused, and says what would be cleared (400)', r.status === 400 && /clears the data/i.test(String(r.json?.message)) && /1 row/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await api(holderKey, 'POST', `/projects/${PROJECT}/readiness-acknowledgements`, { gateId: 'SG07', itemId: ACK_ITEM, functionKey: 'safety-scientific', confirmClear: true, expectedVersion: await version() });
  t('the person holding Safety / Scientific Review acknowledges, with the clearing confirmed', r.status < 300, `${r.status} ${short(r.json)}`);
  const cautionAfter = (await db.query(`SELECT data FROM register_rows WHERE "projectId" = $1 AND "registerKey" = 'pbCautionLimits' ORDER BY "rowOrder"`, [PROJECT])).rows.map((x: any) => x.data);
  t('...the entered cell is cleared, and the 12 reference rows are all still there', cautionAfter.length === 12 && !cautionAfter[0].formulaExposure && !!cautionAfter[0].ingredientGroup, short(cautionAfter[0]));
  pj = await project();
  t('...the item is satisfied and says who acknowledged', ackItem(pj.project)?.satisfied === true && ackItem(pj.project)?.acknowledgement?.state === 'acknowledged' && !!ackItem(pj.project)?.acknowledgement?.by, short(ackItem(pj.project)));
  const first = await ackRows();
  t('...recorded from the session with the wording the engine generated, not anything the client sent',
    first.length === 1 && first[0].acknowledgedByUserId === holder.id && first[0].functionKey === 'safety-scientific' && first[0].rationale === ackItem(pj.project)?.acknowledgement?.rationale && first[0].acknowledgedAs === 'Safety / Scientific Review', short(first));
  r = await postAck(holderKey, 'SG07', ACK_ITEM);
  t('the same person acknowledging the same wording twice is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);

  // Re-assigning the function moves the right; what was recorded stays, and the new holder may confirm again.
  const newReviewer = sessions[signerKey('SG07', 'Reviewed by')];
  r = await assignFunction('safety-scientific', newReviewer.id);
  t('the Lead assigns Safety / Scientific Review to a different person', r.status < 300, short(r.json));
  r = await postAck(holderKey, 'SG07', ACK_ITEM);
  t('the previous holder can no longer acknowledge (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('...and the earlier acknowledgement still counts', ackItem(pj.project)?.satisfied === true);
  const newKey = signerKey('SG07', 'Reviewed by');
  r = await postAck(newKey, 'SG07', ACK_ITEM);
  t('the new holder may acknowledge again', r.status < 300, `${r.status} ${short(r.json)}`);
  const edited = await ackRows();
  t('...still ONE row: the new holder edited it in place', edited.length === 1 && edited[0].acknowledgedByUserId === newReviewer.id, short(edited));
  pj = await project();
  t("...and the item now reads the new holder's name", ackItem(pj.project)?.acknowledgement?.by === edited[0].acknowledgedByName, short(ackItem(pj.project)));

  // There is no way to record a refusal: whatever else the body says, the call acknowledges, and the same person
  // acknowledging the same wording again changes nothing.
  r = await api(newKey, 'POST', `/projects/${PROJECT}/readiness-acknowledgements`, { gateId: 'SG07', itemId: ACK_ITEM, functionKey: 'safety-scientific', outcome: 'Not acknowledged', comment: 'the next release adds a pregnancy user', expectedVersion: await version() });
  t('a body that asks for "Not acknowledged" does not record a refusal: it is the same acknowledgement again (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('...the item is still acknowledged, with nothing about a refusal on it', ackItem(pj.project)?.satisfied === true && ackItem(pj.project)?.acknowledgement?.state === 'acknowledged', short(ackItem(pj.project)));
  const final = await ackRows();
  t('...it is still ONE row (edited in place)', final.length === 1, short(final));
  const trail = (
    await db.query(
      `SELECT after FROM audit_events WHERE "projectId" = $1 AND action = 'readiness_ack.recorded' AND after->>'itemId' = $2 ORDER BY "occurredAt", id`,
      [PROJECT, ACK_ITEM],
    )
  ).rows.map((x: any) => x.after);
  t('the audit trail keeps every edit with the values before and after',
    trail.length === 2 && trail[0].before === null && trail[0].after.by === first[0].acknowledgedByName && trail[1].before?.by === first[0].acknowledgedByName && trail[1].after.by === edited[0].acknowledgedByName, short(trail));
  pj = await project();
  const ackLog = (pj.project.readinessAckLog ?? []).filter((e: any) => e.gateId === 'SG07' && e.itemId === ACK_ITEM);
  t('the envelope carries the edit history of the entry, oldest first, read from the audit trail',
    ackLog.length === 2 && ackLog[0].by === first[0].acknowledgedByName && ackLog[1].by === edited[0].acknowledgedByName, short(ackLog));
  // Taking an acknowledgement back (project owner, 2026-11-06): the giver or the holder of the function may, nobody else, and the
  // item waits for an acknowledgement again.
  const withdrawAck = async (key: string, fn = 'safety-scientific') =>
    api(key, 'POST', `/projects/${PROJECT}/readiness-acknowledgements/withdraw`, { gateId: 'SG07', itemId: ACK_ITEM, functionKey: fn, expectedVersion: await version() });
  r = await withdrawAck('admin');
  t('an administrator account, who neither gave it nor holds the function, cannot withdraw it (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  r = await withdrawAck(holderKey);
  t('the earlier holder, who is no longer the holder and did not give the current acknowledgement, cannot withdraw it (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  r = await withdrawAck(newKey, 'quality-microbiology');
  t('withdrawing an acknowledgement nobody gave is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await withdrawAck(newKey);
  t('the person who holds the function withdraws it', r.status < 300, `${r.status} ${short(r.json)}`);
  t('...the row is gone', (await ackRows()).length === 0, short(await ackRows()));
  pj = await project();
  t('...and the item waits for an acknowledgement again, blocking the gate', ackItem(pj.project)?.satisfied === false && ackItem(pj.project)?.acknowledgement?.state === 'missing' && gp.hardGateBlockers(pj.project, 'SG07').some((b: any) => b.id === ACK_ITEM), short(ackItem(pj.project)));
  t('the history lists the withdrawal as that', (pj.project.readinessAckLog ?? []).filter((e: any) => e.itemId === ACK_ITEM).at(-1)?.kind === 'withdrawn', short(pj.project.readinessAckLog));
  r = await withdrawAck(newKey);
  t('withdrawing again, with nothing left to withdraw, is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await postAck(newKey, 'SG07', ACK_ITEM);
  t('the holder acknowledges once more', r.status < 300, `${r.status} ${short(r.json)}`);
  r = await nominatePhase(3);
  t('the Phase 3 nomination goes back to the standard lanes (the later phase close-out uses them)', r.status < 300, short(r.json));

  r = await sign('SG07', 'Approved by');
  t('Approved signs SG07 once the reason is acknowledged', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  pj = await project();
  t('SG07 passed', gp.isGatePassed(pj.project, 'SG07'));
  r = await postAck(newKey, 'SG07', ACK_ITEM);
  t('once SG07 has passed, acknowledgements are read-only (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  const audit = (await db.query(`SELECT count(*)::int AS n FROM audit_events WHERE "projectId" = $1 AND action = 'readiness_ack.recorded' AND after->>'itemId' = $2`, [PROJECT, ACK_ITEM])).rows[0];
  t('each edit left an audit row (three in all: the two edits and the acknowledgement given again after the withdrawal)', audit.n === 3, short(audit));
  r = await putWatch({ productStatus: 'Present within restriction' });
  t('after SG07 passed, the watch-list is read-only (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('every earlier gate is still passed and every signature still current',
    ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07'].every((g) => gp.isGatePassed(pj.project, g)));
  for (const g of ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07']) {
    t(`${g}: no signature is stale`, (await Promise.all(ROLES.map((role) => stale(g, role)))).every((c) => c.length === 0), short(await Promise.all(ROLES.map((role) => stale(g, role)))));
  }

  // ============================================================ Functions
  // Who holds each professional function (Safety / Scientific Review, Technical Claims, …) is a named person on the project,
  // assigned by the project's Lead or an administrator; the thirteen area roles stay write-once at creation.
  console.log('\n--- Functions: assigning who holds a function on the project');
  const someone = sessions[phaseKey(3, 'Reviewed by')];
  const fnRow = async (roleKey: string) =>
    (await db.query(`SELECT name, "userId" FROM project_reviewers WHERE "projectId" = $1 AND "roleKey" = $2`, [PROJECT, roleKey])).rows[0];
  const putFn = async (key: string, assignments: unknown[]) =>
    api(key, 'PUT', `/projects/${PROJECT}/function-assignees`, { assignments, expectedVersion: await version() });
  r = await putFn(phaseKey(3, 'Prepared by'), [{ roleKey: 'technical-claims', userId: someone.id }]);
  t('a person who is neither the Lead nor an administrator cannot assign a function (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  r = await putFn('admin', [{ roleKey: 'quality', userId: someone.id }]);
  t('a workbook AREA role cannot be changed after creation: only functions and the Project owner can (400)', r.status === 400 && /not a role the Lead assigns/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await putFn('admin', [{ roleKey: 'no-such-function', userId: someone.id }]);
  t('an unknown role key is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await putFn('admin', [{ roleKey: 'technical-claims', userId: 'no-such-user' }]);
  t('a person who is not an active user is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  t('...and nothing was assigned', (await fnRow('technical-claims')) === undefined);
  r = await putFn('admin', [{ roleKey: 'technical-claims', userId: someone.id }]);
  t('an administrator assigns a function', r.status < 300, `${r.status} ${short(r.json)}`);
  const assignedFn = await fnRow('technical-claims');
  t('...it names that person and links their account', !!assignedFn && assignedFn.userId === someone.id && !!assignedFn.name, short(assignedFn));
  pj = await project();
  t('...and the project envelope carries it with the other reviewers', typeof pj.project.identity.reviewers?.['technical-claims'] === 'string' && pj.project.identity.reviewers['technical-claims'] === assignedFn?.name, short(pj.project.identity.reviewers));
  r = await putFn('admin', [{ roleKey: 'technical-claims', userId: null }]);
  t('assigning nobody leaves the function Unassigned', r.status < 300 && (await fnRow('technical-claims')) === undefined, `${r.status} ${short(r.json)}`);
  const fnAudit = (await db.query(`SELECT count(*)::int AS n FROM audit_events WHERE "projectId" = $1 AND action = 'project.function_assignees_updated'`, [PROJECT])).rows[0];
  t('each change left an audit row (two for Safety earlier, two for each triage act, then assigned and cleared here)', fnAudit.n === 6 + 2 * triageActs, short(fnAudit));
  r = await putFn('admin', [{ roleKey: 'project-owner', userId: someone.id }]);
  t('the Project owner can be named after the project exists (a project created before the field has none)', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('...and the project carries it with the other roles', pj.project.identity.reviewers?.['project-owner'] === (await fnRow('project-owner'))?.name && !!(await fnRow('project-owner'))?.userId, short(pj.project.identity.reviewers));

  // ============================================================ SG08
  console.log('\n--- SG08 (the human-study assessment is Gate 8 data)');
  const putAssess = async (patch: Record<string, string>) =>
    api('admin', 'PUT', `/projects/${PROJECT}/assessments`, { patch, expectedVersion: await version() });
  const lanesPass = (project: any, gate: string) => gp.isGatePassed(project, gate);
  await db.query(
    `UPDATE phase_closures SET "preWorkAcceptedBy" = 'x', "preWorkAcceptedDate" = now() WHERE "projectId" = $1 AND phase IN (3, 4)`,
    [PROJECT],
  );
  await nominate('SG08');
  r = await putAssess({ humanStudyPlanned: 'No' });
  t('the human-study assessment is answered while SG08 is open', r.status < 300, `${r.status} ${short(r.json)}`);

  // ---- SW-56: a table that exists only for a trigger is read-only while the trigger does not apply, and acknowledging the
  // generated "not applicable" clears what was entered in it. This project has no infant use, so the Infant testing table
  // (Gates 8-9) is such a table. Data is put there straight into the database — the API refuses to write it, which is the point.
  console.log('\n--- SG08: the Infant testing table is locked and cleared by the acknowledgement (SW-56)');
  const INFANT_ITEM = 'sg08-infant-testing';
  const infantRows = async () =>
    (await db.query(`SELECT status, notes, "evidenceLink" FROM requirement_items WHERE "projectId" = $1 AND "sectionKey" = 'infantTesting' ORDER BY "itemOrder"`, [PROJECT])).rows;
  pj = await project();
  const infantItems = pj.project.requirements.infantTesting ?? [];
  t('the Infant testing table exists on the project', infantItems.length > 0, String(infantItems.length));
  r = await api('admin', 'PUT', `/projects/${PROJECT}/requirements/infantTesting`, { items: infantItems, expectedVersion: await version() });
  t('the table does not apply to this project, so even an administrator cannot write it (400)', r.status === 400 && /does not apply/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  await db.query(
    `UPDATE requirement_items SET status = 'Completed', notes = 'entered before the project said it had no infant use' WHERE "projectId" = $1 AND "sectionKey" = 'infantTesting' AND "itemOrder" IN (0, 1)`,
    [PROJECT],
  );
  pj = await project();
  t('the readiness engine counts the two rows that hold data', (gp.generatedNaEntries(pj.project).find((e: any) => e.itemId === INFANT_ITEM)?.dedicatedSection?.rowsWithData) === 2, short(gp.generatedNaEntries(pj.project).find((e: any) => e.itemId === INFANT_ITEM)));
  r = await api(newKey, 'POST', `/projects/${PROJECT}/readiness-acknowledgements`, { gateId: 'SG08', itemId: INFANT_ITEM, functionKey: 'safety-study-reviewer', expectedVersion: await version() });
  t('"Safety / study reviewer" is Unassigned, so nobody can acknowledge the infant-testing item yet (400)', r.status === 400 && /nobody is assigned/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await assignFunction('safety-study-reviewer', sessions[newKey].id);
  t('the Lead assigns "Safety / study reviewer"', r.status < 300, short(r.json));
  r = await api(newKey, 'POST', `/projects/${PROJECT}/readiness-acknowledgements`, { gateId: 'SG08', itemId: INFANT_ITEM, functionKey: 'safety-study-reviewer', expectedVersion: await version() });
  t('acknowledging without confirming the clearing is refused, and says what would be cleared (400)', r.status === 400 && /clears the data/i.test(String(r.json?.message)) && /2 rows/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  t('...and nothing was cleared', (await infantRows()).filter((x: any) => x.status === 'Completed').length === 2);
  r = await api(newKey, 'POST', `/projects/${PROJECT}/readiness-acknowledgements`, { gateId: 'SG08', itemId: INFANT_ITEM, functionKey: 'safety-study-reviewer', confirmClear: true, expectedVersion: await version() });
  t('acknowledging with the clearing confirmed is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
  const afterAck = await infantRows();
  t('...every row of the table is back to a fresh row (status, notes, evidence link)', afterAck.every((x: any) => x.status === 'Not Started' && x.notes === null && x.evidenceLink === null), short(afterAck));
  const clearedEvent = (
    await db.query(`SELECT after FROM audit_events WHERE "projectId" = $1 AND action = 'readiness_ack.recorded' AND after->>'itemId' = $2 ORDER BY "occurredAt" DESC LIMIT 1`, [PROJECT, INFANT_ITEM])
  ).rows[0]?.after;
  t('the audit event keeps what was cleared: the section and the value of each row', clearedEvent?.cleared?.section === 'infantTesting' && clearedEvent.cleared.rows.length === 2 && clearedEvent.cleared.rows[0].was.status === 'Completed' && /before the project said/.test(String(clearedEvent.cleared.rows[0].was.notes)), short(clearedEvent));
  pj = await project();
  t('the item reads as acknowledged', gp.gateReadinessChecklist(pj.project, 'SG08').find((i: any) => i.id === INFANT_ITEM)?.acknowledgement?.state === 'acknowledged');

  await complete('SG08');
  r = await sign('SG08', 'Prepared by');
  t('Prepared signs SG08', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  r = await putAssess({ humanStudyPlanned: 'Undecided' });
  t('changing the assessment (Gate 8 data) while the Prepared signature stands is refused (403)',
    r.status === 403 && String(r.json?.message).includes('Assessment: human study'), `${r.status} ${short(r.json)}`);
  t('...and the SG08 signature is still current', (await stale('SG08', 'Prepared by')).length === 0, short(await stale('SG08', 'Prepared by')));
  t('the SG08 registers are closed now that SG08 is about to pass', (await closeRegistersOf(['SG08'])) >= 0);
  for (const role of ['Reviewed by', 'Approved by'] as const) {
    r = await sign('SG08', role);
    t(`${role} signs SG08`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  pj = await project();
  t('SG08 passed', gp.isGatePassed(pj.project, 'SG08'));
  r = await putAssess({ humanStudyPlanned: 'Yes' });
  t('after SG08 passed, the human-study assessment is refused (403)', r.status === 403, `${r.status} ${short(r.json)}`);

  // ============================================================ SG09
  console.log('\n--- SG09 (the scale-up assessment is Gate 9 data; the formula properties are Gate 5 data)');
  await nominate('SG09');
  // Round 5 question 7: the scale-up assessment is a list, one entry per affected area.
  const scaleEntry = (over: Record<string, unknown> = {}) => ({
    id: '', area: 'Batch size', description: 'e2e: scaled up', before: '50 kg', after: '500 kg', answer: 'Yes', rationale: 'e2e: the batch is ten times larger',
    verification: 'one pilot batch at full scale', assessor: me, assessedDate: '2026-11-01', timing: 'Before formula lock', ...over,
  });
  const putScale = async (entries: unknown[]) =>
    api('admin', 'PUT', `/projects/${PROJECT}/scale-up-assessments`, { entries, expectedVersion: await version() });
  r = await putScale([{ ...scaleEntry(), answer: 'Pending assessment', rationale: '', verification: '', assessor: '', assessedDate: '' }]);
  t('an entry still Pending is saved (it is the answer that is missing)', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  // (This harness runs a cut-down readiness list without the Gate 9 scale-up item, so that a Pending entry BLOCKS Gate 9 is shown by
  // verify:scale-up-assessments on the real list; here the stored entry is checked.)
  t('...and the stored entry is still Pending', ((pj.project.scaleUpAssessments ?? []) as any[]).length === 1 && pj.project.scaleUpAssessments[0].answer === 'Pending assessment');
  r = await putScale([scaleEntry({ verification: '' })]);
  t('a Yes without the pilot or verification it requires is refused (400)', r.status === 400 && /verification/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await putScale([scaleEntry({ area: 'Any change identified by Manufacturing, Quality or R&I as potentially affecting product performance', description: '' })]);
  t('the open-ended area needs a description (400)', r.status === 400 && /describe/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await putScale([scaleEntry({ timing: 'After formula lock' })]);
  t('a change after the formula lock must link its Change Control record (400)', r.status === 400 && /Change Control/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await putScale([scaleEntry({ assessor: 'Somebody Else' })]);
  t('who assessed an entry can only be the person saving (400/403)', r.status === 400 || r.status === 403, `${r.status} ${short(r.json)}`);
  r = await putScale([scaleEntry()]);
  t('the scale-up assessment is answered while SG09 is open', r.status < 300, `${r.status} ${short(r.json)}`);
  await complete('SG09');
  r = await sign('SG09', 'Prepared by');
  t('Prepared signs SG09', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  const sg09 = (
    await db.query(
      `SELECT snapshot::jsonb->'projectData' ? 'formulaProperties' AS fp, snapshot::jsonb->'projectData' ? 'assessments:scaleUp' AS scale
         FROM gate_sign_offs WHERE "projectId" = $1 AND "gateId" = 'SG09' AND role = 'Prepared by'`,
      [PROJECT],
    )
  ).rows[0];
  t('the SG09 snapshot is accountable for the formula properties (Gate 5 owns them) and for its own scale-up assessment', sg09 && sg09.fp === true && sg09.scale === true, short(sg09));
  r = await putScale([scaleEntry({ rationale: 'e2e: changed after signing' })]);
  t('changing the scale-up assessment (Gate 9 data) while the Prepared signature stands is refused (403)',
    r.status === 403 && String(r.json?.message).includes('Assessment: scale-up'), `${r.status} ${short(r.json)}`);
  t('...and the SG09 signature is still current', (await stale('SG09', 'Prepared by')).length === 0, short(await stale('SG09', 'Prepared by')));
  r = await api('admin', 'PUT', `/projects/${PROJECT}/formula-properties`, { patch: { microRationale: 'changed late' }, expectedVersion: await version() });
  t('the formula properties (Gate 5 data) are read-only now that SG05 has passed (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  t('the SG09 registers are closed now that SG09 is about to pass', (await closeRegistersOf(['SG09'])) >= 0);
  for (const role of ['Reviewed by', 'Approved by'] as const) {
    r = await sign('SG09', role);
    t(`${role} signs SG09`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  pj = await project();
  t('SG09 passed', gp.isGatePassed(pj.project, 'SG09'));
  r = await putScale([scaleEntry({ rationale: 'e2e: changed after the pass' })]);
  t('after SG09 passed, the scale-up assessment is refused (403)', r.status === 403, `${r.status} ${short(r.json)}`);

  // ============================================================ SG10-SG12 per market
  console.log('\n--- Phase 3 closes; then SG10-SG12, signed per market');
  await db.query(
    `UPDATE angle_rows SET covered = true, ynna = 'Y'
      WHERE "phaseClosureId" IN (SELECT id FROM phase_closures WHERE "projectId" = $1 AND phase = 3)`,
    [PROJECT],
  );
  await closePhaseBySigning(3);
  pj = await project();
  t('Phase 3 is complete, so the project moves on to SG10', gp.phaseCompletionChecklist(pj.project, 3).signOffsComplete && gp.currentGateIndex(pj.project) === 9, `index ${gp.currentGateIndex(pj.project)} ${short(gp.phaseCompletionChecklist(pj.project, 3))}`);
  // The demo project sells in several markets; each one is a lane that must be signed separately.
  const MARKETS: string[] = [...(pj.project.identity.markets ?? [])];
  console.log('   markets of the project:', MARKETS.join(', '));
  t('the project has at least two markets, so the lanes can be shown to be independent', MARKETS.length >= 2, short(MARKETS));
  t('every market has a track', MARKETS.every((m) => pj.project.marketTracks.some((x: any) => x.market === m)), short(pj.project.marketTracks.map((x: any) => x.market)));

  const putPublished = async (workflowState: string) => {
    const rows = ((await project()).project.registers.publishedInfoApproval ?? []).map((x: any) => ({ ...x }));
    if (rows.length === 0) rows.push({ workflowState });
    else rows[0].workflowState = workflowState;
    return api('admin', 'PUT', `/projects/${PROJECT}/registers/publishedInfoApproval`, { rows, expectedVersion: await version() });
  };
  const signLane = async (gate: string, market: string) => {
    for (const role of ROLES) {
      r = await sign(gate, role, market);
      t(`${gate} ${market}: ${role} signs`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
    }
  };

  // ------------------------------------------------------------ SG10
  console.log('\n--- SG10');
  for (const m of MARKETS) await nominate('SG10', m);
  r = await putPublished('Draft');
  t('a published-information record is saved while SG10 is open', r.status < 300, `${r.status} ${short(r.json)}`);
  await complete('SG10');
  t('the SG10 registers are closed', (await closeRegistersOf(['SG10'])) >= 0);
  for (const [i, m] of MARKETS.entries()) {
    await signLane('SG10', m);
    pj = await project();
    if (i < MARKETS.length - 1) {
      t(`with only ${i + 1} of ${MARKETS.length} lanes signed, SG10 has NOT passed (the other lanes still block it)`, !gp.isGatePassed(pj.project, 'SG10'));
    }
  }
  pj = await project();
  t('with every lane signed, SG10 passed', gp.isGatePassed(pj.project, 'SG10'));
  r = await putPublished('Technical Review');
  t('workflowState is read at SG10 and SG11, so SG11 owns it: still editable after SG10 passed', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('...and SG10 stays passed with both lanes current (information only)',
    gp.isGatePassed(pj.project, 'SG10') && (await Promise.all(MARKETS.flatMap((m) => ROLES.map((role) => stale('SG10', role, m))))).every((c) => c.length === 0));
  const tracks = (await project()).project.marketTracks.map((x: any) => ({ ...x }));
  tracks.find((x: any) => x.market === MARKETS[MARKETS.length - 1]).regulatoryStatus = 'Approved';
  r = await api('admin', 'PUT', `/projects/${PROJECT}/market-tracks`, { tracks, expectedVersion: await version() });
  t('market tracks (no gate lock yet) can still be changed after SG10 passed', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('...recorded in the signature as information, so SG10 stays passed', gp.isGatePassed(pj.project, 'SG10') && (await stale('SG10', 'Approved by', MARKETS[MARKETS.length - 1])).length === 0, short(await stale('SG10', 'Approved by', MARKETS[MARKETS.length - 1])));

  // ------------------------------------------------------------ SG11
  console.log('\n--- SG11');
  for (const m of MARKETS) await nominate('SG11', m);
  await complete('SG11');
  // The first lane's approver already needs the registers closed (the server checks it when the approver signs).
  t('the SG11 registers are closed', (await closeRegistersOf(['SG11'])) >= 0);
  r = await sign('SG11', 'Prepared by', MARKETS[0]);
  t('Prepared signs the SG11 Australia lane', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  const sg11 = (
    await db.query(
      `SELECT market FROM gate_sign_offs WHERE "projectId" = $1 AND "gateId" = 'SG11' AND role = 'Prepared by' AND "signedAt" IS NOT NULL`,
      [PROJECT],
    )
  ).rows;
  t('the signature belongs to the Australia lane only', sg11.length === 1 && sg11[0].market === MARKETS[0], short(sg11));
  t('the other lanes are still unsigned', sg11.length === 1);
  for (const role of ['Reviewed by', 'Approved by'] as const) {
    r = await sign('SG11', role, MARKETS[0]);
    t(`SG11 Australia: ${role} signs`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  for (const m of MARKETS.slice(1)) await signLane('SG11', m);
  pj = await project();
  t('SG11 passed', gp.isGatePassed(pj.project, 'SG11'));
  r = await putPublished('Approved for Release');
  t('after SG11 passed, workflowState (SG11 data) is refused (403)', r.status === 403, `${r.status} ${short(r.json)}`);

  // ------------------------------------------------------------ SG12
  console.log('\n--- SG12');
  for (const m of MARKETS) await nominate('SG12', m);
  await complete('SG12');
  t('the SG12 registers are closed', (await closeRegistersOf(['SG12'])) >= 0);
  for (const m of MARKETS) await signLane('SG12', m);
  pj = await project();
  t('SG12 passed', gp.isGatePassed(pj.project, 'SG12'));

  console.log('\n--- all twelve gates');
  const GATES12 = ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11', 'SG12'];
  t('every gate SG01-SG12 is passed', GATES12.every((g) => lanesPass(pj.project, g)), short(GATES12.filter((g) => !lanesPass(pj.project, g))));
  for (const g of GATES12) {
    const perMarket = ['SG10', 'SG11', 'SG12'].includes(g);
    const lanes: (string | undefined)[] = perMarket ? MARKETS : [undefined];
    const all = await Promise.all(lanes.flatMap((m) => ROLES.map((role) => stale(g, role, m))));
    t(`${g}: no signature is stale${perMarket ? ' (both lanes)' : ''}`, all.every((c) => c.length === 0), short(all));
  }

  console.log('\n--- Phase 4 closes by signature; its own data is then read-only');
  await db.query(
    `UPDATE angle_rows SET covered = true, ynna = 'Y'
      WHERE "phaseClosureId" IN (SELECT id FROM phase_closures WHERE "projectId" = $1 AND phase = 4)`,
    [PROJECT],
  );
  // Requirement rows tagged 'ALL' (the change-control closure checks) belong to no gate, so no gate
  // freezes them; Phase 4's signature does.
  const closureRows = async () => (await project()).project.requirements.changeControlClosure as any[];
  const putClosure = async (status: string) => {
    const rows = (await closureRows()).map((x: any) => ({ ...x }));
    rows[0].status = status;
    return api('admin', 'PUT', `/projects/${PROJECT}/requirements/changeControlClosure`, { items: rows, expectedVersion: await version() });
  };
  r = await putClosure('In Progress');
  t('before Phase 4 is signed, a closure row can be edited', r.status < 300 && (await closureRows())[0].status === 'In Progress', `${r.status} ${short(r.json)}`);
  await closePhaseBySigning(4);
  pj = await project();
  t('Phase 4 is complete', gp.phaseCompletionChecklist(pj.project, 4).signOffsComplete, short(gp.phaseCompletionChecklist(pj.project, 4)));
  await putClosure('Complete');
  t('under a standing Phase 4 signature the closure rows are read-only (the edit is skipped)', (await closureRows())[0].status === 'In Progress', short((await closureRows())[0]));

  console.log('\n--- a new market is added after every gate has passed (allowed after Gate 1 by design, F4)');
  r = await api('admin', 'PUT', `/projects/${PROJECT}/markets`, { markets: [...MARKETS, 'Singapore'], expectedVersion: await version() });
  t('adding a market is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('SG01-SG09 are untouched: still passed and no signature stale',
    ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07', 'SG08', 'SG09'].every((g) => gp.isGatePassed(pj.project, g)) &&
      (await Promise.all(['SG01', 'SG03', 'SG05', 'SG07', 'SG09'].flatMap((g) => ROLES.map((role) => stale(g, role))))).every((c) => c.length === 0));
  t('the signatures already given in SG10-SG12 stay current (the new market is a new lane, not a change to the old ones)',
    (await Promise.all(['SG10', 'SG11', 'SG12'].flatMap((g) => MARKETS.flatMap((m) => ROLES.map((role) => stale(g, role, m)))))).every((c) => c.length === 0));
  // The rows a section makes per market follow the project's markets: Singapore (an ASEAN market) gets its own ASEAN PIF row and its own
  // country-restrictions row, and the rows of the markets already there are untouched.
  const dossier: any[] = pj.project.requirements?.dossierEvidence ?? [];
  t('the new market got its own ASEAN PIF row and its own country-restrictions row', dossier.some((x) => x.requirement === 'ASEAN PIF mapped' && x.market === 'Singapore') && dossier.some((x) => x.requirement === 'Country-specific restrictions' && x.market === 'Singapore'), short(dossier.map((x) => x.requirement + (x.market ? '@' + x.market : ''))));
  t('...and each existing market still has exactly one of each of its rows', MARKETS.every((m) => dossier.filter((x) => x.market === m && x.requirement === 'Country-specific restrictions').length === 1));
  console.log(`   NOTE: SG10-SG12 now have an unsigned lane for the new market (SG10 passed: ${gp.isGatePassed(pj.project, 'SG10')}) — E3(a), one lane per active market`);

  console.log('\n--- the company lists as they stood when each gate passed (SW-52, Round 5 question 1(d))');
  const activeSnaps = async () =>
    (await db.query(`SELECT "gateId", count(*)::int AS n FROM gate_reference_snapshots WHERE "projectId" = $1 AND "supersededAt" IS NULL GROUP BY "gateId"`, [PROJECT])).rows as { gateId: string; n: number }[];
  const snaps = await activeSnaps();
  pj = await project();
  const passedGates = ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11', 'SG12'].filter((g) => gp.isGatePassed(pj.project, g));
  t('every passed gate holds exactly one active snapshot', passedGates.length > 0 && passedGates.every((g) => snaps.find((x) => x.gateId === g)?.n === 1), short(snaps));
  t('no gate holds more than one active snapshot', snaps.every((x) => x.n === 1));
  t('while the lists are unchanged nothing extra travels with the project', !pj.project.gateReference);
  await db.query(`INSERT INTO raw_material_risks (id, "rmCode", flags, revision, "updatedAt") VALUES ('e2e-ref-snap', 'RM-1', ARRAY['Fragrance'], 1, now())`);
  try {
    pj = await project();
    t('after a list edit the passed gates carry the lists they passed on', !!pj.project.gateReference && Object.keys(pj.project.gateReference).length > 0, short(Object.keys(pj.project.gateReference ?? {})));
    t('...and every gate that was passed still is', passedGates.every((g) => gp.isGatePassed(pj.project, g)));
    t('...and a notice names the change that touches this project', refSnap.referenceNotices(pj.project).some((n: any) => n.changes.some((c: any) => c.subject === 'RM-1')), short(refSnap.referenceNotices(pj.project)));
  } finally {
    await db.query(`DELETE FROM raw_material_risks WHERE id = 'e2e-ref-snap'`);
  }

  console.log('\n--- a Critical change to the company lists holds release until its impact review is concluded (Round 5 question 1(d))');
  const putOverlay = (signal: unknown) => api('admin', 'PUT', '/reference/rm-risk/RM-1', { patch: { flags: ['Fragrance'] }, signal });
  r = await putOverlay({ criticality: 'Critical', urgent: true, reason: '', dueDate: '2099-01-01' });
  t('a Critical change without its reason is refused (400)', r.status === 400 && /reason/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await putOverlay({ criticality: 'Low' });
  t('a change that projects rely on needs the date its impact review is due (400)', r.status === 400 && /due/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await putOverlay({ criticality: 'Critical', urgent: true, reason: 'e2e: a fragrance allergen was found', dueDate: '2099-01-01' });
  t('an urgent Critical change with its reason and a due date is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  const ia = (pj.project.impactAssessments ?? []) as any[];
  t('this project, which relies on RM-1, has one assessment, Critical and urgent, escalated to Safety, Regulatory and Quality', ia.length === 1 && ia[0].critical === true && ia[0].urgent === true && ['safety-scientific', 'regulatory', 'quality'].every((k) => ia[0].functionKeys.includes(k)), short(ia));
  const holdItem = (g: string) => gp.gateReadinessChecklist(pj.project, g).find((x: any) => x.id === 'impact-hold');
  t('release gates 10 to 12 are blocked while it stands', ['SG10', 'SG11', 'SG12'].every((g) => holdItem(g)?.satisfied === false));
  t('...as a hard block that Proceed with Conditions does not clear', ['SG10', 'SG11', 'SG12'].every((g) => holdItem(g)?.hardBlock === true));
  t('gates before release are not touched by the hold', gp.gateReadinessChecklist(pj.project, 'SG07').every((x: any) => x.id !== 'impact-hold'));
  const conclude = (key: string, body: Record<string, unknown>) =>
    api(key, 'POST', `/projects/${PROJECT}/impact-assessments/${ia[0].id}/conclude`, { functionKey: 'safety-scientific', ...body });
  r = await conclude('admin', { conclusion: 'No impact', rationale: 'e2e', expectedVersion: await version() });
  t('an administrator is not the holder of the function, so cannot conclude for it (403)', r.status === 403 && /holds Safety/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await assignFunction('safety-scientific', null);
  t('Safety is left unassigned', r.status < 300, short(r.json));
  r = await conclude('admin', { conclusion: 'No impact', rationale: 'e2e', expectedVersion: await version() });
  t('while nobody is assigned as Safety, nobody can conclude (400)', r.status === 400 && /nobody is assigned/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await assignFunction('safety-scientific', sessions['admin'].id);
  t('the person who raised the change is assigned as Safety (to prove they still cannot conclude it)', r.status < 300, short(r.json));
  r = await conclude('admin', { conclusion: 'No impact', rationale: 'e2e', expectedVersion: await version() });
  t('the person who raised the change may not conclude it (403)', r.status === 403 && /raised this change/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  const other = Object.keys(sessions).find((k) => k !== 'admin') as string;
  r = await assignFunction('safety-scientific', sessions[other].id);
  t('someone else is assigned as Safety', r.status < 300, short(r.json));
  r = await conclude(other, { conclusion: 'No impact', rationale: '', expectedVersion: await version() });
  t('a conclusion without its rationale is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await conclude(other, { conclusion: 'Impact on this project', rationale: 'e2e', expectedVersion: await version() });
  t('an impact must name the Change Control record that deals with it (400)', r.status === 400 && /change control/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await conclude(other, { conclusion: 'No impact', rationale: 'e2e: the formula does not use that fragrance', expectedVersion: await version() });
  t('the Safety holder concludes: no impact', r.status < 300, `${r.status} ${short(r.json)}`);
  // an urgent change escalates to Regulatory and Quality as well; they conclude too
  const otherName = (await db.query(`SELECT "displayName" FROM users WHERE id = $1`, [sessions[other].id])).rows[0].displayName as string;
  await db.query(`UPDATE project_reviewers SET name = $2, "userId" = $3 WHERE "projectId" = $1 AND "roleKey" = ANY($4)`, [PROJECT, otherName, sessions[other].id, ['regulatory', 'quality']]);
  pj = await project();
  t('while Regulatory and Quality have not concluded the escalated assessment is still open and holding', !pj.project.impactAssessments[0].concludedAt && holdItem('SG10')?.satisfied === false);
  for (const fk of ['regulatory', 'quality']) {
    r = await conclude(other, { functionKey: fk, conclusion: 'No impact', rationale: 'e2e', expectedVersion: await version() });
    t(`${fk} concludes`, r.status < 300, `${r.status} ${short(r.json)}`);
  }
  pj = await project();
  t('the assessment is concluded and the hold is gone', !!pj.project.impactAssessments[0].concludedAt && holdItem('SG10')?.satisfied === true);
  r = await conclude(other, { conclusion: 'No impact', rationale: 'again', expectedVersion: await version() });
  t('a concluded assessment cannot be concluded again (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  await assignFunction('safety-scientific', null);

  console.log('\n--- a proposed Critical change holds release only once a qualified function confirms it (Round 5 question 6)');
  {
    const gateHeld = (g: string) => gp.gateReadinessChecklist(pj.project, g).find((x: any) => x.id === 'impact-hold')?.satisfied === false;
    // a different classification, so it is a change and raises a signal (saving the same values again is not one)
    r = await api('admin', 'PUT', '/reference/rm-risk/RM-1', {
      patch: { flags: ['Fragrance', 'Known allergen'] },
      signal: { criticality: 'Critical', reason: 'e2e: proposed, not urgent', dueDate: '2099-01-01' },
    });
    t('a Critical change that is not urgent is accepted as a proposal', r.status < 300, `${r.status} ${short(r.json)}`);
    pj = await project();
    const a2 = ((pj.project.impactAssessments ?? []) as any[]).find((x) => !x.concludedAt);
    t('it is Critical but neither urgent nor confirmed, and asks only Safety', !!a2 && a2.critical === true && !a2.urgent && !a2.criticalConfirmed && a2.functionKeys.join() === 'safety-scientific', short(a2));
    t('nothing is held while it only waits for confirmation', ['SG10', 'SG11', 'SG12'].every((g) => !gateHeld(g)));
    const confirmIt = async (key: string) =>
      api(key, 'POST', `/projects/${PROJECT}/impact-assessments/${a2.id}/confirm-criticality`, { functionKey: 'safety-scientific', expectedVersion: await version() });
    await assignFunction('safety-scientific', null);
    r = await confirmIt('admin');
    t('with nobody assigned as Safety, nobody can confirm (400)', r.status === 400, `${r.status} ${short(r.json)}`);
    await assignFunction('safety-scientific', sessions['admin'].id);
    r = await confirmIt('admin');
    t('whoever proposed it cannot confirm their own proposal (403)', r.status === 403 && /proposed/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
    await assignFunction('safety-scientific', sessions[other].id);
    r = await confirmIt(other);
    t('a qualified function holder confirms it is critical', r.status < 300, `${r.status} ${short(r.json)}`);
    pj = await project();
    t('...and from then on it holds release', ['SG10', 'SG11', 'SG12'].every(gateHeld));
    r = await confirmIt(other);
    t('a confirmed change cannot be confirmed again (400)', r.status === 400, `${r.status} ${short(r.json)}`);
    r = await api(other, 'POST', `/projects/${PROJECT}/impact-assessments/${a2.id}/conclude`, {
      functionKey: 'safety-scientific', conclusion: 'No impact', rationale: 'e2e: concluded', expectedVersion: await version(),
    });
    pj = await project();
    t('concluding ends the hold', r.status < 300 && ['SG10', 'SG11', 'SG12'].every((g) => !gateHeld(g)), `${r.status} ${short(r.json)}`);
    await assignFunction('safety-scientific', null);
  }

  console.log('\n--- a version is superseded market by market, each fact confirmed by its function (Round 5 question 5)');
  {
    const market = MARKETS[0];
    const oldVersion = 'E2E-OLD';
    await db.query(`INSERT INTO formula_versions (id, "projectId", version, status, "createdAt") VALUES ('e2e-old-version', $1, $2, 'Active', '2000-01-01')`, [PROJECT, oldVersion]);
    await db.query(
      `INSERT INTO market_tracks (id, "projectId", market, "formulaVersionId", "actualLaunchDate", "updatedAt") VALUES ('e2e-old-track', $1, $2, 'e2e-old-version', '2026-02-01', now())`,
      [PROJECT, market],
    );
    const facts = {
      version: oldVersion, market, replacementVersion: 'F9.9', effectiveTransitionDate: '2026-09-01', lastReleaseDate: '2026-08-01', stockDisposition: 'sell through by Q4',
      regulatoryNotificationStatus: 'notified', artworkTransition: 'new pack', pifUpdate: 'updated', salesMarketingCommunication: 'sent', distributorCommunication: 'sent',
      noFurtherBatchesConfirmed: true,
    };
    const saveFacts = async (over: Record<string, unknown> = {}) =>
      api('admin', 'POST', `/projects/${PROJECT}/supersession`, { decision: { id: 'x', ...facts, ...over }, expectedVersion: await version() });
    const confirmFact = async (key: string, factKey: string) =>
      api(key, 'POST', `/projects/${PROJECT}/supersession/confirm-fact`, { version: oldVersion, market, factKey, expectedVersion: await version() });
    const act = async (key: string, what: 'coordinate' | 'approve') =>
      api(key, 'POST', `/projects/${PROJECT}/supersession/${what}`, { version: oldVersion, market, expectedVersion: await version() });
    const stored = async () => ((await project()).project.supersessionDecisions as any[]).find((d) => d.version === oldVersion && d.market === market);
    const who = (await db.query(`SELECT "displayName" FROM users WHERE id = $1`, [sessions[other].id])).rows[0].displayName as string;

    r = await saveFacts();
    t('the ten facts are saved as a draft', r.status < 300 && !!(await stored()), `${r.status} ${short(r.json)}`);
    t('...nothing is confirmed by saving', Object.keys((await stored()).factConfirmations ?? {}).length === 0);
    r = await confirmFact('admin', 'stockDisposition');
    t('an administrator is not the holder of Supply Chain, so cannot confirm stock disposition', r.status === 400 || r.status === 403, `${r.status} ${short(r.json)}`);

    // the Lead assigns the accountable functions to one person
    await db.query(
      `UPDATE project_reviewers SET name = $2, "userId" = $3 WHERE "projectId" = $1 AND "roleKey" = ANY($4)`,
      [PROJECT, who, sessions[other].id, ['ri', 'quality', 'regulatory', 'supply-chain', 'sales-marketing']],
    );
    r = await confirmFact(other, 'bogusFact');
    t('an unknown fact is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
    for (const f of ['replacementVersion', 'effectiveTransitionDate', 'lastReleaseDate', 'stockDisposition', 'regulatoryNotificationStatus', 'artworkTransition', 'pifUpdate', 'salesMarketingCommunication', 'distributorCommunication', 'noFurtherBatchesConfirmed']) {
      r = await confirmFact(other, f);
      t(`the holder of the accountable function confirms ${f}`, r.status < 300, `${r.status} ${short(r.json)}`);
    }
    r = await confirmFact(other, 'pifUpdate');
    t('a fact already confirmed cannot be confirmed again (400)', r.status === 400, `${r.status} ${short(r.json)}`);
    r = await act('admin', 'coordinate');
    t('an administrator is not the holder of Quality, so cannot coordinate (403)', r.status === 403, `${r.status} ${short(r.json)}`);
    r = await act(other, 'approve');
    t('the final approval cannot be given before Quality has coordinated (400)', r.status === 400, `${r.status} ${short(r.json)}`);
    r = await act(other, 'coordinate');
    t('the holder of Quality coordinates the market', r.status < 300 && !!(await stored()).coordinatedBy, `${r.status} ${short(r.json)}`);

    // changing a confirmed fact withdraws ITS confirmation and the coordination
    r = await saveFacts({ stockDisposition: 'written off instead' });
    const after = await stored();
    t('changing a confirmed fact withdraws its confirmation', !after.factConfirmations?.stockDisposition && !!after.factConfirmations?.pifUpdate, short(after.factConfirmations));
    t('...and Quality\'s coordination', !after.coordinatedBy);
    r = await act(other, 'coordinate');
    t('coordination needs every fact confirmed again (400)', r.status === 400 && /confirmed/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
    r = await confirmFact(other, 'stockDisposition');
    t('the changed fact is confirmed again', r.status < 300, `${r.status} ${short(r.json)}`);
    r = await act(other, 'coordinate');
    t('...and coordinated again', r.status < 300, `${r.status} ${short(r.json)}`);

    pj = await project();
    t('before the final approval the version is not Superseded', pj.project.formulaVersionHistory.find((v: any) => v.version === oldVersion)?.state !== 'Superseded');
    r = await act('admin', 'approve');
    t('the authorised final approver confirms the completed transition', r.status < 300, `${r.status} ${short(r.json)}`);
    pj = await project();
    t('...which makes the market, and so the version, Superseded', pj.project.formulaVersionHistory.find((v: any) => v.version === oldVersion)?.state === 'Superseded');
    r = await saveFacts({ notes: 'late edit' });
    t('a confirmed decision can no longer be changed (400)', r.status === 400, `${r.status} ${short(r.json)}`);

    await db.query(`DELETE FROM supersession_decisions WHERE "projectId" = $1 AND version = $2`, [PROJECT, oldVersion]);
    await db.query(`DELETE FROM market_tracks WHERE id = 'e2e-old-track'`);
    await db.query(`DELETE FROM formula_versions WHERE id = 'e2e-old-version'`);
  }

  // ============================================================ Change Control: a material impact reopens the confirmed gates (Round 5 question 10)
  console.log('\n--- Change Control: a Material triage reopens the confirmed gates that stand passed, and keeps the earlier record');
  const pjBeforeM = await project();
  {
    const passedBeforeM = GATES.map((g: { id: string }) => g.id).filter((g: string) => gp.isGatePassed((pjBeforeM as any).project, g));
    const holdsBefore = (await db.query(`SELECT count(*)::int AS n FROM audit_events WHERE "projectId" = $1 AND action = 'gate.held_by_change'`, [PROJECT])).rows[0].n;
    r = await api('admin', 'PUT', `/projects/${PROJECT}/changes`, {
      records: [...(await project()).project.changes, newChange('CHG-E2E-M', 'pif-any-change')],
      expectedVersion: await version(),
    });
    t('a change that will turn out material is recorded', r.status < 300, `${r.status} ${short(r.json)}`);
    pj = await project();
    const wentOff = passedBeforeM.filter((g: string) => !gp.isGatePassed(pj.project, g));
    const holdsAfter = (await db.query(`SELECT count(*)::int AS n FROM audit_events WHERE "projectId" = $1 AND action = 'gate.held_by_change'`, [PROJECT])).rows[0].n;
    t('every gate that stopped counting as passed because of the change was recorded once', holdsAfter - holdsBefore === wentOff.length, `${holdsAfter - holdsBefore} vs ${short(wentOff)}`);
    console.log(`   gates held by the change: ${wentOff.join(', ') || 'none (nothing had passed)'}`);
    if (wentOff.length > 0) {
      const entry = (pj.project.gateHoldLog ?? []).find((e: any) => e.gateId === wentOff[0]);
      t('...and the envelope carries it with the change and what the gate now waits on', !!entry && entry.changeIds.includes('CHG-E2E-M') && entry.reasons.length > 0 && !!entry.changedBy, short(entry));
    }
    const standing = ['SG12', 'SG11'].filter((g) => gp.isGatePassed(pj.project, g));
    const before = (await db.query(`SELECT count(*)::int AS n FROM backtrack_events WHERE "projectId" = $1`, [PROJECT])).rows[0].n;
    r = await triage('CHG-E2E-M', 'Material impact', ['SG11', 'SG12']);
    t('a Material triage over passed gates is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
    pj = await project();
    t('...and every confirmed gate that stood passed is reopened (all of them, not only the earliest)', standing.every((g) => !gp.isGatePassed(pj.project, g)) && standing.every((g) => pj.project.gates.find((x: any) => x.gateId === g)?.status === 'Not Started'), short(standing));
    const after = (await db.query(`SELECT count(*)::int AS n, max(reason) AS reason FROM backtrack_events WHERE "projectId" = $1`, [PROJECT])).rows[0];
    t('...recorded as one event that keeps the earlier record and names the change', standing.length === 0 || (after.n === before + 1 && /CHG-E2E-M/.test(String(after.reason))), short(after));
  }

  // ============================================================ the deferred parts of Round 5 questions 9-11, 2026-11-12
  console.log('\n--- Round 5 questions 9-11: resolved gaps, per-market triage scope, linked review, revised triage, area assessments, baselines');
  const changesNow = async () => (await project()).project.changes as any[];
  const addChange = async (c: any) =>
    api('admin', 'PUT', `/projects/${PROJECT}/changes`, { records: [...(await changesNow()), c], expectedVersion: await version() });
  const holdFn = async (roleKey: string, userId: string | null) =>
    api('admin', 'PUT', `/projects/${PROJECT}/function-assignees`, { assignments: [{ roleKey, userId }], expectedVersion: await version() });
  const projMarkets: string[] = [...((await project()).project.identity.markets ?? [])];

  // ---- question 7: a recorded triage is revised, never overwritten silently
  {
    await addChange({ ...newChange('CHG-E2E-R', 'pif-any-change'), impactAreas: [] });
    r = await triage('CHG-E2E-R', 'No material impact');
    r = await triage('CHG-E2E-R', 'Administrative correction');
    t('a recorded triage can be revised by the holder, with a reason', r.status < 300, `${r.status} ${short(r.json)}`);
    const rev = (await db.query(`SELECT before FROM audit_events WHERE "projectId" = $1 AND action = 'change.triage_revised' AND "entityId" = 'CHG-E2E-R' ORDER BY "occurredAt" DESC LIMIT 1`, [PROJECT])).rows[0];
    t('...and the earlier assessment stays in the audit trail', !!rev && rev.before?.outcome === 'No material impact' && !!rev.before?.by, short(rev));
  }

  // ---- question 10: Gates 10-12 scope per market
  {
    r = await addChange({ ...newChange('CHG-E2E-PM', 'pif-any-change'), impactAreas: [] });
    t('a change for the per-market scope test is recorded', r.status < 300, `${r.status} ${short(r.json)}`);
    const m1 = projMarkets[0];
    const m2 = projMarkets[1];
    await db.query(`DELETE FROM gate_sign_offs WHERE id LIKE 'e2e-lane-%'`);
    for (const [i, m] of [m1, m2].entries()) {
      await db.query(
        `INSERT INTO gate_sign_offs (id, "projectId", "gateId", market, role, name, "signedAt", decision, "updatedAt") VALUES ($1, $2, 'SG10', $3, 'Prepared by', 'e2e', now(), 'Proceed', now())`,
        [`e2e-lane-${i}`, PROJECT, m],
      );
    }
    r = await api('admin', 'PUT', `/projects/${PROJECT}/function-assignees`, { assignments: [{ roleKey: 'quality-change-control', userId: sessions['admin'].id }], expectedVersion: await version() });
    r = await api('admin', 'POST', `/projects/${PROJECT}/changes/CHG-E2E-PM/triage`, { outcome: 'Material impact', confirmedGates: ['SG10'], confirmedMarkets: ['Atlantis'], reason: 'e2e', expectedVersion: await version() });
    t('a market that is not one of the project is refused (400)', r.status === 400 && /Atlantis/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
    r = await api('admin', 'POST', `/projects/${PROJECT}/changes/CHG-E2E-PM/triage`, { outcome: 'Material impact', confirmedGates: ['SG10'], confirmedMarkets: [m1], reason: 'e2e market scope', expectedVersion: await version() });
    triageActs++;
    await holdFn('quality-change-control', null);
    t('a Material triage naming one market is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
    const lanes = (await db.query(`SELECT market, "signedAt" FROM gate_sign_offs WHERE id LIKE 'e2e-lane-%'`)).rows;
    t('...only the named market lane is reopened (its signature cleared)', lanes.find((l: any) => l.market === m1)?.signedAt === null, short(lanes));
    t('...the other market keeps its signature', lanes.find((l: any) => l.market === m2)?.signedAt !== null, short(lanes));
    const ev = (await db.query(`SELECT before, after FROM audit_events WHERE "projectId" = $1 AND action = 'gate.market_lanes_reopened' ORDER BY "occurredAt" DESC LIMIT 1`, [PROJECT])).rows[0];
    t('...and the cleared signature is kept in the audit event', !!ev && (ev.before?.cleared ?? []).length >= 1 && (ev.before?.cleared ?? []).every((x: any) => x.market === m1) && ev.after?.markets?.[0] === m1, short(ev));
    pj = await project();
    t('...recorded on the change as its confirmed markets', (pj.project.changes.find((c: any) => c.changeId === 'CHG-E2E-PM')?.confirmedMarkets ?? [])[0] === m1);
    await db.query(`DELETE FROM gate_sign_offs WHERE id LIKE 'e2e-lane-%'`);
  }

  // ---- question 10: a linked Gate 12 review per market, earlier reviews kept
  {
    const m1 = projMarkets[0];
    r = await addChange({ ...newChange('CHG-E2E-L', 'pif-any-change'), impactAreas: [] });
    const reviewsBefore = (await db.query(`SELECT count(*)::int AS n FROM post_launch_reviews WHERE "projectId" = $1 AND milestone NOT LIKE 'change:%'`, [PROJECT])).rows[0].n;
    await holdFn('quality-change-control', sessions['admin'].id);
    r = await api('admin', 'POST', `/projects/${PROJECT}/changes/CHG-E2E-L/triage`, { outcome: 'Material impact', confirmedGates: ['SG12'], confirmedMarkets: [m1], reason: 'e2e post-market', expectedVersion: await version() });
    triageActs++;
    await holdFn('quality-change-control', null);
    t('a Material triage reaching Gate 12 is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
    const linked = (await db.query(`SELECT market, "linkedChangeId", "formulaVersion", "completedDate" FROM post_launch_reviews WHERE "projectId" = $1 AND milestone = 'change:CHG-E2E-L'`, [PROJECT])).rows;
    t('...it opens exactly one linked review, for the named market, open, with the change and the version', linked.length === 1 && linked[0].market === m1 && linked[0].linkedChangeId === 'CHG-E2E-L' && !!linked[0].formulaVersion && linked[0].completedDate === null, short(linked));
    const reviewsAfter = (await db.query(`SELECT count(*)::int AS n FROM post_launch_reviews WHERE "projectId" = $1 AND milestone NOT LIKE 'change:%'`, [PROJECT])).rows[0].n;
    t('...and no earlier review was deleted', reviewsAfter === reviewsBefore, `${reviewsBefore} -> ${reviewsAfter}`);
    pj = await project();
    t('...the review reaches the envelope with its link', (pj.project.postLaunchReviews ?? []).some((x: any) => x.milestone === 'change:CHG-E2E-L' && x.linkedChangeId === 'CHG-E2E-L'));
  }

  // ---- question 11: area assessments, and NP's approval does not stand in
  {
    r = await addChange({ ...newChange('CHG-E2E-A', 'pif-any-change'), impactAreas: ['Safety'] });
    t('a change with a Safety impact area is recorded', r.status < 300, `${r.status} ${short(r.json)}`);
    r = await triage('CHG-E2E-A', 'No material impact');
    const A = async () => (await changesNow()).find((c: any) => c.changeId === 'CHG-E2E-A');
    r = await putChanges((await changesNow()).map((c: any) => (c.changeId === 'CHG-E2E-A' ? { ...c, status: 'Approved - Implementation Pending' } : c)));
    t('a triaged change cannot be approved while an impact area has no assessment (400)', r.status === 400 && /assessed Safety/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
    const assess = (key: string, body: any) => api(key, 'POST', `/projects/${PROJECT}/changes/CHG-E2E-A/area-assessments`, body).then(async (x: any) => x);
    r = await api('admin', 'POST', `/projects/${PROJECT}/changes/CHG-E2E-A/area-assessments`, { area: 'Safety', outcome: 'No concern', note: 'x', expectedVersion: await version() });
    t('nobody holds the Safety function yet, so nobody can assess it (400)', r.status === 400 && /Nobody is assigned/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
    await holdFn('safety-scientific', sessions[other].id);
    r = await api('admin', 'POST', `/projects/${PROJECT}/changes/CHG-E2E-A/area-assessments`, { area: 'Safety', outcome: 'No concern', note: 'x', expectedVersion: await version() });
    t('an administrator does not stand in for the function holder (403)', r.status === 403, `${r.status} ${short(r.json)}`);
    void assess;
    r = await api(other, 'POST', `/projects/${PROJECT}/changes/CHG-E2E-A/area-assessments`, { area: 'Formula', outcome: 'No concern', note: 'x', expectedVersion: await version() });
    t('an area the change does not name is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
    r = await api(other, 'POST', `/projects/${PROJECT}/changes/CHG-E2E-A/area-assessments`, { area: 'Safety', outcome: 'Fine', note: 'x', expectedVersion: await version() });
    t('an outcome off the list is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
    r = await api(other, 'POST', `/projects/${PROJECT}/changes/CHG-E2E-A/area-assessments`, { area: 'Safety', outcome: 'No concern', note: ' ', expectedVersion: await version() });
    t('an assessment with no note is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
    r = await api(other, 'POST', `/projects/${PROJECT}/changes/CHG-E2E-A/area-assessments`, { area: 'Safety', outcome: 'Action required', note: 'first look', expectedVersion: await version() });
    t('the function holder records the assessment as themselves', r.status < 300, `${r.status} ${short(r.json)}`);
    const rec = (await A())?.areaAssessments?.[0];
    t('...with who, when and the outcome', rec?.area === 'Safety' && rec?.outcome === 'Action required' && !!rec?.assessedBy && !!rec?.assessedAt, short(rec));
    r = await api(other, 'POST', `/projects/${PROJECT}/changes/CHG-E2E-A/area-assessments`, { area: 'Safety', outcome: 'No concern', note: 'second look', expectedVersion: await version() });
    const earlier = (await db.query(`SELECT after FROM audit_events WHERE "projectId" = $1 AND action = 'change.area_assessed' ORDER BY "occurredAt" DESC LIMIT 1`, [PROJECT])).rows[0];
    t('a later assessment replaces the current one and the earlier stays in the audit event', r.status < 300 && earlier?.after?.earlier?.outcome === 'Action required', `${r.status} ${short(earlier)}`);
    t('...one assessment per area stays current', ((await A())?.areaAssessments ?? []).length === 1);
    r = await putChanges((await changesNow()).map((c: any) => (c.changeId === 'CHG-E2E-A' ? { ...c, status: 'Approved - Implementation Pending', areaAssessments: [] } : c)));
    t('once every area is assessed the change can be approved (a forged assessments list is ignored)', r.status < 300 && ((await A())?.areaAssessments ?? []).length === 1, `${r.status} ${short(r.json)}`);
    await holdFn('safety-scientific', null);
  }

  // ---- question 11: controlled baselines
  {
    const m1 = projMarkets[0];
    // the changes recorded so far name no impact area, so none of these baselines is covered yet
    const trackRows = async () => (await project()).project.marketTracks.map((x: any) => ({ ...x }));
    const saved = (await db.query(`SELECT id, "regulatoryStatus" FROM market_tracks WHERE "projectId" = $1 AND market = $2`, [PROJECT, m1])).rows;
    await db.query(`UPDATE market_tracks SET "regulatoryStatus" = 'Approved' WHERE "projectId" = $1 AND market = $2`, [PROJECT, m1]);
    const takeBack = async () => api('admin', 'PUT', `/projects/${PROJECT}/market-tracks`, { tracks: (await trackRows()).map((x: any) => (x.market === m1 ? { ...x, regulatoryStatus: 'Pending' } : x)), expectedVersion: await version() });
    r = await takeBack();
    t('taking back a market approval with no covering change is refused (400)', r.status === 400 && /controlled baseline/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
    r = await addChange({ ...newChange('CHG-E2E-B1', 'pif-any-change'), impactAreas: ['Regulatory'], markets: [projMarkets[1]] });
    r = await takeBack();
    t('...a Regulatory change for ANOTHER market does not cover it (400)', r.status === 400, `${r.status} ${short(r.json)}`);
    r = await api('admin', 'PUT', `/projects/${PROJECT}/changes`, { records: (await changesNow()).map((c: any) => (c.changeId === 'CHG-E2E-B1' ? { ...c, markets: [m1] } : c)), expectedVersion: await version() });
    r = await takeBack();
    t('...with an open Regulatory change for this market it is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
    for (const row of saved) await db.query(`UPDATE market_tracks SET "regulatoryStatus" = $2 WHERE id = $1`, [row.id, row.regulatoryStatus]);

    // a released label
    const labels = async () => (await project()).project.registers.releasedLabelRegister ?? [];
    const putLabels = async (rows: any[]) => api('admin', 'PUT', `/projects/${PROJECT}/registers/releasedLabelRegister`, { rows, expectedVersion: await version() });
    await db.query(`UPDATE change_records SET "impactAreas" = array_remove(array_remove("impactAreas", 'Artwork'), 'Packaging') WHERE "projectId" = $1`, [PROJECT]);
    const row0 = { productSku: 'e2e-label', newLabelReleased: 'Y', whatChanged: 'first wording' };
    r = await putLabels([...(await labels()), row0]);
    t('a new released label row can be recorded', r.status < 300, `${r.status} ${short(r.json)}`);
    r = await putLabels((await labels()).map((x: any) => (x.productSku === 'e2e-label' ? { ...x, whatChanged: 'second wording' } : x)));
    t('editing a released label with no Artwork or Packaging change is refused (400)', r.status === 400 && /controlled baseline/.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
    r = await putLabels((await labels()).map((x: any) => (x.productSku === 'e2e-label' ? { ...x, notes: 'just a note' } : x)));
    t('...notes stay free to edit', r.status < 300, `${r.status} ${short(r.json)}`);
    r = await addChange({ ...newChange('CHG-E2E-B2', 'pif-any-change'), impactAreas: ['Artwork'] });
    r = await putLabels((await labels()).map((x: any) => (x.productSku === 'e2e-label' ? { ...x, whatChanged: 'second wording' } : x)));
    t('...with an open Artwork change the edit is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
    await db.query(`DELETE FROM register_rows WHERE "projectId" = $1 AND "registerKey" = 'releasedLabelRegister' AND data->>'productSku' = 'e2e-label'`, [PROJECT]);

    // An approved claim revision and an Ingredient Substitution row cannot be driven through the API on this project: the claims ledger carries a
    // standing closing signature (SG03) and the substitution register's gate (04/07) has passed, and both locks answer first. Their rules are covered by
    // npm run verify:change-baseline; the server calls the same functions.
  }

  // The Low/Medium resolution rule (question 9) is covered by npm run verify:gap-controls: on this project every gate that could carry the field is
  // either signed, held by an open change or not current, so a gate save cannot reach gapBlocksDecision here.


  console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
  return bad;
}
