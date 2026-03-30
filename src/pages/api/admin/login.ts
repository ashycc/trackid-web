import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'crypto';
import { createSessionToken, SESSION_COOKIE } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const password = formData.get('password') as string;
  const adminPassword = import.meta.env.ADMIN_PASSWORD;
  const sessionSecret = import.meta.env.ADMIN_SESSION_SECRET;

  if (!password || !adminPassword) {
    return redirect('/admin/login?error=1');
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
