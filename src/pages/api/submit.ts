import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { sendNewSubmissionNotification } from '../../lib/resend';
import { randomUUID } from 'crypto';

export const prerender = false;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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
    const photo = formData.get('photo') as File | null;
    const riderName = (formData.get('rider_name') as string)?.trim();
    const location = (formData.get('location') as string)?.trim();
    const email = (formData.get('email') as string)?.trim() || null;
    const message = (formData.get('message') as string)?.trim() || null;
    const captchaToken = (formData.get('h-captcha-response') as string)?.trim();

    // Validate required fields
    if (!photo || !riderName || !location) {
      return json({ error: 'Photo, name, and location are required.' }, 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(photo.type)) {
      return json({ error: 'Only JPEG, PNG, and WebP images are accepted.' }, 400);
    }

    // Validate file size
    if (photo.size > MAX_FILE_SIZE) {
      return json({ error: 'File too large. Maximum size is 10MB.' }, 400);
    }

    // hCaptcha verification or rate limit fallback
    const hcaptchaSecret = import.meta.env.HCAPTCHA_SECRET_KEY;
    if (hcaptchaSecret && captchaToken) {
      // Verify hCaptcha token
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
      // Fallback: IP rate limiting
      const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
      if (!checkRateLimit(ip)) {
        return json({ error: 'Too many uploads. Please try again later.' }, 429);
      }
    }

    // Upload photo to Supabase Storage
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
      return json({ error: 'Failed to upload photo.' }, 500);
    }

    // Insert submission record
    const { error: dbError } = await supabaseAdmin
      .from('submissions')
      .insert({
        rider_name: riderName,
        location,
        email,
        message,
        photo_path: fileName,
        status: 'pending',
      });

    if (dbError) {
      console.error('DB error:', dbError);
      await supabaseAdmin.storage.from('rider-photos').remove([fileName]);
      return json({ error: 'Failed to save submission.' }, 500);
    }

    // Notify admin (non-blocking)
    sendNewSubmissionNotification(riderName, location, message).catch(err =>
      console.error('Admin notification error:', err)
    );

    return json({ success: true }, 200);
  } catch (err) {
    console.error('Submit error:', err);
    return json({ error: 'Internal server error.' }, 500);
  }
};
