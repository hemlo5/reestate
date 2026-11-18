import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password';
import { sanitizeUser, signSessionToken, verifySessionToken } from './session';
import { checkRateLimit } from './rate-limit';
import type { StoredUser } from '@/lib/db/types';

test('hashPassword and verifyPassword verify valid secrets and reject invalid ones', async () => {
  const hash = await hashPassword('housed123');
  assert.ok(hash.includes(':'));
  assert.equal(await verifyPassword('housed123', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
  assert.equal(await verifyPassword('', hash), false);
  assert.equal(await verifyPassword('housed123', 'corrupted-hash'), false);
});

test('signSessionToken and verifySessionToken detect tampering', () => {
  const token = signSessionToken('sess-abc', 'user-123');
  const verified = verifySessionToken(token);
  assert.deepEqual(verified, { sessionId: 'sess-abc', userId: 'user-123' });

  const tampered = token.replace('user-123', 'user-999');
  assert.equal(verifySessionToken(tampered), null);
  assert.equal(verifySessionToken('invalid'), null);
  assert.equal(verifySessionToken(undefined), null);
});

test('sanitizeUser strips passwordHash and sensitive govtIdFileData blobs', () => {
  const stored: StoredUser = {
    id: 'broker-x',
    name: 'Test Broker',
    email: 'broker@test.in',
    phone: '+91 90000 00000',
    role: 'broker',
    city: 'Bengaluru',
    passwordHash: 'salt:secret-hash',
    brokerProfile: {
      phone: '+91 90000 00000',
      operatingLocalities: ['Koramangala'],
      propertyCategories: ['Flat'],
      yearsExperience: 4,
      verified: false,
      closedDealsCount: 0,
      verificationDocs: {
        govtIdType: 'PAN Card',
        govtIdNumber: 'ABCDE1234F',
        govtIdFileKey: 'verification/doc.pdf',
        govtIdFileData: 'data:application/pdf;base64,SENSITIVE',
      },
    },
  };

  const safe = sanitizeUser(stored) as StoredUser;
  assert.equal(safe.passwordHash, undefined);
  assert.equal(safe.brokerProfile?.verificationDocs?.govtIdFileData, undefined);
  assert.equal(safe.brokerProfile?.verificationDocs?.govtIdFileKey, 'verification/doc.pdf');
});

test('checkRateLimit enforces window ceiling and tracks remaining quota', () => {
  const key = `test-rl-${Date.now()}`;
  const r1 = checkRateLimit(key, 2, 60_000);
  const r2 = checkRateLimit(key, 2, 60_000);
  const r3 = checkRateLimit(key, 2, 60_000);

  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 1);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 0);
  assert.equal(r3.allowed, false);
  assert.ok(r3.retryAfterSec >= 1);
});
