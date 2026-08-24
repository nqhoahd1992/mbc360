import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// RFC 6238 TOTP (RFC 4226 HOTP over a time counter), written directly on
// node's crypto rather than pulled in as a dependency — the same call this
// repo already makes for Microsoft Graph, where mailer.service.ts uses plain
// `fetch` instead of the Graph SDK. Nothing cryptographic is invented here:
// it is HMAC-SHA1 plus the RFC's dynamic truncation, and it is checked
// against the RFC's OWN published test vectors by
// `npm run verify:totp -w @mbc360/api` (scripts/verify-totp.ts), which is
// the only reason writing it out is defensible at all.

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;
// Accept the neighbouring steps so a phone clock that drifted by a few
// seconds still works — the conventional ±1, i.e. at most ~90s of tolerance.
export const TOTP_WINDOW = 1;
// 160 bits, the size RFC 4226 §4 R6 requires as a minimum and what every
// authenticator app expects for SHA-1.
const SECRET_BYTES = 20;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// RFC 4648 base32, unpadded — the encoding every authenticator app reads a
// shared secret in (both from the QR code and from manual entry).
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  // Tolerate what a person actually types: lower case, the spaces we group
  // the secret with for readability, and '=' padding some apps add back.
  const clean = input.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function counterBuffer(counter: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  return buf;
}

// RFC 4226 §5.3.
export function hotp(secret: Buffer, counter: number, digits: number = TOTP_DIGITS): string {
  const mac = createHmac('sha1', secret).update(counterBuffer(counter)).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const truncated =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(truncated % 10 ** digits).padStart(digits, '0');
}

export function currentStep(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
}

export function generateSecret(): string {
  return base32Encode(randomBytes(SECRET_BYTES));
}

function equalCodes(a: string, b: string): boolean {
  // timingSafeEqual throws on a length mismatch, so the cheap length check
  // has to come first; both operands are ASCII digit strings.
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Returns the time STEP the code matched (so the caller can store it and
// refuse the same code a second time — a TOTP code stays valid for its whole
// step, and with the ±1 window for up to ~90s), or null if nothing matched.
export function verifyTotp(
  secretBase32: string,
  code: string,
  opts: { nowMs?: number; window?: number; digits?: number } = {},
): number | null {
  const digits = opts.digits ?? TOTP_DIGITS;
  const window = opts.window ?? TOTP_WINDOW;
  const candidate = String(code ?? '').replace(/\s/g, '');
  if (!new RegExp(`^\\d{${digits}}$`).test(candidate)) return null;
  const secret = base32Decode(secretBase32);
  const center = currentStep(opts.nowMs ?? Date.now());
  // Oldest step first: with a drifting clock the earlier step is the likelier
  // match, and the loop is constant-length either way.
  for (let offset = -window; offset <= window; offset += 1) {
    const step = center + offset;
    if (equalCodes(hotp(secret, step, digits), candidate)) return step;
  }
  return null;
}

// The URI an authenticator app consumes from the enrolment QR code. The
// label carries `issuer:account` and the `issuer` parameter repeats it, per
// Google's key-uri-format — apps disagree about which one they read.
export function otpauthUri(params: { secret: string; issuer: string; account: string }): string {
  const label = `${encodeURIComponent(params.issuer)}:${encodeURIComponent(params.account)}`;
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

// Grouped in fours for the "can't scan the QR? type this" case.
export function formatSecretForDisplay(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}
