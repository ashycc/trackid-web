import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async () => {
  const headers = new Headers();
  headers.append('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  headers.append('Location', '/admin/login');
  return new Response(null, { status: 302, headers });
};
