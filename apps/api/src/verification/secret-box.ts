import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { loadAuthConfig } from '../auth/auth-config';

// Authenticated symmetric encryption for a TOTP shared secret at rest
// (AES-256-GCM), keyed off SESSION_SECRET.
//
// Why encrypt this when CosmetriConnection deliberately stores its tokens in
// plain columns (see the schema comment there): a TOTP secret is a per-USER
// authentication factor, so a leaked database alone — a backup, a read
// replica, someone in Prisma Studio — would let anyone mint valid codes for
// any user and attach that user's signature to a sign-off. Being honest about
// the limit: the key derives from a secret sitting in the same .env on the
// same host, so this protects against a database-only compromise and nothing
// more. It is not a substitute for a secrets manager.
//
// ⚠️ Rotating SESSION_SECRET makes every stored secret undecryptable, i.e.
// every user must re-enrol their authenticator (an admin reset per user, or
// each user removing and re-adding it). That is the intended failure — a
// silent fallback to some other key would defeat the point.
const KEY_SALT = 'mbc360/totp-secret/v1';
const IV_BYTES = 12; // GCM standard nonce length
const ALGORITHM = 'aes-256-gcm';

let cachedKey: Buffer | undefined;

function key(): Buffer {
  // scrypt is deliberately slow, so derive once per process.
  if (!cachedKey) cachedKey = scryptSync(loadAuthConfig().sessionSecret, KEY_SALT, 32);
  return cachedKey;
}

export function seal(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

// Throws on a wrong key or tampered ciphertext (GCM authentication failure) —
// callers turn that into "re-enrol your authenticator", never into a silent
// "not enrolled", which would quietly drop a security factor.
export function open(sealed: string): string {
  const [ivB64, tagB64, dataB64] = sealed.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed sealed secret');
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
