// AppHub access check (AppHub repo: docs/01-sso-protocol.md section 7c, docs/09-ai-upgrade-access-check.md section 8).
// Run: npm run test:hub -w @mbc360/api  (node:test via tsx, Prisma faked — no database needed).
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HubController } from './hub.controller';
import { hubSignature, readHubApps, verifyHubRequest } from './hub-connector';
import { notifyHubAccess } from './hub-notify';

const SECRET = 'test-hub-secret-at-least-32-characters-long';

// MBc360 lets in an ACTIVE account holding at least one ROLE (AuthService.loginRefusal).
type Row = { id: string; email: string; active: boolean; roles: number };
const rows: Row[] = [
  { id: 'u1', email: 'linh@maxbiocare.com', active: true, roles: 2 },
  { id: 'u2', email: 'Ava@MaxBiocare.com', active: true, roles: 1 },
  { id: 'u3', email: 'norole@maxbiocare.com', active: true, roles: 0 },
  { id: 'u4', email: 'off@maxbiocare.com', active: false, roles: 1 },
];
type Where = { email: { in: string[] }; active?: boolean; roles?: { some: object } };
const findMany = mock.fn(async ({ where }: { where: Where }) =>
  rows
    .filter((r) => where.email.in.includes(r.email.toLowerCase()))
    .filter((r) => where.active === undefined || r.active === where.active)
    .filter((r) => !where.roles?.some || r.roles > 0)
    .map(({ id, email }) => ({ id, email })),
);
const findFirst = mock.fn(async () => null);

function controller() {
  process.env.HUB_SECRET = SECRET;
  return new HubController({ user: { findMany, findFirst, updateMany: async () => ({}) } } as never, {} as never);
}

async function ask(c: HubController, body: unknown, { sign = true, secret = SECRET } = {}) {
  const raw = Buffer.from(JSON.stringify(body));
  const ts = Math.floor(Date.now() / 1000);
  const headers: Record<string, string> = { 'content-type': 'application/json', 'content-length': String(raw.length) };
  if (sign) Object.assign(headers, { 'x-hub-timestamp': String(ts), 'x-hub-signature': hubSignature(secret, ts, raw) });
  const res = {
    code: 0,
    body: undefined as unknown,
    status(code: number) {
      this.code = code;
      return this;
    },
    json(value: unknown) {
      this.body = value;
      return value;
    },
    redirect: () => undefined,
  };
  await c.access({ headers, query: {}, rawBody: raw, body } as never, res as never);
  return { status: res.code, body: res.body };
}

describe('POST /api/hub/access', () => {
  beforeEach(() => {
    findMany.mock.resetCalls();
    findFirst.mock.resetCalls();
  });

  it('true only for an active account holding a role (the entry rule); key = email as sent', async () => {
    const r = await ask(controller(), {
      emails: ['linh@maxbiocare.com', 'AVA@maxbiocare.com', 'norole@maxbiocare.com', 'off@maxbiocare.com', 'nobody@maxbiocare.com', 'not-an-email'],
    });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, {
      access: {
        'linh@maxbiocare.com': true,
        'AVA@maxbiocare.com': true,
        'norole@maxbiocare.com': false,
        'off@maxbiocare.com': false,
        'nobody@maxbiocare.com': false,
        'not-an-email': false,
      },
    });
  });

  it('looks the whole batch up in one query, filtered by the entry rule', async () => {
    await ask(controller(), { emails: ['a@maxbiocare.com', 'b@maxbiocare.com', 'c@maxbiocare.com'] });
    assert.equal(findMany.mock.callCount(), 1);
    assert.equal(findFirst.mock.callCount(), 0);
    const where = findMany.mock.calls[0].arguments[0].where;
    assert.equal(where.active, true);
    assert.deepEqual(where.roles, { some: {} });
  });

  it('an empty batch answers {} with no lookup', async () => {
    assert.deepEqual(await ask(controller(), { emails: [] }), { status: 200, body: { access: {} } });
    assert.deepEqual(findMany.mock.calls.flatMap((c) => c.arguments[0].where.email.in), []);
  });

  it('refuses unsigned or wrongly signed requests with 401, before any lookup', async () => {
    assert.deepEqual(await ask(controller(), { emails: ['linh@maxbiocare.com'] }, { sign: false }), { status: 401, body: { error: 'MISSING_HEADERS' } });
    assert.deepEqual(await ask(controller(), { emails: ['linh@maxbiocare.com'] }, { secret: 'x'.repeat(43) }), {
      status: 401,
      body: { error: 'INVALID_SIGNATURE' },
    });
    assert.equal(findMany.mock.callCount(), 0);
  });

  it('refuses a body that is not an array of at most 200 strings with 400 BAD_BODY', async () => {
    for (const emails of ['linh@maxbiocare.com', [1, 2], Array.from({ length: 201 }, (_, i) => `u${i}@maxbiocare.com`)]) {
      assert.deepEqual(await ask(controller(), { emails }), { status: 400, body: { error: 'BAD_BODY' } });
    }
    assert.equal((await ask(controller(), { emails: Array.from({ length: 200 }, (_, i) => `u${i}@maxbiocare.com`) })).status, 200);
  });
});

