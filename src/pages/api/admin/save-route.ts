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

  const name = (formData.get('name') as string)?.trim() || null;
  const distanceRaw = (formData.get('distance_km') as string)?.trim();
  const distance_km = distanceRaw ? parseFloat(distanceRaw) : null;
  const difficultyRaw = (formData.get('difficulty') as string)?.trim();
  const difficulty = ['easy', 'moderate', 'hard'].includes(difficultyRaw) ? difficultyRaw : null;
  const description = (formData.get('description') as string)?.trim() || null;
  const statusRaw = (formData.get('status') as string)?.trim();
  const status = statusRaw === 'published' ? 'published' : 'draft';

  // waypoints arrives as a JSON string from the textarea; validate before saving.
  let waypoints: unknown = undefined;
  const wpRaw = (formData.get('waypoints') as string)?.trim();
  if (wpRaw) {
    try {
      const parsed = JSON.parse(wpRaw);
      if (
        Array.isArray(parsed) &&
        parsed.every((w) => w && typeof w.lat === 'number' && typeof w.lng === 'number')
      ) {
        waypoints = parsed;
      } else {
        return redirect('/admin/routes?error=bad_waypoints');
      }
    } catch {
      return redirect('/admin/routes?error=bad_waypoints');
    }
  }

  const { error } = await supabaseAdmin
    .from('routes')
    .update({
      name,
      distance_km: Number.isFinite(distance_km) ? distance_km : null,
      difficulty,
      description,
      status,
      ...(waypoints !== undefined && { waypoints }),
      source: 'manual',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Save route error:', error);
    return redirect('/admin/routes?error=save_failed');
  }

  return redirect('/admin/routes?saved=1');
};
