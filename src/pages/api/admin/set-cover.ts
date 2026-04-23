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
  const indexRaw = formData.get('index') as string;
  const returnStatus = (formData.get('status') as string) || 'pending';

  const index = Number.parseInt(indexRaw, 10);
  if (!id || Number.isNaN(index) || index < 0) {
    return redirect(`/admin?status=${returnStatus}&error=bad_cover`);
  }

  // Validate index against actual array length
  const { data: submission } = await supabaseAdmin
    .from('submissions')
    .select('photo_paths')
    .eq('id', id)
    .single();

  const paths = (submission?.photo_paths ?? []) as string[];
  if (index >= paths.length) {
    return redirect(`/admin?status=${returnStatus}&error=bad_cover`);
  }

  const { error } = await supabaseAdmin
    .from('submissions')
    .update({ cover_index: index })
    .eq('id', id);

  if (error) {
    console.error('Set cover error:', error);
    return redirect(`/admin?status=${returnStatus}&error=cover_failed`);
  }

  return redirect(`/admin?status=${returnStatus}`);
};
