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
const snap = require(join(ROOT, 'packages/shared/dist/utils/gateSnapshot.js'));
/* eslint-enable @typescript-eslint/no-require-imports */
// The same cut the API process makes (harness.js), so readiness evaluated in this process agrees.
for (const gate of ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11', 'SG12']) {
  GATE_READINESS[gate] = GATE_READINESS[gate].filter((item: { check: { kind: string } }) => item.check.kind === 'gateSignedOff');
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
  const short = (v: unknown) => JSON.stringify(v).slice(0, 220);

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
  async function sign(gate: string, role: Role, market?: string, between?: () => Promise<void>) {
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
      decision: 'Proceed',
      comment: 'checked',
      stepUpToken: su.json.stepUpToken,
      expectedHash: preview.hash,
      seen: { snapshot: preview.snapshot, previewedAt: preview.previewedAt },
    });
    return { ...r, stage: 'sign' };
  }
  const stale = async (gate: string, role: Role, market?: string): Promise<string[]> =>
    gp.gateSignOffStaleChanges((await project()).project, gate, market, role);
  const nominate = async (gate: string, market?: string) =>
    api('admin', 'PUT', `/projects/${PROJECT}/gates/${gate}/sign-off-assignees`, {
      market,
      assignments: ROLES.map((role) => ({ role, userId: sessions[signerKey(gate, role, market)].id })),
      expectedVersion: await version(),
    });
  const complete = async (gate: string) =>
    api('admin', 'PUT', `/projects/${PROJECT}/gates/${gate}`, { status: 'Complete', expectedVersion: await version() });
  // ---- phase sign-off helpers (the same three roles, one lane per phase) ------------------------
  const phaseKey = (phase: number, role: Role) => signerKey(`PHASE${phase}`, role);
  const nominatePhase = async (phase: number) =>
    api('admin', 'PUT', `/projects/${PROJECT}/phases/${phase}/sign-off-assignees`, {
      assignments: ROLES.map((role) => ({ role, userId: sessions[phaseKey(phase, role)].id })),
      expectedVersion: await version(),
    });
  async function signPhase(phase: number, role: Role, between?: () => Promise<void>) {
    const key = phaseKey(phase, role);
    const su = await api(key, 'POST', `/projects/${PROJECT}/phases/${phase}/sign-offs/step-up`, { role, code: await code(key) });
    if (su.status >= 300) return { status: su.status, json: su.json, stage: 'step-up' };
    if (between) await between();
    const out = await api(key, 'POST', `/projects/${PROJECT}/phases/${phase}/sign-offs/sign`, {
      role,
      decision: 'Proceed',
      comments: 'checked',
      stepUpToken: su.json.stepUpToken,
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

  // Register closing is a precondition of passing a gate, and a CLOSED register is read-only — so a
  // gate's registers are closed only when that gate is about to pass, as in real use, never earlier.
  // The closing signatures themselves are not under test.
  const closeRegistersOf = async (gates: string[]): Promise<number> => {
    const keys: string[] = REGISTER_CONFIGS.filter((c: any) => gates.includes(gp.gateRefHighestGateId(c.gate) ?? '')).map((c: any) => c.key);
    await db.query(
      `UPDATE register_closure_sign_offs s SET name = 'x', "signedByUserId" = $1, "signedAt" = now()
         FROM register_closures c
        WHERE c.id = s."closureId" AND c."projectId" = $2 AND c."registerKey" = ANY($3)`,
      [sessions.admin.id, PROJECT, keys],
    );
    const closed = await db.query(
      `SELECT count(*)::int AS n FROM register_closure_sign_offs s JOIN register_closures c ON c.id = s."closureId"
        WHERE c."projectId" = $1 AND s."signedAt" IS NOT NULL AND c."registerKey" = ANY($2)`,
      [PROJECT, keys],
    );
    return closed.rows[0].n === keys.length * 2 ? keys.length : -1;
  };
  const upToSg06 = ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06'];
  t('the registers of SG01-SG06 are closed', (await closeRegistersOf(upToSg06)) > 0);
  // Key Gate Checks are part of a gate's evidence (and of its signature snapshot), and phase closing
  // requires them all done. Ticking them AFTER a gate was signed would turn that signature stale, so
  // they are ticked before anything is signed — as a real project must do.
  await db.query(`UPDATE gate_checks SET done = true, ynna = 'Y' WHERE "projectId" = $1 AND gate IN ('01','02','03','04','05','06','07','08','09','10','11','12','ALL')`, [PROJECT]);

  // ============================================================ SG01: identity data
  console.log('\n--- SG01 (the identity fields are Gate 1 data)');
  let r: any = await nominate('SG01');
  t('SG01 nominations accepted', r.status < 300, short(r.json));
  r = await complete('SG01');
  t('SG01 stage status set to Complete', r.status < 300, short(r.json));
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
  t('editing initialScope (Gate 1 data) is accepted before the gate has passed', r.status < 300, short(r.json));
  const s1 = await stale('SG01', 'Prepared by');
  t('...and it makes the Prepared signature stale, naming what changed', s1.some((c) => c.startsWith('Project identity')), short(s1));
  r = await api(signerKey('SG01', 'Prepared by'), 'POST', `/projects/${PROJECT}/gates/SG01/sign-offs/withdraw`, {
    role: 'Prepared by',
    reason: 'scope changed',
    expectedVersion: await version(),
  });
  t('Prepared withdraws the stale signature', r.status < 300, short(r.json));
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
  console.log('\n--- SG02 (only to move the project to SG03)');
  await nominate('SG02');
  await complete('SG02');
  for (const role of ROLES) {
    r = await sign('SG02', role);
    if (r.status >= 300) console.log('   SG02', role, r.stage, r.status, short(r.json));
  }
  pj = await project();
  t('SG02 passed', gp.isGatePassed(pj.project, 'SG02'));

  // ============================================================ SG03: register columns
  console.log('\n--- SG03 (claim ledger: Gate 3 columns versus later-gate columns)');
  await nominate('SG03');
  r = await putClaims(() => [{ claimId: 'C-1', approvedWording: 'Hydrates skin', claimCategory: 'Cosmetic' }]);
  t('a claim row is saved while SG03 is the open gate', r.status < 300, short(r.json));
  const rows0 = (await project()).project.registers.claimEvidenceTraceability;
  t('the server no longer stamps rows (SW-4 was replaced by the row rule)', rows0[0].__rowId === undefined && rows0[0].__bornAtGate === undefined, short(rows0[0]));
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
  t('editing the Gate 3 column (approvedWording) is accepted while SG03 has not passed', r.status < 300, short(r.json));
  t('...and it makes the signature stale', (await stale('SG03', 'Prepared by')).some((c) => c.startsWith('Register changed')), short(await stale('SG03', 'Prepared by')));
  await putClaims((rows) => {
    rows[0].approvedWording = 'Hydrates skin';
    return rows;
  });
  t('putting the wording back makes the signature current again', (await stale('SG03', 'Prepared by')).length === 0, short(await stale('SG03', 'Prepared by')));
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
  r = await putClaims((rows) => [...rows, { claimId: 'C-2', approvedWording: 'A claim raised after SG03 passed' }]);
  t('adding a claim after SG03 passed is refused (403): part of the register belongs to Gate 3', r.status === 403 && String(r.json.message).includes('Rows cannot be added'), `${r.status} ${short(r.json)}`);
  r = await putClaims((rows) => rows.filter((x: any) => x.claimId !== 'C-1'));
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
  await putBom(90);
  t('changing the BOM makes the SG05 Prepared signature stale, naming it', (await stale('SG05', 'Prepared by')).includes('Formula BOM changed'), short(await stale('SG05', 'Prepared by')));
  await putBom(100);
  t('putting the BOM back makes it current again', (await stale('SG05', 'Prepared by')).length === 0, short(await stale('SG05', 'Prepared by')));
  r = await api('admin', 'PUT', `/projects/${PROJECT}/costing`, { patch: { batchSizeKg: 250 }, expectedVersion: await version() });
  t('a costing change is accepted before SG05 passes', r.status < 300, `${r.status} ${short(r.json)}`);
  t('...and it makes the signature stale', (await stale('SG05', 'Prepared by')).some((c) => c.startsWith('Costing')), short(await stale('SG05', 'Prepared by')));
  await api('admin', 'PUT', `/projects/${PROJECT}/costing`, { patch: { batchSizeKg: 100 }, expectedVersion: await version() });
  t('restoring the costing makes it current again', (await stale('SG05', 'Prepared by')).length === 0, short(await stale('SG05', 'Prepared by')));
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
    rows[0].approval = 'Pending Gate 10';
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
  t('changing productStatus (Gate 7 data) before SG07 passes is accepted', r.status < 300, `${r.status} ${short(r.json)}`);
  t('...and it makes the SG07 Prepared signature stale', (await stale('SG07', 'Prepared by')).some((c) => c.startsWith('Register changed')), short(await stale('SG07', 'Prepared by')));
  await putWatch({ productStatus: 'Not present - evidence linked' });
  t('putting it back makes the signature current again', (await stale('SG07', 'Prepared by')).length === 0, short(await stale('SG07', 'Prepared by')));
  t('the SG07 registers are closed now that SG07 is about to pass', (await closeRegistersOf(['SG07'])) > 0);
  for (const role of ['Reviewed by', 'Approved by'] as const) {
    r = await sign('SG07', role);
    t(`${role} signs SG07`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  pj = await project();
  t('SG07 passed', gp.isGatePassed(pj.project, 'SG07'));
  r = await putWatch({ productStatus: 'Present within restriction' });
  t('after SG07 passed, the watch-list is read-only (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('every earlier gate is still passed and every signature still current',
    ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07'].every((g) => gp.isGatePassed(pj.project, g)));
  for (const g of ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07']) {
    t(`${g}: no signature is stale`, (await Promise.all(ROLES.map((role) => stale(g, role)))).every((c) => c.length === 0), short(await Promise.all(ROLES.map((role) => stale(g, role)))));
  }

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
  await complete('SG08');
  r = await sign('SG08', 'Prepared by');
  t('Prepared signs SG08', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  await putAssess({ humanStudyPlanned: 'Undecided' });
  t('changing the assessment makes the SG08 signature stale, naming it', (await stale('SG08', 'Prepared by')).some((c) => c.startsWith('Assessment: human study')), short(await stale('SG08', 'Prepared by')));
  await putAssess({ humanStudyPlanned: 'No' });
  t('putting it back makes the signature current again', (await stale('SG08', 'Prepared by')).length === 0, short(await stale('SG08', 'Prepared by')));
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
  r = await putAssess({ scaleUpRiskIdentified: 'No' });
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
  await putAssess({ scaleUpRiskIdentified: 'Pending assessment' });
  t('changing the scale-up assessment makes the SG09 signature stale', (await stale('SG09', 'Prepared by')).some((c) => c.startsWith('Assessment: scale-up')), short(await stale('SG09', 'Prepared by')));
  await putAssess({ scaleUpRiskIdentified: 'No' });
  r = await api('admin', 'PUT', `/projects/${PROJECT}/formula-properties`, { patch: { microRationale: 'changed late' }, expectedVersion: await version() });
  t('the formula properties (Gate 5 data) are read-only now that SG05 has passed (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  t('the SG09 registers are closed now that SG09 is about to pass', (await closeRegistersOf(['SG09'])) >= 0);
  for (const role of ['Reviewed by', 'Approved by'] as const) {
    r = await sign('SG09', role);
    t(`${role} signs SG09`, r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  }
  pj = await project();
  t('SG09 passed', gp.isGatePassed(pj.project, 'SG09'));
  r = await putAssess({ scaleUpRiskIdentified: 'Yes' });
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
    if (rows.length === 0) rows.push({ recordId: 'P-1', workflowState });
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
  await putClosure('Completed');
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
  console.log(`   NOTE: SG10-SG12 now have an unsigned lane for the new market (SG10 passed: ${gp.isGatePassed(pj.project, 'SG10')}) — E3(a), one lane per active market`);

  console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
  return bad;
}
