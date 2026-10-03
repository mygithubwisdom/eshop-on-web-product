import 'server-only';
import nodemailer from 'nodemailer';
import { randomUUID } from 'node:crypto';
import { transact } from './database';
import { isDemo, contactEmail } from './config';
export async function deliverEmail(reference) {
  if (isDemo() || !process.env.SMTP_HOST) return;
  const claim = randomUUID();
  const job = await transact(state => {
    const job = state.email_jobs[reference];
    if (!job || job.status !== 'pending' || (job.claimedAt && Date.now() - job.claimedAt < 300000)) return null;
    job.claimedAt = Date.now(); job.claim = claim;
    return { ...job };
  });
  if (!job) return;
  try {
    const port = Number(process.env.SMTP_PORT || 587);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    await transport.sendMail({ from: process.env.EMAIL_FROM || `Naija Boy Apparel <${contactEmail()}>`,
      to: job.to, replyTo: contactEmail(), subject: 'Your Naija Boy Apparel order', text: job.body });
    await transact(state => { if (state.email_jobs[reference].claim === claim) state.email_jobs[reference].status = 'sent'; });
  } catch {
    // Payment stays paid even if SMTP is unavailable. A later verification can retry.
    await transact(state => { if (state.email_jobs[reference]?.claim === claim) delete state.email_jobs[reference].claimedAt; });
  }
}
