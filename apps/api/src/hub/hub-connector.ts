// =====================================================================
//  AppHub connector — gắn vào app con để nhận đăng nhập từ AppHub.
//  Giao thức: docs/01-sso-protocol.md. Cách gắn: connector/README.md.
//
//  Copy nguyên file này vào app con: app TypeScript dùng hub-connector.ts, app JavaScript (ESM) dùng hub-connector.js
//  (sinh từ file .ts bằng `npm run build:js` — đừng sửa tay file .js). Không cần cài thêm thư viện: chỉ dùng module có sẵn của Node (node:crypto, node:http(s), node:dns, node:net).
//  Ba endpoint:
//    POST {APP}/api/hub/sso      AppHub (server) gọi, có ký → 200 {code, expiresInSeconds} | 403 {error:"NO_ACCESS"}
//    GET  {APP}/hub-login        trình duyệt mang ?code=…&next=… → tạo phiên của app → chuyển về `next`
//                                (mã hỏng/hết hạn → trang login ?hub_error=expired; user không còn/bị tắt → ?hub_error=no_account)
//    POST {APP}/api/hub/revoke   AppHub gọi, có ký, {email, at} → vô hiệu mọi phiên của email cấp trước `at`
//    POST {APP}/api/hub/access   AppHub calls, signed, {emails: [...]} → {access: {"<email>": true|false}} (docs/01 7c)
//  Và 2 hàm dựng URL: hubLaunchUrl() (app hết phiên → về hub) và hubLogoutUrl() (Sign out ở app → về hub).
//  Menu "Apps" (tuỳ chọn): listHubApps() — server app hỏi hub danh sách app của người đang đăng nhập (docs/07).
//  Optional: notifyHubAccessChanged() — after granting / removing someone's access, so the Apps menu updates at once.
//
//  Đừng sửa cách tính chữ ký — phải khớp server/src/apps/hub-signer.ts của AppHub.
// =====================================================================

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';

export type HubVerifyError = 'MISSING_HEADERS' | 'EXPIRED' | 'INVALID_SIGNATURE' | 'BAD_BODY';
/** `timestamp`: X-Hub-Timestamp đã kiểm (Unix giây, theo đồng hồ của hub). */
export type HubVerifyResult = { ok: true; body: Record<string, unknown>; timestamp: number } | { ok: false; error: HubVerifyError };

type HeaderBag = Record<string, string | string[] | undefined>;

const header = (headers: HeaderBag, name: string) => {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
};

/** hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`)). */
export function hubSignature(secret: string, timestamp: number | string, rawBody: string | Buffer): string {
  return createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
}

/**
 * Kiểm tra request từ AppHub: còn hạn (lệch dưới `maxSkewSeconds`), chữ ký đúng với MỘT trong các secret
 * (lúc đổi secret app nhận cả khoá cũ lẫn khoá mới), body là JSON object.
 * `rawBody` phải là đúng các byte đã nhận (chưa parse JSON rồi stringify lại).
 */
export function verifyHubRequest(input: { secrets: string | string[]; headers: HeaderBag; rawBody: string | Buffer; maxSkewSeconds?: number; now?: number }): HubVerifyResult {
  const timestamp = header(input.headers, 'x-hub-timestamp');
  const signature = header(input.headers, 'x-hub-signature');
  if (!timestamp || !signature) return { ok: false, error: 'MISSING_HEADERS' };

  // Unix time (giây), chỉ chữ số — không nhận "1e9", " 12", "0x…".
  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, error: 'EXPIRED' };
  const seconds = Number(timestamp);
  const now = Math.floor((input.now ?? Date.now()) / 1000);
  if (Math.abs(now - seconds) >= (input.maxSkewSeconds ?? 60)) return { ok: false, error: 'EXPIRED' };

  const received = Buffer.from(signature.trim().toLowerCase());
  const secrets = Array.isArray(input.secrets) ? input.secrets : [input.secrets];
  const matches = secrets.some((secret) => {
    const expected = Buffer.from(hubSignature(secret, seconds, input.rawBody));
    return expected.length === received.length && timingSafeEqual(expected, received);
  });
  if (!matches) return { ok: false, error: 'INVALID_SIGNATURE' };

  try {
    const body = JSON.parse(input.rawBody.toString());
    return body && typeof body === 'object' && !Array.isArray(body) ? { ok: true, body, timestamp: seconds } : { ok: false, error: 'BAD_BODY' };
  } catch {
    return { ok: false, error: 'BAD_BODY' };
  }
}

