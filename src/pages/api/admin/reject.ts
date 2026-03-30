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
  if (!id) return redirect('/admin?error=missing_id');

  // Get photo path before rejecting (for cleanup)
  const { data: submission } = await supabaseAdmin
    .from('submissions')
    .select('photo_path')
    .eq('id', id)
    .single();

  const { error } = await supabaseAdmin
    .from('submissions')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Reject error:', error);
    return redirect('/admin?error=reject_failed');
  }

  // Clean up photo from storage
  if (submission?.photo_path) {
    await supabaseAdmin.storage.from('rider-photos').remove([submission.photo_path]);
  }

  return redirect('/admin');
};
