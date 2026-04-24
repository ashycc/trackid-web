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
    .select('photo_paths, registry_id')
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

  // If the deleted post had a TKID, shift every larger registry_id down by 1
  // so the sequence stays contiguous. Must clear registry_id first to avoid
  // the UNIQUE constraint colliding with the next slot while rows shift.
  const deletedRid: number | null = submission?.registry_id ?? null;
  if (typeof deletedRid === 'number') {
    const { data: toShift, error: fetchErr } = await supabaseAdmin
      .from('submissions')
      .select('id, registry_id')
      .gt('registry_id', deletedRid)
      .order('registry_id', { ascending: true });

    if (fetchErr) {
      console.error('Renumber fetch error:', fetchErr);
    } else if (toShift && toShift.length > 0) {
      const ids = toShift.map((r) => r.id);
      const { error: clearErr } = await supabaseAdmin
        .from('submissions')
        .update({ registry_id: null })
        .in('id', ids);

      if (clearErr) {
        console.error('Renumber clear error:', clearErr);
      } else {
        for (const row of toShift) {
          const { error: shiftErr } = await supabaseAdmin
            .from('submissions')
            .update({ registry_id: row.registry_id - 1 })
            .eq('id', row.id);
          if (shiftErr) console.error('Renumber shift error:', shiftErr);
        }
      }
    }
  }

  const paths = (submission?.photo_paths ?? []) as string[];
  if (paths.length > 0) {
    await supabaseAdmin.storage.from('rider-photos').remove(paths);
  }

  return redirect(`/admin?status=${returnStatus}`);
};
