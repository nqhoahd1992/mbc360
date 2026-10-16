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
const rc = require(join(ROOT, 'packages/shared/dist/utils/registerClosures.js'));
const snap = require(join(ROOT, 'packages/shared/dist/utils/gateSnapshot.js'));
const { registerClosureSignerRole } = require(join(ROOT, 'packages/shared/dist/config/reviewers.js'));
/* eslint-enable @typescript-eslint/no-require-imports */
// The same cut the API process makes (harness.js), so readiness evaluated in this process agrees.
for (const gate of ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11', 'SG12']) {
  GATE_READINESS[gate] = GATE_READINESS[gate].filter((item: { check: { kind: string } }) => item.check.kind === 'gateSignedOff' || item.id === 'sg07-maternal-caution');
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
    const textColumn = cfg?.columns.find((c: any) => c.type === 'text')?.key as string | undefined;
    t('the register with a signature column exists', !!cfg && !!textColumn);
    if (cfg && textColumn) {
      const signer = 'admin';
      const regRows = async () => ((await project()).project.registers[registerKey] ?? []) as any[];
      const putRows = async (rows: any[]) =>
        api('admin', 'PUT', `/projects/${PROJECT}/registers/${registerKey}`, { rows, expectedVersion: await version() });
      const before = await regRows();
      const index = before.length;
      let r: any = await putRows([...before.map((x) => ({ ...x })), { [textColumn]: 'e2e original text' }]);
      t('a row is added to sign', r.status < 300, `${r.status} ${short(r.json)}`);
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
      r = await putRows(before.map((x) => ({ ...x })));
      t('the test row is removed again', r.status < 300 && (await regRows()).length === before.length, `${r.status} ${short(r.json)}`);
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
        for (const role of ['Review owner', 'Co-sign']) {
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

  // ---- the Change Control assessment, listed per post-market finding (Round 4 question 8, R5-Q11)
  console.log('\n--- Change Control assessment: one entry per post-market finding');
  const me = (await api('admin', 'GET', '/auth/me')).json?.displayName as string;
  const putAssessments = async (entries: unknown[]) =>
    api('admin', 'PUT', `/projects/${PROJECT}/change-control-assessments`, { entries, expectedVersion: await version() });
  const mk = (await project()).project.identity.markets[0] as string;
  const noEntry = (finding: string, over: Record<string, unknown> = {}) => ({
    id: '', finding, answer: 'No', reviewer: me, rationale: 'within the expected range', ...over,
  });
  cr = await putAssessments([noEntry('Rising complaints', { answer: 'Yes', reviewer: undefined, rationale: undefined })]);
  t('Yes without a linked record is refused (400)', cr.status === 400 && /Yes needs a linked/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints', { rationale: undefined })]);
  t('No without a rationale is refused (400)', cr.status === 400 && /No needs both/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints', { answer: 'Yes', linkedRecordId: 'CHG-999', reviewer: undefined, rationale: undefined })]);
  t('a record that is not on this project is refused (400)', cr.status === 400 && /not a change record of this project/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints', { reviewer: 'Somebody Else' })]);
  t('a reviewer that is not the person saving is refused (400)', cr.status === 400 && /can only be set to yourself/.test(String(cr.json?.message)), `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('')]);
  t('an entry that does not say which finding it is about is refused (400)', cr.status === 400, `${cr.status} ${short(cr.json)}`);
  cr = await putAssessments([noEntry('Rising complaints'), noEntry('Eye irritation, Singapore', { answer: 'Pending assessment', reviewer: undefined, rationale: undefined, market: mk })]);
  t('two findings are recorded as two entries', cr.status < 300 && (cr.json?.project?.changeControlAssessments ?? []).length === 2, `${cr.status} ${short(cr.json)}`);
  let list: any[] = cr.json?.project?.changeControlAssessments ?? [];
  t('...in the order given, each with its own id and its market', list[0]?.finding === 'Rising complaints' && list[1]?.market === mk && !!list[0]?.id && list[0].id !== list[1]?.id, short(list));
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
  console.log('\n--- SG02 (only to move the project to SG03)');
  await nominate('SG02');
  await closeRegistersOf(['SG02']);
  await complete('SG02');
  for (const role of ROLES) {
    r = await sign('SG02', role);
    if (r.status >= 300) console.log('   SG02', role, r.stage, r.status, short(r.json));
  }
  pj = await project();
  t('SG02 passed', gp.isGatePassed(pj.project, 'SG02'));

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
  r = await putClaims(() => [{ claimId: 'C-1', approvedWording: 'Hydrates skin', claimCategory: 'Cosmetic' }]);
  t('a claim row is saved while SG03 is the open gate', r.status < 300, short(r.json));
  const rows0 = (await project()).project.registers.claimEvidenceTraceability;
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
    t('the gate flow lists the three gates of Phase 1, all passed', flow?.rows?.length === 3 && flow.rows.every((x: any) => x.decision === 'Proceed'), short(flow?.rows));
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

  // ---- Round 4 question 16 [ASSUMPTION: R5-Q6]: a critical item's auto-generated N/A must be acknowledged
  // by the phase's nominated "Reviewed by" before the gate can close. The kept item is
  // sg07-maternal-caution: this project has no pregnancy/breastfeeding user, so its N/A is generated.
  console.log('\n--- SG07: acknowledging a generated N/A (question 16)');
  const ACK_ITEM = 'sg07-maternal-caution';
  const ackItem = (p: any) => gp.gateReadinessChecklist(p, 'SG07').find((i: any) => i.id === ACK_ITEM);
  const postAck = async (key: string, gateId: string, itemId: string) =>
    api(key, 'POST', `/projects/${PROJECT}/readiness-acknowledgements`, { gateId, itemId, expectedVersion: await version() });
  const ackRows = async () =>
    (
      await db.query(
        `SELECT "acknowledgedByUserId", "acknowledgedByName", "acknowledgedAs", rationale FROM readiness_acknowledgements
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

  // The seeder nominates Phase 3's signers on the demo project, so clear the Reviewed by lane first.
  r = await api('admin', 'PUT', `/projects/${PROJECT}/phases/3/sign-off-assignees`, {
    assignments: [{ role: 'Reviewed by', userId: null }],
    expectedVersion: await version(),
  });
  t('Phase 3 has no Reviewed by nominated', r.status < 300, short(r.json));
  r = await postAck('admin', 'SG07', ACK_ITEM);
  t('nobody is nominated as Reviewed by on Phase 3: even an admin cannot acknowledge (400)', r.status === 400 && /nominat/i.test(String(r.json?.message)), `${r.status} ${short(r.json)}`);
  r = await nominatePhase(3);
  t('the Lead nominates the Phase 3 signers', r.status < 300, short(r.json));
  const reviewerKey = phaseKey(3, 'Reviewed by');
  r = await postAck('admin', 'SG07', ACK_ITEM);
  t('a person who is not the nominated Reviewed by cannot acknowledge — an admin included (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  r = await postAck(reviewerKey, 'SG07', 'sg07-signoff');
  t('an item that is not waiting for an acknowledgement is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await postAck(reviewerKey, 'SG99', ACK_ITEM);
  t('an unknown gate is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await postAck(reviewerKey, 'SG07', ACK_ITEM);
  t('the nominated Reviewed by acknowledges', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('...the item is satisfied and says who acknowledged', ackItem(pj.project)?.satisfied === true && ackItem(pj.project)?.acknowledgement?.state === 'acknowledged' && !!ackItem(pj.project)?.acknowledgement?.by, short(ackItem(pj.project)));
  const first = await ackRows();
  t('...recorded from the session with the wording the engine generated, not anything the client sent',
    first.length === 1 && first[0].acknowledgedByUserId === sessions[reviewerKey].id && first[0].rationale === ackItem(pj.project)?.acknowledgement?.rationale && first[0].acknowledgedAs === 'Reviewed by — Phase 3', short(first));
  r = await postAck(reviewerKey, 'SG07', ACK_ITEM);
  t('the same person acknowledging the same wording twice is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);

  // Re-nominating moves the right; what was recorded stays, and the new reviewer may confirm again.
  const newReviewer = sessions[signerKey('SG07', 'Reviewed by')];
  r = await api('admin', 'PUT', `/projects/${PROJECT}/phases/3/sign-off-assignees`, {
    assignments: [{ role: 'Reviewed by', userId: newReviewer.id }],
    expectedVersion: await version(),
  });
  t('the Lead re-nominates a different Reviewed by for Phase 3', r.status < 300, short(r.json));
  r = await postAck(reviewerKey, 'SG07', ACK_ITEM);
  t('the previous reviewer can no longer acknowledge (403)', r.status === 403, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('...and the earlier acknowledgement still counts', ackItem(pj.project)?.satisfied === true);
  r = await postAck(signerKey('SG07', 'Reviewed by'), 'SG07', ACK_ITEM);
  t('the new reviewer may acknowledge again', r.status < 300, `${r.status} ${short(r.json)}`);
  const edited = await ackRows();
  t('...still ONE row: the new reviewer edited it in place', edited.length === 1 && edited[0].acknowledgedByUserId === newReviewer.id, short(edited));
  pj = await project();
  t("...and the item now reads the new reviewer's name", ackItem(pj.project)?.acknowledgement?.by === edited[0].acknowledgedByName, short(ackItem(pj.project)));

  // The new reviewer disagrees with the reason: that is a recorded decision, with a reason, and it blocks.
  const newKey = signerKey('SG07', 'Reviewed by');
  const postNot = async (comment?: string) =>
    api(newKey, 'POST', `/projects/${PROJECT}/readiness-acknowledgements`, { gateId: 'SG07', itemId: ACK_ITEM, outcome: 'Not acknowledged', comment, expectedVersion: await version() });
  r = await postNot(undefined);
  t('"Not acknowledged" without a reason is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await api(newKey, 'POST', `/projects/${PROJECT}/readiness-acknowledgements`, { gateId: 'SG07', itemId: ACK_ITEM, outcome: 'Maybe', expectedVersion: await version() });
  t('an unknown outcome is refused (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await postNot('the next release adds a pregnancy user');
  t('"Not acknowledged" with a reason is recorded', r.status < 300, `${r.status} ${short(r.json)}`);
  pj = await project();
  t('...the item is rejected and blocks again, saying why', ackItem(pj.project)?.acknowledgement?.state === 'rejected' && ackItem(pj.project)?.satisfied === false && /pregnancy user/.test(String(ackItem(pj.project)?.label)), short(ackItem(pj.project)));
  t('...it is still ONE row (edited in place)', (await ackRows()).length === 1);
  r = await sign('SG07', 'Approved by');
  t('the Approved signature is refused while the reviewer has not acknowledged (400)', r.status === 400, `${r.stage} ${r.status} ${short(r.json)}`);
  r = await postNot('the next release adds a pregnancy user');
  t('recording the same thing again is refused as no change (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  r = await postAck(newKey, 'SG07', ACK_ITEM);
  t('the reviewer changes their mind: acknowledged again, in place', r.status < 300, `${r.status} ${short(r.json)}`);
  const final = await ackRows();
  t('...still one row, now Acknowledged with no stale reason', final.length === 1, short(final));
  const trail = (
    await db.query(
      `SELECT after FROM audit_events WHERE "projectId" = $1 AND action = 'readiness_ack.recorded' ORDER BY "occurredAt", id`,
      [PROJECT],
    )
  ).rows.map((x: any) => x.after);
  t('the audit trail keeps every edit with the values before and after',
    trail.length === 4 && trail[0].before === null && trail[0].after.by === first[0].acknowledgedByName && trail[1].before?.by === first[0].acknowledgedByName && trail[2].after.outcome === 'Not acknowledged' && trail[2].before?.outcome === 'Acknowledged' && trail[3].before?.outcome === 'Not acknowledged', short(trail));
  pj = await project();
  const ackLog = (pj.project.readinessAckLog ?? []).filter((e: any) => e.gateId === 'SG07' && e.itemId === ACK_ITEM);
  t('the envelope carries the edit history of the entry, oldest first, read from the audit trail',
    ackLog.length === 4 && ackLog[0].outcome === 'Acknowledged' && ackLog[0].by === first[0].acknowledgedByName && ackLog[1].by === edited[0].acknowledgedByName && ackLog[2].outcome === 'Not acknowledged' && /pregnancy user/.test(String(ackLog[2].comment)) && ackLog[3].outcome === 'Acknowledged', short(ackLog));
  r = await nominatePhase(3);
  t('the Phase 3 nomination goes back to the standard lanes (the later phase close-out uses them)', r.status < 300, short(r.json));

  r = await sign('SG07', 'Approved by');
  t('Approved signs SG07 once the reason is acknowledged', r.status < 300, `${r.stage} ${r.status} ${short(r.json)}`);
  pj = await project();
  t('SG07 passed', gp.isGatePassed(pj.project, 'SG07'));
  r = await postAck(signerKey('SG07', 'Reviewed by'), 'SG07', ACK_ITEM);
  t('once SG07 has passed, acknowledgements are read-only (400)', r.status === 400, `${r.status} ${short(r.json)}`);
  const audit = (await db.query(`SELECT count(*)::int AS n FROM audit_events WHERE "projectId" = $1 AND action = 'readiness_ack.recorded'`, [PROJECT])).rows[0];
  t('each edit left an audit row (four in all)', audit.n === 4, short(audit));
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
  r = await putAssess({ scaleUpRiskIdentified: 'Pending assessment' });
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
  console.log(`   NOTE: SG10-SG12 now have an unsigned lane for the new market (SG10 passed: ${gp.isGatePassed(pj.project, 'SG10')}) — E3(a), one lane per active market`);

  console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
  return bad;
}
