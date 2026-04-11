/**
 * Send invite emails to AliExpress duck sticker customers.
 *
 * Usage:
 *   node scripts/send-invite.mjs                  # dry run (preview only)
 *   node scripts/send-invite.mjs --send            # actually send
 *   node scripts/send-invite.mjs --send --delay 3  # 3s between emails
 */

import { readFileSync } from 'fs';
import { Resend } from 'resend';

// Load .env manually (no dotenv dependency)
const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || 'TRACKID <noreply@trackid.cc>';
const CSV_PATH = process.argv.find(a => a.endsWith('.csv')) || '/Users/cc/Downloads/duck-sticker-customers.csv';
const DRY_RUN = !process.argv.includes('--send');
const DELAY_S = (() => {
  const i = process.argv.indexOf('--delay');
  return i > -1 ? Number(process.argv[i + 1]) || 2 : 2;
})();

// ---------- Parse CSV ----------
function parseCSV(path) {
  const lines = readFileSync(path, 'utf-8').trim().split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Handle quoted fields
    const parts = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { parts.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    parts.push(current.trim());
    const [name, email, country] = parts;
    if (email && email.includes('@')) rows.push({ name, email, country });
  }
  return rows;
}

// ---------- Email HTML ----------
function buildEmail(name) {
  const firstName = name.split(/[\s　]+/)[0];
  return `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 24px; background: #ECE6DD; color: #0D0D0D;">
  <div style="font-size: 18px; font-weight: 700; letter-spacing: 4px; margin-bottom: 32px;">TRACKID</div>

  <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #7A4A2E; margin-bottom: 8px;">RIDER INVITATION</div>

  <p style="font-size: 14px; line-height: 1.7; margin-bottom: 20px; color: #0D0D0D;">
    Hey ${firstName} — you bought a TRACKID Roast Duck sticker a while back. The one that's basically a Beijing roast duck doing the Columbus dove pose. You either got the reference or just thought a duck on a fixie was funny. Either way, respect.
  </p>

  <p style="font-size: 14px; line-height: 1.7; margin-bottom: 20px; color: #0D0D0D;">
    Turns out you're not alone. That sticker has shipped to dozens of countries now — London, Tokyo, São Paulo, Melbourne, places we can't even pronounce. Zero marketing budget. Just a duck that won't stay put.
  </p>

  <p style="font-size: 14px; line-height: 1.7; margin-bottom: 20px; color: #0D0D0D;">
    So we built a thing: <a href="https://trackidriders.com" style="color: #D4213D; text-decoration: underline;">trackidriders.com</a>
  </p>

  <p style="font-size: 14px; line-height: 1.7; margin-bottom: 20px; color: #0D0D0D;">
    It's a registry of every rider who's slapped the duck on their frame, helmet, toolbox, whatever. A global map of everywhere this duck has landed. And there's a hole in it where your city should be.
  </p>

  <p style="font-size: 14px; line-height: 1.7; margin-bottom: 24px; color: #0D0D0D;">
    Snap a photo. Upload it — takes 30 seconds. Blurry is fine. Dirty is better.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://trackidriders.com/upload" style="display: inline-block; background: #D4213D; color: #ffffff; padding: 14px 32px; font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; text-decoration: none;">
      UPLOAD YOUR DUCK
    </a>
  </div>

  <p style="font-size: 14px; line-height: 1.7; margin-bottom: 8px; color: #0D0D0D;">
    Welcome to the flock.
  </p>
  <p style="font-size: 14px; font-weight: 700; letter-spacing: 2px; margin-bottom: 0; color: #0D0D0D;">
    TRACKID
  </p>

  <div style="border-top: 1px solid #D5CFC5; margin-top: 32px; padding-top: 16px;">
    <div style="font-size: 11px; color: #8A8279; letter-spacing: 1px; text-transform: uppercase;">
      &copy; 2026 TRACKID Registry &middot; Beijing
    </div>
    <div style="font-size: 10px; color: #B8A88A; margin-top: 8px;">
      You received this because you purchased a TRACKID sticker. One-time invite, no spam.
    </div>
    <div style="font-size: 10px; color: #B8A88A; margin-top: 4px;">
      Questions? <a href="mailto:trackid_bj@126.com" style="color: #B8A88A;">trackid_bj@126.com</a>
    </div>
  </div>
</div>`;
}

// ---------- Main ----------
async function main() {
  const customers = parseCSV(CSV_PATH);
  console.log(`\n📋 ${customers.length} customers loaded from CSV\n`);

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no emails will be sent. Use --send to send.\n');
    customers.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} <${c.email}> — ${c.country}`);
    });
    console.log(`\n📧 Subject: "Your TRACKID duck — show us where it landed"`);
    console.log(`📤 From: ${FROM}`);
    console.log(`⏱  Delay: ${DELAY_S}s between emails`);
    console.log(`\nRun with --send to send all ${customers.length} emails.\n`);
    return;
  }

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not set in .env');
    process.exit(1);
  }

  const resend = new Resend(RESEND_API_KEY);
  let sent = 0;
  let failed = 0;

  for (const c of customers) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        replyTo: 'trackid_bj@126.com',
        to: c.email,
        subject: 'Your TRACKID duck — show us where it landed',
        html: buildEmail(c.name),
      });

      if (error) {
        console.log(`  ❌ ${c.email} — ${error.message}`);
        failed++;
      } else {
        console.log(`  ✅ ${c.email} — ${data.id}`);
        sent++;
      }
    } catch (err) {
      console.log(`  ❌ ${c.email} — ${err.message}`);
      failed++;
    }

    // Rate limiting
    if (customers.indexOf(c) < customers.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_S * 1000));
    }
  }

  console.log(`\n📊 Done: ${sent} sent, ${failed} failed, ${customers.length} total\n`);
}

main();
