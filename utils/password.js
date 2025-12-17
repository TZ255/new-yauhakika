import crypto from 'crypto';

const PREFIX = 'scrypt';
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function timingSafeCompare(a, b) {
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function hashPassword(password = '') {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${PREFIX}:${salt}:${hash}`;
}

export function verifyPassword(password = '', stored = '') {
  if (!stored) return { valid: false, needsRehash: false };

  if (stored.startsWith(`${PREFIX}:`)) {
    const [, salt, hash] = stored.split(':');
    if (!salt || !hash) return { valid: false, needsRehash: false };
    try {
      const derived = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
      return { valid: timingSafeCompare(hash, derived), needsRehash: false };
    } catch (err) {
      return { valid: false, needsRehash: false };
    }
  }

  const valid = stored === password;
  return { valid, needsRehash: valid };
}
