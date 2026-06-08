import type { APIRoute } from 'astro';
import { getSessionFromCookie } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { generateRoute, arkConfigured } from '../../../lib/ark';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const secret = import.meta.env.ADMIN_SESSION_SECRET;
  if (!getSessionFromCookie(request.headers.get('cookie'), secret)) {
    return redirect('/admin/login');
  }

  if (!arkConfigured()) return redirect('/admin/routes?error=ark_unconfigured');

  const formData = await request.formData();
  const id = formData.get('id') as string;
  if (!id) return redirect('/admin/routes?error=missing_id');

  const { data: route } = await supabaseAdmin
    .from('routes')
    .select('city, country')
    .eq('id', id)
    .single();

  if (!route) return redirect('/admin/routes?error=not_found');

  try {
    const generated = await generateRoute(route.city, route.country || '');
    const { error } = await supabaseAdmin
      .from('routes')
      .update({
        name: generated.name,
        distance_km: generated.distance_km || null,
        difficulty: generated.difficulty,
        description: generated.description,
        waypoints: generated.waypoints,
        source: 'doubao-ai',
        status: 'draft', // regeneration resets to draft for re-review
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Regenerate route update error:', error);
      return redirect('/admin/routes?error=save_failed');
    }
  } catch (err) {
    console.error('Regenerate route error:', err);
    return redirect('/admin/routes?error=generate_failed');
  }

  return redirect('/admin/routes?regenerated=1');
};
