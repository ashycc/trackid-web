import type { APIRoute } from 'astro';

// Same-origin proxy for OpenFreeMap. The browser cannot reach tiles.openfreemap.org
// from mainland China (and its /planet TileJSON 403s browser-origin requests via
// Cloudflare WAF), but our server can. Routing every map resource through this
// endpoint keeps the map working for those users while overseas visitors hit
// Vercel's edge cache — see public/vendor for the self-hosted maplibre-gl runtime.
export const prerender = false;

const ORIGIN = 'https://tiles.openfreemap.org';

// JSON manifests (TileJSON, sprite index) embed absolute upstream URLs for tiles,
// glyphs and sprites. Rewrite them to the proxy so the browser never goes direct.
const HOST_RE = /https:\/\/tiles\.openfreemap\.org\//g;

// Tile/glyph/sprite binaries live under date-versioned paths, so they're immutable.
// Manifests can change when the planet snapshot rotates, so cache them short with a
// long stale-while-revalidate — the edge keeps serving instantly while it refreshes.
const CACHE_BINARY = 'public, max-age=31536000, s-maxage=31536000, immutable';
const CACHE_MANIFEST = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

export const GET: APIRoute = async ({ params, request }) => {
  const path = params.path ?? '';
  const search = new URL(request.url).search;

  let upstream: Response;
  try {
    upstream = await fetch(`${ORIGIN}/${path}${search}`);
  } catch {
    return new Response('upstream fetch failed', { status: 502 });
  }
  if (!upstream.ok) {
    return new Response(null, { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const isJson = contentType.includes('json');

  const headers = new Headers({
    'content-type': contentType,
    'cache-control': isJson ? CACHE_MANIFEST : CACHE_BINARY,
    'access-control-allow-origin': '*',
  });

  if (isJson) {
    const text = await upstream.text();
    return new Response(text.replace(HOST_RE, '/api/tiles/'), { status: 200, headers });
  }
  return new Response(await upstream.arrayBuffer(), { status: 200, headers });
};
