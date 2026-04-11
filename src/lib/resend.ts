import { Resend } from 'resend';

const apiKey = import.meta.env.RESEND_API_KEY;
const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'TRACKID <noreply@trackid.cc>';

export const resend = apiKey ? new Resend(apiKey) : null;

const ADMIN_EMAIL = 'trackid_bj@126.com';

export async function sendNewSubmissionNotification(
  riderName: string,
  location: string,
  message: string | null,
) {
  if (!resend) {
    console.log('[email] Resend not configured, skipping admin notification');
    return;
  }

  await resend.emails.send({
    from: fromEmail,
    to: ADMIN_EMAIL,
    subject: `New duck submission — ${riderName} from ${location}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 24px; background: #ECE6DD; color: #0D0D0D;">
        <div style="font-size: 18px; font-weight: 700; letter-spacing: 4px; margin-bottom: 32px;">TRACKID</div>
        <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #7A4A2E; margin-bottom: 8px;">NEW SUBMISSION</div>
        <h1 style="font-size: 28px; font-weight: 700; letter-spacing: 2px; line-height: 1.2; margin: 0 0 24px;">New Duck<br/>Incoming</h1>
        <div style="background: #E3DCD2; padding: 16px; margin-bottom: 24px; border-left: 3px solid #D4213D;">
          <div style="font-size: 14px; font-weight: 500;">${riderName}</div>
          <div style="font-family: monospace; font-size: 12px; color: #8A8279; margin-top: 4px;">${location}</div>
          ${message ? `<div style="font-size: 13px; margin-top: 8px; color: #0D0D0D; line-height: 1.5;">"${message}"</div>` : ''}
        </div>
        <a href="https://trackidriders.com/admin" style="display: inline-block; background: #D4213D; color: #fff; padding: 10px 24px; font-family: monospace; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; text-decoration: none;">Review Now</a>
        <div style="font-size: 11px; color: #8A8279; letter-spacing: 1px; text-transform: uppercase; margin-top: 32px;">
          &copy; ${new Date().getFullYear()} TRACKID Registry
        </div>
      </div>
    `,
  });
}

export async function sendApprovalEmail(
  to: string,
  riderName: string,
  registryId: number,
) {
  if (!resend) {
    console.log('[email] Resend not configured, skipping email to', to);
    return;
  }

  const tkid = `TKID-${String(registryId).padStart(4, '0')}`;

  await resend.emails.send({
    from: fromEmail,
    to,
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
          &copy; ${new Date().getFullYear()} TRACKID Registry
        </div>
      </div>
    `,
  });
}
