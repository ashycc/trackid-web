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
  const returnStatus = (formData.get('status') as string) || 'pending';
  if (!id) return redirect(`/admin?status=${returnStatus}&error=missing_id`);

  const { data: submission } = await supabaseAdmin
    .from('submissions')
    .select('photo_paths')
    .eq('id', id)
    .single();

  const { error } = await supabaseAdmin
    .from('submissions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    return redirect(`/admin?status=${returnStatus}&error=delete_failed`);
  }

  const paths = (submission?.photo_paths ?? []) as string[];
  if (paths.length > 0) {
    await supabaseAdmin.storage.from('rider-photos').remove(paths);
  }

  return redirect(`/admin?status=${returnStatus}`);
};
