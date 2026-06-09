import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = new Set(['route', 'rider_route']);

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Toggle a visitor's like on any likeable target (a city route or a rider's own
// route pick). The DB function dedups (one like per visitor per target) and keeps
// the target table's like_count in sync atomically.
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const targetType = typeof body?.target_type === 'string' ? body.target_type : '';
  const targetId = typeof body?.target_id === 'string' ? body.target_id : '';
  const visitorId = typeof body?.visitor_id === 'string' ? body.visitor_id.slice(0, 64) : '';
  if (!TYPES.has(targetType)) return json({ error: 'bad_target_type' }, 400);
  if (!UUID_RE.test(targetId)) return json({ error: 'bad_target_id' }, 400);
  if (visitorId.length < 8) return json({ error: 'bad_visitor_id' }, 400);

  const { data, error } = await supabaseAdmin.rpc('toggle_like', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_visitor_id: visitorId,
  });

  if (error) {
    console.error('toggle_like error:', error);
    return json({ error: 'server_error' }, 500);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return json({ liked: !!row?.liked, count: row?.like_count ?? 0 }, 200);
};
