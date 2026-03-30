import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_COOKIE = 'trackid_admin';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function createSessionToken(secret: string): string {
  const expires = Date.now() + SESSION_TTL;
  const payload = `admin:${expires}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

export function validateSessionToken(token: string, secret: string): boolean {
  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [role, expiresStr, sig] = parts;
  const payload = `${role}:${expiresStr}`;
  const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');

  // Constant-time comparison
  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false;
  } catch {
    return false;
  }

  // Check expiry
  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires) || Date.now() > expires) return false;

  return true;
}

export function getSessionFromCookie(cookieHeader: string | null, secret: string): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return false;
  return validateSessionToken(decodeURIComponent(match[1]), secret);
}

export { SESSION_COOKIE };
