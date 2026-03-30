import type { APIRoute } from 'astro';
import { getSessionFromCookie } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { sendApprovalEmail } from '../../../lib/resend';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const secret = import.meta.env.ADMIN_SESSION_SECRET;
  if (!getSessionFromCookie(request.headers.get('cookie'), secret)) {
    return redirect('/admin/login');
  }

  const formData = await request.formData();
  const id = formData.get('id') as string;
  if (!id) return redirect('/admin?error=missing_id');

  // Get next TKID number (MAX + 1, safe for single-admin)
  const { data: maxData } = await supabaseAdmin
    .from('submissions')
    .select('registry_id')
    .not('registry_id', 'is', null)
    .order('registry_id', { ascending: false })
    .limit(1);

  const nextId = (maxData?.[0]?.registry_id ?? 0) + 1;

  // Get submission details before updating
  const { data: submission } = await supabaseAdmin
    .from('submissions')
    .select('location, email, rider_name')
    .eq('id', id)
    .single();

  // Geocode location (fire-and-forget, non-blocking)
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (submission?.location) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(submission.location)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'TRACKID-Gallery/1.0' } }
      );
      const geoData = await geoRes.json();
      if (geoData?.[0]) {
        latitude = parseFloat(geoData[0].lat);
        longitude = parseFloat(geoData[0].lon);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  }

  const { error } = await supabaseAdmin
    .from('submissions')
    .update({
      status: 'approved',
      registry_id: nextId,
      reviewed_at: new Date().toISOString(),
      ...(latitude !== null && { latitude }),
      ...(longitude !== null && { longitude }),
    })
    .eq('id', id);

  if (error) {
    console.error('Approve error:', error);
    return redirect('/admin?error=approve_failed');
  }

  const approved = submission;

  if (approved?.email) {
    sendApprovalEmail(approved.email, approved.rider_name, nextId).catch((err) =>
      console.error('Email error:', err)
    );
  }

  return redirect('/admin');
};
