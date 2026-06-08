import type { APIRoute } from 'astro';
import { getSessionFromCookie } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { identifyCityFromImage, arkVisionConfigured } from '../../../lib/ark';

export const prerender = false;

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Vision fallback: look at a submission's cover photo and guess where it was taken.
// Called via fetch from the admin dashboard so an admin can verify/correct the
// rider-typed location before approving. JSON in, JSON out.
export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.ADMIN_SESSION_SECRET;
  if (!getSessionFromCookie(request.headers.get('cookie'), secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  if (!arkVisionConfigured()) {
    return json({ error: 'Vision model not configured (ARK_VISION_MODEL).' }, 400);
  }

  let id: string | undefined;
  try {
    ({ id } = await request.json());
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  if (!id) return json({ error: 'missing_id' }, 400);

  const { data: submission } = await supabaseAdmin
    .from('submissions')
    .select('photo_paths, cover_index')
    .eq('id', id)
    .single();

  const paths: string[] = Array.isArray(submission?.photo_paths) ? submission!.photo_paths : [];
  if (paths.length === 0) return json({ error: 'no_photos' }, 400);

  const idx =
    typeof submission?.cover_index === 'number' && submission.cover_index < paths.length
      ? submission.cover_index
      : 0;

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const imageUrl = `${supabaseUrl}/storage/v1/object/public/rider-photos/${paths[idx]}`;

  try {
    const guess = await identifyCityFromImage(imageUrl);
    return json({ success: true, guess }, 200);
  } catch (err) {
    console.error('identify-city error:', err);
    return json({ error: 'identify_failed' }, 500);
  }
};