const asEmail = (value: unknown) => (typeof value === 'string' && value.includes('@') ? value.trim().toLowerCase() : null);

/**
 * `next` từ AppHub (docs/01 mục 3): chỉ nhận đường dẫn nội bộ bắt đầu bằng "/" — không nhận "//host", "/\host" hay URL đầy đủ.
 * Sai thì trả null (về trang chính).
 */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string' || !next || next.length > 2000) return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return /[\u0000-\u001f]/.test(next) ? null : next;
}

/** App hết phiên → chuyển trình duyệt tới đây; hub mở lại app và đưa người dùng về đúng `next`. */
export function hubLaunchUrl(hubUrl: string, appSlug: string, next?: string | null) {
  const url = new URL(`/launch/${encodeURIComponent(appSlug)}`, hubUrl);
  const path = safeNext(next);
  if (path) url.searchParams.set('next', path);
  return url.toString();
}

/** Sign out ở app con: xoá phiên của app rồi chuyển trình duyệt tới đây (hub đăng xuất và revoke mọi app). */
export function hubLogoutUrl(hubUrl: string) {
  return new URL('/logout', hubUrl).toString();
}

// ---------------------------------------------------------------------
//  Menu "Apps" (docs/01 mục 7, 7b): SERVER app con hỏi hub danh sách app của một người, ký bằng secret của app này.
//  Trình duyệt không hỏi thẳng hub được khi app con khác domain gốc với hub (cookie hub không đi theo), nên route của
//  app con (vd. GET /api/hub-apps) gọi listHubApps() rồi trả JSON cho script menu (data-apps, docs/07).
// ---------------------------------------------------------------------

/** Một app trong danh sách hub trả, đã lọc: slug sai dạng bị bỏ (không dựng link từ nó), chữ bị cắt độ dài. */
export interface HubAppEntry {
  slug: string;
  name: string;
  description: string | null;
  tone: string | null;
  icon: string | null;
  category: string | null;
  lastResult: string | null;
  lastOpenedAt: string | null;
  /** Can this person open the app (hub's access cache, docs/01 7c): true / false, null = unknown. Display only. */
  access: boolean | null;
}

/** 403: người này không có tài khoản hub đang bật. 502: mọi lỗi khác — `reason` để ghi log, đừng trả ra trình duyệt. */
export type HubAppsResult = { ok: true; apps: HubAppEntry[] } | { ok: false; status: 403 | 502; reason: string };

const SLUG = /^[a-z0-9-]{2,40}$/;
const text = (value: unknown, max: number) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

/** Body hub trả → danh sách đã lọc; không phải `{apps: [...]}` → null. */
export function readHubApps(body: unknown): HubAppEntry[] | null {
  const list = (body as { apps?: unknown } | null)?.apps;
  if (!Array.isArray(list)) return null;
  return list.slice(0, 200).flatMap((item) => {
    const app = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const slug = text(app.slug, 40);
    const name = text(app.name, 80);
    if (!slug || !SLUG.test(slug) || !name) return [];
    const opened = text(app.lastOpenedAt, 40);
    return [
      {
        slug,
        name,
        description: text(app.description, 160),
        tone: text(app.tone, 20),
        icon: text(app.icon, 40),
        category: text(app.category, 60),
        lastResult: text(app.lastResult, 20),
        lastOpenedAt: opened && !Number.isNaN(Date.parse(opened)) ? opened : null,
        access: typeof app.access === 'boolean' ? app.access : null,
      },
    ];
  });
}

