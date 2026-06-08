import type { APIRoute } from 'astro';
import { getSessionFromCookie } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const secret = import.meta.env.ADMIN_SESSION_SECRET;
  if (!getSessionFromCookie(request.headers.get('cookie'), secret)) {
    return redirect('/admin/login');
  }

  const formData = await request.formData();
  const id = formData.get('id') as string;
  if (!id) return redirect('/admin/routes?error=missing_id');

  const { error } = await supabaseAdmin.from('routes').delete().eq('id', id);
  if (error) {
    console.error('Delete route error:', error);
    return redirect('/admin/routes?error=delete_failed');
  }

  return redirect('/admin/routes?deleted=1');
};
