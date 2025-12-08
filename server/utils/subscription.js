import User from '../models/user.js';

const DAYS_7 = 1000 * 60 * 60 * 24 * 7;

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
  return user;
}
