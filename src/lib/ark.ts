// 火山方舟 (Volcengine Ark) — Doubao models, OpenAI-compatible chat completions API.
// Used for two things:
//   1. generateRoute()        — text model: invent a classic cycling route for a city
//   2. identifyCityFromImage() — vision model: guess the city a photo was taken in (fallback)
//
// Configured entirely via env so the model ids can change without code edits:
//   ARK_API_KEY, ARK_BASE_URL, ARK_TEXT_MODEL, ARK_VISION_MODEL

const ARK_API_KEY = import.meta.env.ARK_API_KEY;
const ARK_BASE_URL = import.meta.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const ARK_TEXT_MODEL = import.meta.env.ARK_TEXT_MODEL;
const ARK_VISION_MODEL = import.meta.env.ARK_VISION_MODEL;

export interface Waypoint {
  name: string;
  lat: number;
  lng: number;
}

export interface GeneratedRoute {
  name: string;
  distance_km: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  description: string;
  waypoints: Waypoint[];
}

export interface CityGuess {
  city: string;
  country: string;
  confidence: number; // 0..1
  reasoning: string;
}

export function arkConfigured(): boolean {
  return Boolean(ARK_API_KEY && ARK_TEXT_MODEL);
}

export function arkVisionConfigured(): boolean {
  return Boolean(ARK_API_KEY && ARK_VISION_MODEL);
}

interface ChatMessage {
  role: 'system' | 'user';
  content: unknown;
}

async function chat(model: string, messages: ChatMessage[]): Promise<string> {
  if (!ARK_API_KEY) throw new Error('ARK_API_KEY not configured');

  const res = await fetch(`${ARK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ark API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Ark API returned no content');
  return content;
}

// Parse a JSON object out of the model response, tolerating ```json fences.
function parseJson(raw: string): any {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

const ROUTE_SYSTEM = `You are a cycling local-knowledge guide for TRACKID, a steel-frame fixie brand.
Given a city, describe ONE classic road-cycling route that local riders actually ride —
a scenic or iconic loop/out-and-back, the kind a visiting cyclist would seek out.
Respond ONLY with a JSON object, no prose, in this exact shape:
{
  "name": string,            // short route name, English, e.g. "Route des Crêtes Loop"
  "distance_km": number,     // realistic total distance in km
  "difficulty": "easy" | "moderate" | "hard",
  "description": string,     // 1-2 sentences, plain confident TRACKID voice, English, no emoji
  "waypoints": [             // 3 to 6 ordered points the route passes through
    { "name": string, "lat": number, "lng": number }
  ]
}
Coordinates must be real decimal degrees for actual places in or near that city.
If you are not confident a real classic route exists there, pick the most plausible
scenic ride and keep coordinates near the city center.`;

export async function generateRoute(
  city: string,
  country: string,
  riderHint?: string | null
): Promise<GeneratedRoute> {
  const place = country ? `${city}, ${country}` : city;
  // A local rider's own recommendation is the strongest signal — prefer it when present.
  const userContent = riderHint
    ? `City: ${place}\nA local rider recommended this ride: "${riderHint}"\nIf it names a real route, build the route around it; otherwise use it as a strong hint.`
    : `City: ${place}`;
  const raw = await chat(ARK_TEXT_MODEL!, [
    { role: 'system', content: ROUTE_SYSTEM },
    { role: 'user', content: userContent },
  ]);
  const obj = parseJson(raw);

  const waypoints: Waypoint[] = Array.isArray(obj.waypoints)
    ? obj.waypoints
        .filter((w: any) => w && typeof w.lat === 'number' && typeof w.lng === 'number')
        .map((w: any) => ({ name: String(w.name || ''), lat: w.lat, lng: w.lng }))
    : [];

  const difficulty = ['easy', 'moderate', 'hard'].includes(obj.difficulty) ? obj.difficulty : 'moderate';

  return {
    name: String(obj.name || `${city} Classic`),
    distance_km: typeof obj.distance_km === 'number' ? Math.round(obj.distance_km * 10) / 10 : 0,
    difficulty,
    description: String(obj.description || ''),
    waypoints,
  };
}

const VISION_SYSTEM = `You identify where a photo was taken, for a cycling photo registry.
Look at the image (landmarks, architecture, signage, landscape, license plates) and
respond ONLY with a JSON object, no prose, in this exact shape:
{
  "city": string,        // best-guess city name in English, "" if unknown
  "country": string,     // best-guess country in English, "" if unknown
  "confidence": number,  // 0 to 1
  "reasoning": string    // one short sentence of evidence, English
}`;

export async function identifyCityFromImage(imageUrl: string): Promise<CityGuess> {
  const raw = await chat(ARK_VISION_MODEL!, [
    { role: 'system', content: VISION_SYSTEM },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Where was this photo taken?' },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ]);
  const obj = parseJson(raw);
  return {
    city: String(obj.city || ''),
    country: String(obj.country || ''),
    confidence: typeof obj.confidence === 'number' ? obj.confidence : 0,
    reasoning: String(obj.reasoning || ''),
  };
}
