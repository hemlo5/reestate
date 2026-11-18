import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash?: string | null): Promise<boolean> {
  if (!storedHash || !password) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const derived = (await scrypt(password, salt, expectedBuf.length)) as Buffer;
    if (derived.length !== expectedBuf.length) return false;
    return timingSafeEqual(derived, expectedBuf);
  } catch {
    return false;
  }
}
