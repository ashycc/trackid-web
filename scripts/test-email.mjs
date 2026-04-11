import { Resend } from 'resend';
import { readFileSync } from 'fs';

// Load .env manually
const env = Object.fromEntries(
  readFileSync('.env', 'utf-8').split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('=');
    return [l.slice(0, i), l.slice(i + 1)];
  })
);
Object.assign(process.env, env);

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || 'TRACKID <noreply@trackidriders.com>';
const tkid = 'TKID-0006';
const riderName = 'T2';

const { data, error } = await resend.emails.send({
  from: fromEmail,
  to: 'kisuke.luna@gmail.com',
  subject: `Your ride is in the TRACKID REGISTRY — ${tkid}`,
  html: `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 24px; background: #ECE6DD; color: #0D0D0D;">
      <div style="font-size: 18px; font-weight: 700; letter-spacing: 4px; margin-bottom: 32px;">TRACKID</div>
      <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #7A4A2E; margin-bottom: 8px;">REGISTRY CONFIRMATION</div>
      <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 2px; line-height: 1.2; margin: 0 0 24px;">Your Ride<br/>Is Live</h1>
      <p style="font-size: 14px; line-height: 1.7; margin-bottom: 24px;">
        Hey ${riderName}, your photo has been approved and added to the TRACKID Rider Registry.
      </p>
      <div style="background: #E3DCD2; padding: 16px; margin-bottom: 24px; border-left: 3px solid #D4213D;">
        <div style="font-family: monospace; font-size: 11px; color: #D4213D; letter-spacing: 1px;">${tkid}</div>
        <div style="font-size: 13px; font-weight: 500; margin-top: 4px;">${riderName}</div>
      </div>
      <a href="https://trackidriders.com" style="display: inline-block; background: #D4213D; color: #fff; padding: 10px 24px; font-family: monospace; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; text-decoration: none;">View The Flock</a>
      <div style="font-size: 11px; color: #8A8279; letter-spacing: 1px; text-transform: uppercase; margin-top: 32px;">
        &copy; 2026 TRACKID Registry
      </div>
    </div>
  `,
});

if (error) {
  console.error('Failed:', error);
} else {
  console.log('Sent! ID:', data.id);
}