/** "203.0.113.10=10.0.0.10, …" (cùng định dạng HUB_LAN_REWRITE của hub) → Map IP public → IP LAN. Sai định dạng → bỏ qua cặp đó. */
function parseLanRewrite(raw: string | null | undefined) {
  const map = new Map<string, string>();
  for (const pair of (raw ?? '').split(',').map((part) => part.trim()).filter(Boolean)) {
    const [from, to, extra] = pair.split('=').map((part) => part.trim());
    if (isIP(from) && isIP(to) && extra === undefined) map.set(from, to);
  }
  return map;
}

/** dns.lookup, nhưng IP public có trong `rewrite` được thay bằng IP LAN (vẫn https, chứng chỉ vẫn kiểm theo domain). */
function rewritingLookup(rewrite: Map<string, string>): LookupFunction {
  return (hostname, options, callback) =>
    dnsLookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
      if (error) return callback(error, []);
      const mapped = addresses.map((entry) => {
        const lan = rewrite.get(entry.address);
        return lan ? { address: lan, family: isIP(lan) } : entry;
      });
      if (options.all) return callback(null, mapped);
      callback(null, mapped[0].address, mapped[0].family);
    });
}

/** POST JSON bằng node:http(s) (không cần thư viện), có hạn giờ, giới hạn 1 MB câu trả lời. */
function postJson(url: string, headers: Record<string, string>, body: string, timeoutMs: number, lanRewrite?: string | null) {
  const target = new URL(url);
  const rewrite = parseLanRewrite(lanRewrite);
  return new Promise<{ status: number; json: unknown }>((resolve, reject) => {
    const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = send(
      target,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Length': String(Buffer.byteLength(body)) },
        timeout: timeoutMs,
        ...(rewrite.size ? { lookup: rewritingLookup(rewrite) } : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 1_000_000) req.destroy(new Error('RESPONSE_TOO_LARGE'));
          else chunks.push(chunk);
        });
        res.on('end', () => {
          let json: unknown = null;
          try {
            json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            /* không phải JSON */
          }
          resolve({ status: res.statusCode ?? 0, json });
        });
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new Error('TIMEOUT')));
    req.on('error', reject);
    req.end(body);
  });
}

/**
 * Hỏi hub: `email` được mở những app nào (POST {HUB}/api/hub/apps, docs/01 mục 7).
 * `email` PHẢI lấy từ phiên đăng nhập trên server của app — không bao giờ nhận từ trình duyệt.
 * `apiUrl`: mặc định `{hubUrl}/api` (dev: hub API ở cổng khác trang). `lanRewrite`: như HUB_LAN_REWRITE của hub, khi app con
 * ở chung LAN với hub mà router không cho gọi ngược vào IP public (gọi domain hub bị treo).
 */
export async function listHubApps(input: {
  hubUrl: string;
  app: string;
  secret: string;
  email: string;
  apiUrl?: string | null;
  lanRewrite?: string | null;
  timeoutMs?: number;
}): Promise<HubAppsResult> {
  const email = asEmail(input.email);
  if (!email) return { ok: false, status: 403, reason: 'NO_EMAIL' };
  const body = JSON.stringify({ app: input.app, email });
  const timestamp = Math.floor(Date.now() / 1000);
  const base = (input.apiUrl?.trim() || new URL('/api', input.hubUrl).toString()).replace(/\/+$/, '');
  let res: { status: number; json: unknown };
  try {
    res = await postJson(
      `${base}/hub/apps`,
      { 'Content-Type': 'application/json', 'X-Hub-Timestamp': String(timestamp), 'X-Hub-Signature': hubSignature(input.secret, timestamp, body) },
      body,
      input.timeoutMs ?? 5000,
      input.lanRewrite,
    );
  } catch (error) {
    return { ok: false, status: 502, reason: `UNREACHABLE: ${(error as Error).message}` };
  }
  if (res.status === 403) return { ok: false, status: 403, reason: 'NO_ACCESS' };
  if (res.status !== 200) return { ok: false, status: 502, reason: `HTTP_${res.status} ${String((res.json as { error?: unknown } | null)?.error ?? '')}`.trim() };
  const apps = readHubApps(res.json);
  return apps ? { ok: true, apps } : { ok: false, status: 502, reason: 'BAD_RESPONSE' };
}

