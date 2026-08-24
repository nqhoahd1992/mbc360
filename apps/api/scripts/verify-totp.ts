/**
 * TOTP implementation verification.
 *
 *   npm run verify:totp
 *
 * Exits non-zero on any failure, so it can be wired into CI.
 *
 * Why this exists: apps/api/src/verification/totp.ts writes RFC 6238 out by
 * hand instead of taking a dependency. That is only defensible while the
 * output is checked against the RFC's own published vectors — a base32
 * padding slip or a wrong-endian counter produces codes that look perfectly
 * plausible (six digits, changing every 30s) and simply never match the
 * user's phone, which at sign-off time reads as "the authenticator is
 * broken", with no way to tell where the fault is.
 *
 * Vectors: RFC 6238 Appendix B (SHA-1 column) and RFC 4648 §10.
 */
import {
  base32Decode,
  base32Encode,
  currentStep,
  hotp,
  otpauthUri,
  verifyTotp,
} from '../src/verification/totp';

const failures: string[] = [];
const check = (name: string, actual: unknown, expected: unknown) => {
  if (actual !== expected) failures.push(`${name}: got ${String(actual)}, expected ${String(expected)}`);
};

// --- RFC 4648 §10 base32 test vectors -----------------------------------
const BASE32_VECTORS: [string, string][] = [
  ['', ''],
  ['f', 'MY'],
  ['fo', 'MZXQ'],
  ['foo', 'MZXW6'],
  ['foob', 'MZXW6YQ'],
  ['fooba', 'MZXW6YTB'],
  ['foobar', 'MZXW6YTBOI'],
];
for (const [plain, encoded] of BASE32_VECTORS) {
  check(`base32Encode("${plain}")`, base32Encode(Buffer.from(plain)), encoded);
  check(`base32Decode("${encoded}")`, base32Decode(encoded).toString(), plain);
}
// Padding and lower case are what a person pastes from an app; both must decode.
check('base32Decode padded/lowercase', base32Decode('mzxw6ytboi===').toString(), 'foobar');

// --- RFC 6238 Appendix B, SHA-1 ----------------------------------------
// Seed is the ASCII string "12345678901234567890" (20 bytes).
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
const RFC_VECTORS: [number, string][] = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
];
for (const [seconds, expected8] of RFC_VECTORS) {
  const step = currentStep(seconds * 1000);
  check(`hotp @ ${seconds}s (8 digits)`, hotp(base32Decode(RFC_SECRET), step, 8), expected8);
  // The app runs at 6 digits, which is the same truncation modulo 10^6 —
  // i.e. the last six digits of the RFC's 8-digit value.
  check(
    `verifyTotp @ ${seconds}s (6 digits)`,
    verifyTotp(RFC_SECRET, expected8.slice(-6), { nowMs: seconds * 1000, window: 0 }),
    step,
  );
}

// --- Window, rejection and shape ---------------------------------------
const NOW_MS = 1_700_000_000_000;
const here = currentStep(NOW_MS);
const secret = base32Encode(Buffer.from('12345678901234567890'));
const codeAt = (step: number) => hotp(base32Decode(secret), step);

check('previous step accepted within ±1', verifyTotp(secret, codeAt(here - 1), { nowMs: NOW_MS }), here - 1);
check('next step accepted within ±1', verifyTotp(secret, codeAt(here + 1), { nowMs: NOW_MS }), here + 1);
check('two steps back rejected', verifyTotp(secret, codeAt(here - 2), { nowMs: NOW_MS }), null);
check('wrong code rejected', verifyTotp(secret, '000000', { nowMs: NOW_MS, window: 0 }) === here, false);
check('short code rejected', verifyTotp(secret, '12345', { nowMs: NOW_MS }), null);
check('non-numeric rejected', verifyTotp(secret, 'abcdef', { nowMs: NOW_MS }), null);
check('spaces tolerated', verifyTotp(secret, codeAt(here).replace(/^(\d{3})/, '$1 '), { nowMs: NOW_MS }), here);
// A different secret must not validate the same code (catches a decode that
// silently returns an empty buffer).
check(
  'other secret rejected',
  verifyTotp(base32Encode(Buffer.from('09876543210987654321')), codeAt(here), { nowMs: NOW_MS }),
  null,
);

const uri = otpauthUri({ secret, issuer: 'MBc360', account: 'a.person@example.com' });
for (const fragment of [
  'otpauth://totp/MBc360:a.person%40example.com?',
  `secret=${secret}`,
  'algorithm=SHA1',
  'digits=6',
  'period=30',
]) {
  if (!uri.includes(fragment)) failures.push(`otpauthUri is missing "${fragment}" — got ${uri}`);
}

if (failures.length > 0) {
  console.error(`\n✗ TOTP verification FAILED (${failures.length}):\n`);
  for (const line of failures) console.error(`  - ${line}`);
  process.exit(1);
}
console.log(
  `✓ TOTP verified: ${BASE32_VECTORS.length} base32 vectors, ${RFC_VECTORS.length} RFC 6238 vectors ` +
    '(8- and 6-digit), window/rejection cases and the otpauth URI shape.',
);
