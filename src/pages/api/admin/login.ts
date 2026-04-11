import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'crypto';
import { createSessionToken, SESSION_COOKIE } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const password = formData.get('password') as string;
  const captchaToken = (formData.get('h-captcha-response') as string)?.trim();
  const adminPassword = import.meta.env.ADMIN_PASSWORD;
  const sessionSecret = import.meta.env.ADMIN_SESSION_SECRET;
  const hcaptchaSecret = import.meta.env.HCAPTCHA_SECRET_KEY;

  if (!password || !adminPassword) {
    return redirect('/admin/login?error=1');
  }

  // Verify hCaptcha if configured
  if (hcaptchaSecret) {
    if (!captchaToken) {
      return redirect('/admin/login?error=1');
    }
    const verifyRes = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(hcaptchaSecret)}&response=${encodeURIComponent(captchaToken)}`,
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return redirect('/admin/login?error=1');
    }
  }

  // Constant-time password comparison
  const inputBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(adminPassword);
  const match = inputBuf.length === expectedBuf.length && timingSafeEqual(inputBuf, expectedBuf);

  if (!match) {
    return redirect('/admin/login?error=1');
  }

  const token = createSessionToken(sessionSecret);
  const headers = new Headers();
  headers.append('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
  headers.append('Location', '/admin');

  return new Response(null, { status: 302, headers });
};