/**
 * Tell the hub that `email`'s access to this app changed (granted, removed, account switched on/off) — POST
 * {HUB}/api/hub/access-changed, docs/01 section 7c. Optional: without it the hub's Apps menu catches up within
 * ACCESS_REFRESH_MINUTES. The hub does not trust a value here; it re-asks this app's POST /api/hub/access.
 * Fire and forget: never throws, a failure only delays the menu update. Call it AFTER the change is saved.
 */
export async function notifyHubAccessChanged(input: {
  hubUrl: string;
  app: string;
  secret: string;
  email: string;
  apiUrl?: string | null;
  lanRewrite?: string | null;
  timeoutMs?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const email = asEmail(input.email);
  if (!email) return { ok: false, reason: 'NO_EMAIL' };
  const body = JSON.stringify({ app: input.app, email });
  const timestamp = Math.floor(Date.now() / 1000);
  try {
    const base = (input.apiUrl?.trim() || new URL('/api', input.hubUrl).toString()).replace(/\/+$/, '');
    const res = await postJson(
      `${base}/hub/access-changed`,
      { 'Content-Type': 'application/json', 'X-Hub-Timestamp': String(timestamp), 'X-Hub-Signature': hubSignature(input.secret, timestamp, body) },
      body,
      input.timeoutMs ?? 5000,
      input.lanRewrite,
    );
    return res.status === 200 ? { ok: true } : { ok: false, reason: `HTTP_${res.status}` };
  } catch (error) {
    return { ok: false, reason: `UNREACHABLE: ${(error as Error).message}` };
  }
}

/** Most emails AppHub sends in one POST /api/hub/access (matches ACCESS_BATCH_MAX in the hub). */
export const ACCESS_BATCH_MAX = 200;

/** Một mã dùng 1 lần. `hubTime`: X-Hub-Timestamp của request SSO đã cấp mã (Unix giây, đồng hồ của hub). */
export interface HubCode {
  email: string;
  hubTime: number;
}

/** Nơi giữ mã dùng 1 lần. Mặc định trong bộ nhớ — đủ khi app chạy 1 instance; nhiều instance thì viết bản DB/Redis. */
export interface HubStore {
  saveCode(code: string, entry: HubCode, ttlSeconds: number): Promise<void> | void;
  /** Lấy và xoá luôn (mã chỉ dùng được 1 lần). Hết hạn hoặc không có → null. */
  takeCode(code: string): Promise<HubCode | null> | HubCode | null;
  /** Xoá mọi mã chưa dùng của email (khi nhận revoke). */
  dropCodes(email: string): Promise<void> | void;
}

export class MemoryHubStore implements HubStore {
  private readonly codes = new Map<string, HubCode & { expiresAt: number }>();

  saveCode(code: string, entry: HubCode, ttlSeconds: number) {
    const now = Date.now();
    for (const [key, saved] of this.codes) if (saved.expiresAt <= now) this.codes.delete(key);
    this.codes.set(code, { ...entry, expiresAt: now + ttlSeconds * 1000 });
  }

  takeCode(code: string) {
    const saved = this.codes.get(code);
    this.codes.delete(code);
    return saved && saved.expiresAt > Date.now() ? { email: saved.email, hubTime: saved.hubTime } : null;
  }

  dropCodes(email: string) {
    for (const [key, saved] of this.codes) if (saved.email === email) this.codes.delete(key);
  }
}

/** Thông tin phiên truyền cho `createSession`. */
export interface HubSessionInfo {
  /**
   * Lúc AppHub gửi request SSO, theo ĐỒNG HỒ CỦA HUB. Lưu vào phiên và so với `at` của revoke (cũng là giờ hub):
   * phiên có `issuedAt < at` là đã bị thu hồi. Đừng so `at` với giờ của app — hai máy lệch giờ sẽ huỷ nhầm hoặc bỏ sót.
   */
  issuedAt: Date;
}

/** Kiểu tối thiểu của request/response Express (NestJS dùng Express bên dưới), để file không phụ thuộc thư viện. */
export interface HubHttpRequest {
  headers: HeaderBag;
  query: Record<string, unknown>;
  body?: unknown;
  /** NestJS: `NestFactory.create(AppModule, { rawBody: true })`. Express: dùng `express.raw()` cho route sso/revoke. */
  rawBody?: Buffer;
}
export interface HubHttpResponse {
  status(code: number): HubHttpResponse;
  json(body: unknown): unknown;
  redirect(url: string): unknown;
}

export interface HubConnectorOptions<U, Req extends HubHttpRequest = HubHttpRequest, Res extends HubHttpResponse = HubHttpResponse> {
  /** HUB_SECRET — AppHub hiện một lần. Lúc đổi secret truyền mảng [khoá mới, khoá cũ] để nhận cả hai. */
  secret: string | string[];
  /** false → mọi endpoint hub trả 404 ("app chưa bật tích hợp hub"). Mặc định true. */
  enabled?: boolean;
  /** Tìm user trong DB của app theo email (email đã viết thường). */
  findUserByEmail(email: string): Promise<U | null> | U | null;
  /**
   * true: email chưa có / bị tắt vẫn nhận mã (200) thay vì 403 NO_ACCESS, và /hub-login đưa trình duyệt về trang login của app
   * với ?hub_error=no_account — app tự báo "chưa có tài khoản" (vd. để người dùng đăng nhập cách khác). Mặc định false.
   */
  noAccessToLoginPage?: boolean;
  /** User còn được vào không. Mặc định: `user.isActive !== false`. */
  isActive?(user: U): boolean;
  /**
   * Optional, for POST /api/hub/access: look up many emails in one query (emails already lower case). Return the users
   * found, each with its email; missing ones count as "no access". Without it the connector calls findUserByEmail per email.
   */
  findUsersByEmails?(emails: string[]): Promise<Array<{ email: string; user: U }>> | Array<{ email: string; user: U }>;
  /** Tạo phiên của app (cookie HttpOnly, hết hạn khi không hoạt động — docs/01 mục 6). Lưu `info.issuedAt` vào phiên để so với revoke. */
  createSession(user: U, req: Req, res: Res, info: HubSessionInfo): Promise<void> | void;
  /** Vô hiệu mọi phiên của email này có `issuedAt` (giờ hub) trước `at`, ở mọi thiết bị. Không truyền → POST /api/hub/revoke trả 404. */
  revokeSessions?(email: string, at: Date): Promise<void> | void;
  /** Đi đâu sau khi tạo phiên. Mặc định: `next` (đã kiểm) hoặc "/". */
  redirectAfterLogin?: (user: U, next: string | null, req: Req, res: Res) => string | Promise<string>;
  /** Trang login của app khi mã sai / hết hạn (thêm ?hub_error=expired). Mặc định "/login". */
  loginPageUrl?: string;
  store?: HubStore;
  codeTtlSeconds?: number;
  maxSkewSeconds?: number;
  /** Ghi log (mặc định console). */
  log?: (message: string) => void;
}

type HandlerResult = { status: number; body: Record<string, unknown> };

export function createHubConnector<U, Req extends HubHttpRequest = HubHttpRequest, Res extends HubHttpResponse = HubHttpResponse>(options: HubConnectorOptions<U, Req, Res>) {
  const secrets = (Array.isArray(options.secret) ? options.secret : [options.secret]).filter(Boolean);
  const enabled = options.enabled ?? true;
  if (enabled && !secrets.length) throw new Error('AppHub connector: HUB_SECRET is empty');
  const store = options.store ?? new MemoryHubStore();
  const codeTtl = options.codeTtlSeconds ?? 60;
  const maxSkew = options.maxSkewSeconds ?? 60;
  const isActive = options.isActive ?? ((user: U) => (user as { isActive?: boolean }).isActive !== false);
  const log = options.log ?? ((message: string) => console.warn(`[apphub] ${message}`));
  const loginPage = options.loginPageUrl ?? '/login';
  const notEnabled: HandlerResult = { status: 404, body: { error: 'NOT_ENABLED' } };
  // Giao thức yêu cầu tối thiểu 32 ký tự (AppHub tạo 43). Ngắn hơn chỉ cảnh báo để máy dev không bị chặn.
  if (secrets.some((secret) => secret.length < 32)) log('HUB_SECRET is shorter than 32 characters; use the secret AppHub generated');

  /** Kiểm chữ ký rồi lấy email (và `at` cho revoke) từ body; lỗi thì trả kết quả 401/400. */
  function readSigned(rawBody: string | Buffer, headers: HeaderBag): { email: string; body: Record<string, unknown>; timestamp: number } | HandlerResult {
    const verified = verifyHubRequest({ secrets, headers, rawBody, maxSkewSeconds: maxSkew });
    if (!verified.ok) {
      log(`rejected request: ${verified.error}`);
      return { status: verified.error === 'BAD_BODY' ? 400 : 401, body: { error: verified.error } };
    }
    const email = asEmail(verified.body.email);
    return email ? { email, body: verified.body, timestamp: verified.timestamp } : { status: 400, body: { error: 'BAD_BODY' } };
  }

  /** POST /api/hub/sso, không phụ thuộc framework. */
  async function handleSso(rawBody: string | Buffer, headers: HeaderBag): Promise<HandlerResult> {
    if (!enabled) return notEnabled;
    const signed = readSigned(rawBody, headers);
    if ('status' in signed) return signed;

    const user = await options.findUserByEmail(signed.email);
    // Chưa đăng ký hoặc bị tắt: cùng một mã (docs/01 mục 2). noAccessToLoginPage: vẫn cấp mã, /hub-login báo no_account.
    if ((!user || !isActive(user)) && !options.noAccessToLoginPage) return { status: 403, body: { error: 'NO_ACCESS' } };

    const code = randomBytes(32).toString('base64url');
    await store.saveCode(code, { email: signed.email, hubTime: signed.timestamp }, codeTtl);
    return { status: 200, body: { code, expiresInSeconds: codeTtl } };
  }

  /** POST /api/hub/revoke, không phụ thuộc framework. Idempotent. Thiếu `at` thì lấy lúc nhận lời gọi. */
  async function handleRevoke(rawBody: string | Buffer, headers: HeaderBag): Promise<HandlerResult> {
    if (!enabled || !options.revokeSessions) return notEnabled;
    const signed = readSigned(rawBody, headers);
    if ('status' in signed) return signed;
    const raw = signed.body.at;
    const at = typeof raw === 'number' ? new Date(raw * 1000) : typeof raw === 'string' ? new Date(raw) : new Date();
    if (Number.isNaN(at.getTime())) return { status: 400, body: { error: 'BAD_BODY' } };
    // Mã cấp trước lúc đăng xuất mà chưa dùng thì bỏ luôn (phiên tạo từ mã đó cũng có issuedAt < at).
    await store.dropCodes(signed.email);
    await options.revokeSessions(signed.email, at);
    return { status: 200, body: { ok: true } };
  }

  /**
   * POST /api/hub/access, framework-free (docs/01 section 7c). `{emails: [...]}` → `{access: {"<email>": boolean}}`, one
   * entry per email as sent. Same rule as SSO: true = the user exists and is active. `noAccessToLoginPage` does not apply
   * here — this answers the real access, so the hub can dim the app for people without an account.
   */
  async function handleAccess(rawBody: string | Buffer, headers: HeaderBag): Promise<HandlerResult> {
    if (!enabled) return notEnabled;
    const verified = verifyHubRequest({ secrets, headers, rawBody, maxSkewSeconds: maxSkew });
    if (!verified.ok) {
      log(`rejected request: ${verified.error}`);
      return { status: verified.error === 'BAD_BODY' ? 400 : 401, body: { error: verified.error } };
    }
    const sent = verified.body.emails;
    if (!Array.isArray(sent) || sent.length > ACCESS_BATCH_MAX || sent.some((email) => typeof email !== 'string')) return { status: 400, body: { error: 'BAD_BODY' } };

    const keys = [...new Set(sent as string[])];
    const lookups = keys.map((key) => ({ key, email: asEmail(key) }));
    const wanted = [...new Set(lookups.flatMap(({ email }) => (email ? [email] : [])))];
    const found = new Map<string, U>();
    if (options.findUsersByEmails) {
      for (const row of await options.findUsersByEmails(wanted)) {
        const email = asEmail(row.email);
        if (email) found.set(email, row.user);
      }
    } else {
      for (const email of wanted) {
        const user = await options.findUserByEmail(email);
        if (user) found.set(email, user);
      }
    }
    const access: Record<string, boolean> = {};
    for (const { key, email } of lookups) {
      const user = email ? found.get(email) : undefined;
      access[key] = !!user && isActive(user);
    }
    return { status: 200, body: { access } };
  }

  /** Đổi mã lấy user (mã chỉ dùng 1 lần). Kiểm tra lại user vì có thể vừa bị khoá. */
  async function redeemCode(code: string): Promise<{ user: U; info: HubSessionInfo } | 'expired' | 'no_account'> {
    const saved = code ? await store.takeCode(code) : null;
    if (!saved) return 'expired';
    const user = await options.findUserByEmail(saved.email);
    return user && isActive(user) ? { user, info: { issuedAt: new Date(saved.hubTime * 1000) } } : 'no_account';
  }

  async function consumeCode(code: string): Promise<{ user: U; info: HubSessionInfo } | null> {
    const redeemed = await redeemCode(code);
    return typeof redeemed === 'string' ? null : redeemed;
  }

  const respond = async (req: Req, res: Res, handler: typeof handleSso) => {
    // Request không có body (Content-Length 0 / thiếu) → body rỗng, để kiểm chữ ký trả 401 thay vì báo thiếu cấu hình.
    const empty = !Number(header(req.headers, 'content-length') ?? 0) && !header(req.headers, 'transfer-encoding');
    const raw = req.rawBody ?? (Buffer.isBuffer(req.body) || typeof req.body === 'string' ? req.body : empty ? '' : null);
    if (raw === null) {
      log('raw body is missing: NestJS needs { rawBody: true }; Express needs express.raw() on this route (connector/README.md)');
      return res.status(500).json({ error: 'RAW_BODY_MISSING' });
    }
    const result = await handler(raw, req.headers);
    return res.status(result.status).json(result.body);
  };

  /** Handler Express / NestJS cho GET /hub-login?code=…&next=… */
  async function login(req: Req, res: Res) {
    if (!enabled) return res.status(404).json(notEnabled.body);
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const consumed = await redeemCode(code);
    if (typeof consumed === 'string') return res.redirect(`${loginPage}${loginPage.includes('?') ? '&' : '?'}hub_error=${consumed}`);
    const { user } = consumed;
    await options.createSession(user, req, res, consumed.info);
    const next = safeNext(req.query.next);
    return res.redirect(options.redirectAfterLogin ? await options.redirectAfterLogin(user, next, req, res) : (next ?? '/'));
  }

  return {
    handleSso,
    handleRevoke,
    handleAccess,
    consumeCode,
    /** Handler Express / NestJS cho POST /api/hub/sso. */
    sso: (req: Req, res: Res) => respond(req, res, handleSso),
    /** Handler Express / NestJS cho POST /api/hub/revoke. */
    revoke: (req: Req, res: Res) => respond(req, res, handleRevoke),
    /** Express / NestJS handler for POST /api/hub/access (docs/01 section 7c). */
    access: (req: Req, res: Res) => respond(req, res, handleAccess),
    login,
  };
}
