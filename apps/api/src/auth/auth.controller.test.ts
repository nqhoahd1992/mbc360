// "Sign in with Microsoft 365" goes through AppHub (2026-11-17, AppHub repo docs/10-ai-microsoft-via-hub.md).
// Run: npm run test:auth -w @mbc360/api  (node:test via tsx, Prisma faked — no database needed).
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { HubController } from '../hub/hub.controller';
import { hubSignature } from '../hub/hub-connector';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const ENV = ['HUB_URL', 'HUB_APP', 'HUB_SECRET', 'HUB_SECRET_NEXT', 'APP_BASE_URL'] as const;
const savedEnv = Object.fromEntries(ENV.map((key) => [key, process.env[key]]));
const SECRET = 'test-hub-secret-at-least-32-characters-long';

beforeEach(() => {
  for (const key of ENV) delete process.env[key];
});
afterEach(() => {
  for (const key of ENV) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

// Every Prisma call is recorded, so a test can prove nothing was created (any call other than findFirst/findUnique throws).
type FakeUser = { id: string; email: string; active: boolean; roles: number };
function fakePrisma(users: FakeUser[]) {
  const calls: string[] = [];
  const model = (name: string) =>
    new Proxy({} as Record<string, unknown>, {
      get: (_target, method: string) => async (args: { where?: { id?: string; email?: { equals: string } }; data?: Record<string, unknown> }) => {
        calls.push(`${name}.${method}`);
        if (name === 'user' && method === 'findFirst') {
          const row = users.find((u) => u.email.toLowerCase() === args.where?.email?.equals.toLowerCase());
          return row ? { id: row.id, email: row.email } : null;
        }
        if (name === 'user' && method === 'findUnique') {
          const row = users.find((u) => u.id === args.where?.id);
          return row ? { active: row.active, _count: { roles: row.roles } } : null;
        }
        throw new Error(`unexpected prisma.${name}.${method}`);
      },
    });
  const prisma = { user: model('user') };
  return { prisma, calls, users };
}

function authService(prisma: unknown = {}) {
  const jwt = { signAsync: async () => 'session-token' };
  const audit = { record: async () => undefined };
  return new AuthService(prisma as never, jwt as never, audit as never);
}

const fakeResponse = () => {
  const res = {
    redirectedTo: undefined as string | undefined,
    cookies: [] as string[],
    code: 0,
    body: undefined as unknown,
    redirect(url: string) {
      this.redirectedTo = url;
    },
    cookie(name: string) {
      this.cookies.push(name);
    },
    clearCookie() {},
    status(code: number) {
      this.code = code;
      return this;
    },
    json(value: unknown) {
      this.body = value;
      return value;
    },
  };
  return res;
};

describe('GET /api/auth/options and /api/auth/login (Sign in with Microsoft 365 → AppHub)', () => {
  it('shows the Microsoft button only when HUB_URL and HUB_APP are both set', () => {
    assert.deepEqual(new AuthController(authService()).options(), { microsoft: false });
    process.env.HUB_URL = 'https://hub.example.com/';
    assert.deepEqual(new AuthController(authService()).options(), { microsoft: false });
    delete process.env.HUB_URL;
    process.env.HUB_APP = 'mbc360';
    assert.deepEqual(new AuthController(authService()).options(), { microsoft: false });
    process.env.HUB_URL = 'https://hub.example.com/';
    assert.deepEqual(new AuthController(authService()).options(), { microsoft: true });
  });

  it('sends the browser to {HUB_URL}/launch/{HUB_APP}', () => {
    process.env.HUB_URL = ' https://hub.example.com/ ';
    process.env.HUB_APP = 'mbc360';
    const res = fakeResponse();
    new AuthController(authService()).login(res as never);
    assert.equal(res.redirectedTo, 'https://hub.example.com/launch/mbc360');
    assert.deepEqual(res.cookies, [], 'no OIDC transient cookie any more');
  });

  it('passes an in-app ?next= on to AppHub as /launch/{HUB_APP}?next= (AppHub docs/11)', () => {
    process.env.HUB_URL = 'https://hub.example.com';
    process.env.HUB_APP = 'mbc360';
    for (const next of ['/projects/p1/phase/2', '/admin/users?tab=roles#x']) {
      const res = fakeResponse();
      new AuthController(authService()).login(res as never, next);
      assert.equal(res.redirectedTo, `https://hub.example.com/launch/mbc360?${new URLSearchParams({ next })}`);
    }
  });

  it('drops a ?next= that is not an in-app path: //host, /\\host, an absolute URL, "/", empty, not a string', () => {
    process.env.HUB_URL = 'https://hub.example.com';
    process.env.HUB_APP = 'mbc360';
    for (const next of ['//evil.com/x', '/\\evil.com', 'https://evil.com/', 'javascript:alert(1)', 'projects', '/', '', undefined, ['/a', '/b']]) {
      const res = fakeResponse();
      new AuthController(authService()).login(res as never, next as never);
      assert.equal(res.redirectedTo, 'https://hub.example.com/launch/mbc360', `next=${JSON.stringify(next)}`);
    }
  });

  it('answers 404 when AppHub is not configured (no Microsoft sign-in of its own)', () => {
    process.env.HUB_URL = 'https://hub.example.com';
    assert.throws(() => new AuthController(authService()).login(fakeResponse() as never), NotFoundException);
    delete process.env.HUB_URL;
    process.env.HUB_APP = 'mbc360';
    assert.throws(() => new AuthController(authService()).login(fakeResponse() as never), NotFoundException);
  });

  it('has no Microsoft callback route any more (GET /api/auth/callback → 404)', () => {
    const routes = Object.getOwnPropertyNames(AuthController.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => (AuthController.prototype as unknown as Record<string, object>)[name])
      .filter((handler) => typeof handler === 'function' && Reflect.hasMetadata(PATH_METADATA, handler))
      .map((handler) => `${RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number]} ${Reflect.getMetadata(PATH_METADATA, handler) as string}`)
      .sort();
    assert.deepEqual(routes, ['GET login', 'GET me', 'GET options', 'POST dev-login', 'POST logout']);
  });
});

describe('Entering through AppHub creates no account', () => {
  async function signInThroughHub(hub: HubController, email: string) {
    const raw = Buffer.from(JSON.stringify({ email }));
    const ts = Math.floor(Date.now() / 1000);
    const headers = {
      'content-type': 'application/json',
      'content-length': String(raw.length),
      'x-hub-timestamp': String(ts),
      'x-hub-signature': hubSignature(SECRET, ts, raw),
    };
    const sso = fakeResponse();
    await hub.sso({ headers, query: {}, rawBody: raw, body: { email } } as never, sso as never);
    assert.equal(sso.code, 200);
    const login = fakeResponse();
    const locals: Record<string, unknown> = {};
    await hub.login({ headers: {}, query: { code: (sso.body as { code: string }).code } } as never, Object.assign(login, { locals }) as never);
    return login;
  }

  function hubFor(users: FakeUser[]) {
    process.env.HUB_SECRET = SECRET;
    process.env.APP_BASE_URL = 'https://mbc360.example.com';
    const fake = fakePrisma(users);
    return { hub: new HubController(fake.prisma as never, authService(fake.prisma)), ...fake };
  }

  it('an email MBc360 does not know lands on /?hub_error=no_account, every time, and nothing is created', async () => {
    const { hub, calls, users } = hubFor([{ id: 'u1', email: 'linh@maxbiocare.com', active: true, roles: 1 }]);
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await signInThroughHub(hub, 'new.starter@maxbiocare.com');
      assert.equal(res.redirectedTo, 'https://mbc360.example.com/?hub_error=no_account');
      assert.deepEqual(res.cookies, []);
    }
    assert.deepEqual([...new Set(calls)], ['user.findFirst'], 'only looked up, nothing created');
    assert.equal(users.length, 1);
  });

  it('an account an administrator added, still without a role, is refused (no session); with a role it enters', async () => {
    const { hub, calls } = hubFor([
      { id: 'u1', email: 'norole@maxbiocare.com', active: true, roles: 0 },
      { id: 'u2', email: 'linh@maxbiocare.com', active: true, roles: 1 },
    ]);
    const refused = await signInThroughHub(hub, 'norole@maxbiocare.com');
    assert.equal(refused.redirectedTo, 'https://mbc360.example.com/?auth_error=no_role&as=norole%40maxbiocare.com');
    assert.deepEqual(refused.cookies, []);
    const entered = await signInThroughHub(hub, 'Linh@MaxBiocare.com');
    assert.equal(entered.redirectedTo, 'https://mbc360.example.com/');
    assert.deepEqual(entered.cookies, ['mbc360_session']);
    assert.deepEqual([...new Set(calls)].sort(), ['user.findFirst', 'user.findUnique']);
  });
});
