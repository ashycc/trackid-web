import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { sendNewSubmissionNotification } from '../../lib/resend';
import { randomUUID } from 'crypto';

export const prerender = false;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_PHOTOS = 3;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// IP rate limiting fallback (when hCaptcha is unavailable)
const RATE_LIMIT = 5; // uploads per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour
const ipLog = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipLog.get(ip) || []).filter((t) => now - t < RATE_WINDOW);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  ipLog.set(ip, timestamps);
  return true;
}

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const formData = await request.formData();
    // Accept new `photos` field; fall back to legacy `photo` for safety.
    const rawPhotos = [
      ...formData.getAll('photos'),
      ...formData.getAll('photo'),
    ].filter((v): v is File => v instanceof File && v.size > 0);

    const riderName = (formData.get('rider_name') as string)?.trim();
    const location = (formData.get('location') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const message = (formData.get('message') as string)?.trim() || null;
    const captchaToken = (formData.get('h-captcha-response') as string)?.trim();

    if (rawPhotos.length === 0 || !riderName || !location || !email) {
      return json({ error: 'Photo, name, location, and email are required.' }, 400);
    }

    if (rawPhotos.length > MAX_PHOTOS) {
      return json({ error: `Maximum ${MAX_PHOTOS} photos per submission.` }, 400);
    }

    for (const photo of rawPhotos) {
      if (!ALLOWED_TYPES.includes(photo.type)) {
        return json({ error: 'Only JPEG, PNG, and WebP images are accepted.' }, 400);
      }
      if (photo.size > MAX_FILE_SIZE) {
        return json({ error: 'File too large. Maximum size is 10MB per photo.' }, 400);
      }
    }

    // hCaptcha verification (mandatory when configured) or rate limit fallback
    const hcaptchaSecret = import.meta.env.HCAPTCHA_SECRET_KEY;
    if (hcaptchaSecret) {
      if (!captchaToken) {
        return json({ error: 'Captcha verification required.' }, 400);
      }
      const verifyRes = await fetch('https://api.hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(hcaptchaSecret)}&response=${encodeURIComponent(captchaToken)}`,
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return json({ error: 'Captcha verification failed. Please try again.' }, 400);
      }
    } else {
      const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
      if (!checkRateLimit(ip)) {
        return json({ error: 'Too many uploads. Please try again later.' }, 429);
      }
    }

    // Upload each photo; track success so we can roll back on failure.
    const uploadedPaths: string[] = [];
    for (const photo of rawPhotos) {
      const ext = EXT_MAP[photo.type] || 'jpg';
      const fileName = `uploads/${randomUUID()}.${ext}`;
      const arrayBuffer = await photo.arrayBuffer();
      const { error: uploadError } = await supabaseAdmin.storage
        .from('rider-photos')
        .upload(fileName, arrayBuffer, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadedPaths.length > 0) {
          await supabaseAdmin.storage.from('rider-photos').remove(uploadedPaths);
        }
        return json({ error: 'Failed to upload photo.' }, 500);
      }
      uploadedPaths.push(fileName);
    }

    const { error: dbError } = await supabaseAdmin
      .from('submissions')
      .insert({
        rider_name: riderName,
        location,
        email,
        message,
        photo_paths: uploadedPaths,
        cover_index: 0,
        status: 'pending',
      });

    if (dbError) {
      console.error('DB error:', dbError);
      await supabaseAdmin.storage.from('rider-photos').remove(uploadedPaths);
      return json({ error: 'Failed to save submission.' }, 500);
    }

    try {
      await sendNewSubmissionNotification(riderName, location, message);
    } catch (err) {
      console.error('Admin notification error:', err);
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error('Submit error:', err);
    return json({ error: 'Internal server error.' }, 500);
  }
};