describe('Apps menu list (GET /api/hub-apps) keeps access and lastResult', () => {
  it('keeps booleans, drops anything else', () => {
    const apps = readHubApps({ apps: [{ slug: 'sku', name: 'SKU', access: false, lastResult: 'DENIED' }, { slug: 'rm', name: 'RM', access: 'no' }] });
    assert.equal(apps?.[0].access, false);
    assert.equal(apps?.[0].lastResult, 'DENIED');
    assert.equal(apps?.[1].access, null);
  });
});

describe('notifyHubAccess (POST {HUB}/api/hub/access-changed)', () => {
  let hub: Server;
  let answer = 200;
  let received: { url?: string; headers: IncomingMessage['headers']; body: string }[] = [];

  before(async () => {
    hub = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        received.push({ url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('utf8') });
        res.writeHead(answer, { 'Content-Type': 'application/json' }).end(answer === 200 ? '{"ok":true}' : '{"error":"INVALID_SIGNATURE"}');
      });
    });
    await new Promise<void>((r) => hub.listen(0, '127.0.0.1', r));
  });
  after(async () => {
    hub.closeAllConnections();
    await new Promise((r) => hub.close(r));
  });
  beforeEach(() => {
    received = [];
    answer = 200;
    process.env.HUB_URL = 'http://localhost:3700';
    process.env.HUB_APP = 'mbc360';
    process.env.HUB_SECRET = SECRET;
    delete process.env.HUB_SECRET_NEXT;
    process.env.HUB_API_URL = `http://127.0.0.1:${(hub.address() as AddressInfo).port}/api`;
  });

  it('posts {app, email lower case}, signed with HUB_SECRET', async () => {
    assert.equal(await notifyHubAccess('Linh@MaxBiocare.com'), true);
    assert.equal(received.length, 1);
    assert.equal(received[0].url, '/api/hub/access-changed');
    assert.deepEqual(JSON.parse(received[0].body), { app: 'mbc360', email: 'linh@maxbiocare.com' });
    assert.equal(verifyHubRequest({ secrets: SECRET, headers: received[0].headers as never, rawBody: received[0].body }).ok, true);
  });

  it('a refusal, an unreachable hub or a throwing sender resolves false and never throws', async () => {
    answer = 401;
    assert.equal(await notifyHubAccess('linh@maxbiocare.com'), false);
    process.env.HUB_API_URL = 'http://127.0.0.1:1/api';
    assert.equal(await notifyHubAccess('linh@maxbiocare.com'), false);
    const boom = (() => {
      throw new Error('boom');
    }) as never;
    assert.equal(await notifyHubAccess('linh@maxbiocare.com', boom), false);
  });

  it('does not call AppHub without a secret or an email', async () => {
    const send = mock.fn();
    delete process.env.HUB_SECRET;
    assert.equal(await notifyHubAccess('linh@maxbiocare.com', send as never), false);
    process.env.HUB_SECRET = SECRET;
    assert.equal(await notifyHubAccess('', send as never), false);
    assert.equal(send.mock.callCount(), 0);
  });
});
