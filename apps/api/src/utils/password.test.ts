import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('hashes a plaintext into an argon2 string', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('verifies the original plaintext against its hash', async () => {
    const hash = await hashPassword('orvexa');
    await expect(verifyPassword(hash, 'orvexa')).resolves.toBe(true);
  });

  it('rejects a wrong plaintext', async () => {
    const hash = await hashPassword('orvexa');
    await expect(verifyPassword(hash, 'tableflo')).resolves.toBe(false);
  });

  it('produces a different hash each call (random salt)', async () => {
    const a = await hashPassword('same-input');
    const b = await hashPassword('same-input');
    expect(a).not.toBe(b);
  });
});
