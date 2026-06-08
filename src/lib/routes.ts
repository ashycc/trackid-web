import { supabaseAdmin } from './supabase';
import { generateRoute, arkConfigured, type Waypoint } from './ark';

export interface RouteRow {
  id: string;
  city_key: string;
  city: string;
  country: string | null;
  lat: number | null;
  lng: number | null;
  name: string | null;
  distance_km: number | null;
  difficulty: string | null;
  description: string | null;
  waypoints: Waypoint[];
  source: string;
  status: 'draft' | 'published';
}

// Split a "City, Country" location string into parts.
export function splitLocation(location: string): { city: string; country: string } {
  const parts = location.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { city: location.trim(), country: '' };
  if (parts.length === 1) return { city: parts[0], country: '' };
  return { city: parts[0], country: parts[parts.length - 1] };
}

// Stable dedup key so all riders in the same city share one route.
export function cityKey(location: string): string {
  const { city, country } = splitLocation(location);
  return [city, country].filter(Boolean).join(', ').toLowerCase();
}

// Google Maps cycling directions through the route's waypoints (opens a real
// road-following route the user can ride) — matches how riders already share rides.
export function googleMapsRouteUrl(waypoints: Waypoint[]): string {
  if (waypoints.length < 2) return '';
  const pt = (w: Waypoint) => `${w.lat},${w.lng}`;
  const origin = pt(waypoints[0]);
  const destination = pt(waypoints[waypoints.length - 1]);
  const mid = waypoints.slice(1, -1).map(pt).join('|');
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'bicycling',
    origin,
    destination,
  });
  if (mid) params.set('waypoints', mid);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Amap (高德) cycling navigation. Google Maps has no usable cycling data in mainland
// China, so China routes use Amap instead. Amap's URI API accepts WGS-84 directly via
// coordinate=wgs84 (no GCJ-02 conversion needed) but takes only from/to, not via points —
// for loops (start≈end) we pick the farthest waypoint as the destination so it isn't degenerate.
export function amapRouteUrl(waypoints: Waypoint[]): string {
  if (waypoints.length < 2) return '';
  const from = waypoints[0];
  let to = waypoints[waypoints.length - 1];
  const isLoop = Math.abs(to.lat - from.lat) < 1e-4 && Math.abs(to.lng - from.lng) < 1e-4;
  if (isLoop) {
    let bestD = 0;
    for (const w of waypoints) {
      const d = (w.lat - from.lat) ** 2 + (w.lng - from.lng) ** 2;
      if (d > bestD) { bestD = d; to = w; }
    }
  }
  const leg = (w: Waypoint, fallback: string) =>
    `${w.lng},${w.lat},${encodeURIComponent(w.name || fallback)}`;
  const params = 'mode=ride&policy=1&src=trackid&coordinate=wgs84&callnative=1';
  return `https://uri.amap.com/navigation?from=${leg(from, '起点')}&to=${leg(to, '终点')}&${params}`;
}

const CHINA_COUNTRIES = new Set(['china', '中国', '中国大陆', "people's republic of china"]);

export function isChinaRoute(country: string | null | undefined): boolean {
  return !!country && CHINA_COUNTRIES.has(country.trim().toLowerCase());
}

// Pick the right map provider by route location: Amap for mainland China, Google elsewhere.
export function routeNavUrl(
  country: string | null | undefined,
  waypoints: Waypoint[]
): { url: string; provider: 'amap' | 'google' } {
  if (isChinaRoute(country)) return { url: amapRouteUrl(waypoints), provider: 'amap' };
  return { url: googleMapsRouteUrl(waypoints), provider: 'google' };
}

// Look up an existing route by city.
export async function getRouteByLocation(location: string): Promise<RouteRow | null> {
  const key = cityKey(location);
  if (!key) return null;
  const { data } = await supabaseAdmin.from('routes').select('*').eq('city_key', key).maybeSingle();
  return (data as RouteRow) ?? null;
}

// Generate (via Doubao) and store a draft route for a city if one doesn't exist yet.
// Returns the existing or newly-created row, or null if generation is unavailable/failed.
// Never throws — callers (approval flow) should not break if route generation fails.
export async function ensureRouteForLocation(
  location: string,
  lat: number | null,
  lng: number | null,
  riderHint?: string | null
): Promise<RouteRow | null> {
  const key = cityKey(location);
  if (!key) return null;

  const existing = await getRouteByLocation(location);
  if (existing) return existing;

  if (!arkConfigured()) return null;

  const { city, country } = splitLocation(location);
  try {
    const route = await generateRoute(city, country, riderHint);
    const { data, error } = await supabaseAdmin
      .from('routes')
      .upsert(
        {
          city_key: key,
          city,
          country: country || null,
          lat,
          lng,
          name: route.name,
          distance_km: route.distance_km || null,
          difficulty: route.difficulty,
          description: route.description,
          waypoints: route.waypoints,
          source: 'doubao-ai',
          status: 'draft',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'city_key' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('ensureRouteForLocation upsert error:', error);
      return null;
    }
    return data as RouteRow;
  } catch (err) {
    console.error('ensureRouteForLocation generate error:', err);
    return null;
  }
}
