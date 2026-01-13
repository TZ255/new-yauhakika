import User from '../models/user.js';
import { sendEmail } from './sendEmail.js';
import { sendNEXTSMS, sendNormalSMS } from './sendSMS.js';

const DAYS_7 = 1000 * 60 * 60 * 24 * 7;
const TZ = 'Africa/Nairobi';
const dateFormatter = new Intl.DateTimeFormat('sw-TZ', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TZ,
});

function formatDate(date) {
  return dateFormatter.format(date);
}

export async function confirmWeeklySubscription(email, phone = null) {
  if (!email) return null;
  const user = await User.findOne({ email });
  if (!user) return null;

  const now = new Date();
  const currentExpiry = user.payment?.expiresAt ? new Date(user.payment.expiresAt) : null;
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(base.getTime() + DAYS_7);

  user.isPaid = true;
  user.phone = phone;
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
      <strong>Umelipa:</strong> ${formatDate(now)}<br />
      <strong>Inaisha:</strong> ${formatDate(expiresAt)}
    </p>
    <p>Ingia hapa kuona mikeka ya VIP: <a href="${vipUrl}">${vipUrl}</a></p>
    <p>Asante kwa kuchagua Mikeka ya Uhakika. Ushindi mwema!</p>
  `;
  const sms_text = `Malipo yako ya Mikeka ya Uhakika - VIP Tips ya wiki moja yamethibitishwa kikamilifu hadi ${formatDate(expiresAt)}.\n\nFurahia mikeka yetu ya VIP kila siku!\nhttps://mikekayauhakika.com/vip\n\nAsante!`

  //send email, error is handled inside sendEmail
  sendEmail(user.email, subject, html);

  //send SMS if phone is provided, error is handled inside sendNormalSMS
  if (phone) {
    // sendNormalSMS(phone, sms_text);
    sendNEXTSMS(phone, sms_text)
  }

  return user;
}
