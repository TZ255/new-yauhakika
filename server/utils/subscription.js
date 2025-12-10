import User from '../models/user.js';
import { sendEmail } from './sendEmail.js';

const DAYS_7 = 1000 * 60 * 60 * 24 * 7;
const TZ = 'Africa/Nairobi';

function formatDateTime(date) {
  return date.toLocaleString('sv-SE', { timeZone: TZ });
}

export async function confirmWeeklySubscription(email) {
  if (!email) return null;
  const user = await User.findOne({ email });
  if (!user) return null;

  const now = new Date();
  const currentExpiry = user.payment?.expiresAt ? new Date(user.payment.expiresAt) : null;
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(base.getTime() + DAYS_7);

  user.isPaid = true;
  user.payment = {
    paidOn: now,
    expiresAt,
  };

  await user.save();

  // Notify the user that VIP access is active
  const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');
  const vipUrl = siteUrl ? `${siteUrl}/vip` : '/vip';
  const subject = 'Malipo ya VIP yamethibitishwa - Mikeka ya Uhakika';
  const html = `
    <p>Habari ${user.name || 'rafiki'},</p>
    <p>Ulipiaji wako wa wiki umethibitishwa. Akaunti yako ya VIP imewezeshwa mara moja.</p>
    <p>
      <strong>Umelipa:</strong> ${formatDateTime(now)}<br />
      <strong>Inaisha:</strong> ${formatDateTime(expiresAt)}
    </p>
    <p>Ingia hapa kuona mikeka ya VIP: <a href="${vipUrl}">${vipUrl}</a></p>
    <p>Asante kwa kuchagua Mikeka ya Uhakika. Ushindi mwema!</p>
  `;

  try {
    await sendEmail(user.email, subject, html);
  } catch (err) {
    console.error('[subscription] email send failed:', err?.message || err);
  }

  return user;
}
