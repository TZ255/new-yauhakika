import User from '../models/user.js';

const nowDate = () => new Date();

function isActivePaid(user) {
  const expiresAt = user?.payment?.expiresAt ? new Date(user.payment.expiresAt) : null;
  return Boolean(user?.isPaid && expiresAt && expiresAt > nowDate());
}

async function refreshSession(req, userDoc) {
  if (!req?.login) return;
  await new Promise((resolve, reject) => {
    req.login(userDoc, (err) => (err ? reject(err) : resolve()));
  });
}

export async function enforceVipAccess(currentUser, req) {
  if (!currentUser || !currentUser._id) {
    return { user: null, isActive: false, expired: false };
  }

  const userDoc = await User.findById(currentUser._id);
  if (!userDoc) return { user: null, isActive: false, expired: false };

  const isActive = isActivePaid(userDoc);

  if (!isActive && userDoc.isPaid) {
    userDoc.isPaid = false;
    userDoc.payment = {};
    await userDoc.save();
    await refreshSession(req, userDoc);
    return { user: userDoc.toObject(), isActive: false, expired: true };
  }

  const sessionDiffers =
    Boolean(currentUser.isPaid) !== Boolean(userDoc.isPaid) ||
    (currentUser.payment?.expiresAt || null) !== (userDoc.payment?.expiresAt || null);
  if (sessionDiffers) {
    await refreshSession(req, userDoc);
  }

  return { user: userDoc.toObject(), isActive, expired: false };
}
