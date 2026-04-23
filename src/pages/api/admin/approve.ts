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
  const returnStatus = (formData.get('status') as string) || 'pending';
  if (!id) return redirect(`/admin?status=${returnStatus}&error=missing_id`);

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

  // Geocode location
  let latitude: number | null = null;
  let longitude: number | null = null;
  let normalizedLocation = submission?.location || '';
  if (submission?.location) {
    try {
      // Normalize separators: "BD / Poland" → "BD, Poland"
      const cleanLocation = submission.location.replace(/\s*\/\s*/g, ', ').replace(/\s*-\s*/g, ', ');

      async function tryGeocode(query: string) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&accept-language=en`,
          { headers: { 'User-Agent': 'TRACKID-Gallery/1.0' } }
        );
        return res.json();
      }

      // Try original (cleaned), then parts separately if it fails
      let geoData = await tryGeocode(cleanLocation);
      if (!geoData?.[0] && cleanLocation.includes(',')) {
        // Try just the last part (country/region)
        const parts = cleanLocation.split(',').map((s: string) => s.trim());
        geoData = await tryGeocode(parts[parts.length - 1]);
      }

      if (geoData?.[0]) {
        latitude = parseFloat(geoData[0].lat);
        longitude = parseFloat(geoData[0].lon);
        // Build normalized "City, Country" in English
        const addr = geoData[0].address;
        const city = addr?.city || addr?.town || addr?.village || addr?.county || cleanLocation.split(',')[0].trim();
        const country = addr?.country;
        if (country) {
          normalizedLocation = `${city}, ${country}`;
        }
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
      location: normalizedLocation,
      ...(latitude !== null && { latitude }),
      ...(longitude !== null && { longitude }),
    })
    .eq('id', id);

  if (error) {
    console.error('Approve error:', error);
    return redirect(`/admin?status=${returnStatus}&error=approve_failed`);
  }

  const approved = submission;

  if (approved?.email) {
    sendApprovalEmail(approved.email, approved.rider_name, nextId).catch((err) =>
      console.error('Email error:', err)
    );
  }

  return redirect(`/admin?status=${returnStatus}`);
};
