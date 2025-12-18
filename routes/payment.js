import { Router } from 'express';
import mongoose from 'mongoose';
import PaymentBin from '../models/paymentBin.js';
import { sendTelegramNotification } from '../utils/sendTelegramNotifications.js';
import { confirmWeeklySubscription } from '../utils/subscription.js';
import User from '../models/user.js';
import { isValidPhoneNumber, getPhoneNumberDetails } from 'tanzanian-phone-validator';

const router = Router();

const generateOrderId = () => Date.now().toString(36);
const PRICE = { weekly: 8500 };
const PAY_CODE = '18753799';
const PAY_NAME = 'AGATHA AKONAAY';

const NETWORKS = {
  mixx: {
    label: 'Mixx by Yas',
    payCode: PAY_CODE,
    payName: PAY_NAME,
    shortCode: '*150*01#',
    template: 'mixx',
  },
  airtel: {
    label: 'Airtel Money',
    payCode: PAY_CODE,
    payName: PAY_NAME,
    shortCode: '*150*60#',
    template: 'airtel',
  },
  halotel: {
    label: 'Halopesa',
    payCode: PAY_CODE,
    payName: PAY_NAME,
    shortCode: '*150*88#',
    template: 'halotel',
  },
  vodacom: {
    label: 'M-Pesa',
    payCode: PAY_CODE,
    payName: PAY_NAME,
    shortCode: '*150*00#',
    template: 'voda',
  },
  default: {
    label: 'Lipa kwa Simu',
    payCode: PAY_CODE,
    payName: PAY_NAME,
    shortCode: 'Menu ya Malipo',
    template: 'mixx',
  },
};

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone9 = '') {
  if (!isValidPhoneNumber(`255${phone9.trim()}`)) return null;
  return `255${phone9.trim()}`;
}

router.get('/api/pay-form', async (req, res) => {
  try {
    res.render('partials/payment-form', { layout: false });
  } catch (error) {
    console.error('[pay-form]', error);
    res.render('fragments/payment-error', { layout: false, message: 'Imeshindikana kupakia fomu ya malipo.' });
  }
});

router.post('/api/pay', async (req, res) => {
  try {
    const user = req.user ? await User.findById(req.user._id) : null;
    if (!user) {
      return res.render('fragments/payment-error', { layout: false, message: 'Tafadhali ingia (login) kuendelea na malipo.' });
    }

    const email = (user.email || '').trim();
    const phone = normalizePhone(req.body.phone9);

    if (!isValidEmail(email)) {
      res.set('HX-Reswap', 'none');
      return res.render('fragments/payment-form-error', { layout: false, message: 'Barua pepe si sahihi. Tafadhali login upya.' });
    }
    if (!phone) {
      res.set('HX-Reswap', 'none');
      return res.render('fragments/payment-form-error', { layout: false, message: 'Namba ya simu si sahihi. Weka tarakimu 9 bila kuanza na 0' });
    }

    const phoneNumberDetails = getPhoneNumberDetails(phone);
    const brand = (phoneNumberDetails?.telecomCompanyDetails?.brand || '').toLowerCase();
    const networkKey = brand.includes('tigo')
      ? 'mixx'
      : brand.includes('airtel')
        ? 'airtel'
        : brand.includes('halo')
          ? 'halotel'
          : brand.includes('voda')
            ? 'vodacom'
            : 'default';
    const network = NETWORKS[networkKey] || NETWORKS.default;

    const orderRef = generateOrderId();
    const phoneWithPlus = `+${phone}`;

    const paymentEntry = await PaymentBin.create({
      email,
      phone: phoneWithPlus,
      orderId: orderRef,
      reference: orderRef,
      payment_status: 'PENDING',
      meta: { network: networkKey, brand },
    });

    return res.render('fragments/payment-confirm', {
      layout: false,
      phone: phoneWithPlus,
      networkLabel: network.label,
      networkKey,
      paymentId: paymentEntry._id,
      amount: PRICE.weekly,
    });
  } catch (error) {
    console.error('PAY error:', error?.message || error);
    return res.render('fragments/payment-error', { layout: false, message: 'Hitilafu imetokea. Tafadhali jaribu tena.' });
  }
});

router.get('/pay/:id', async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next();
    }

    const user = req.user ? await User.findById(req.user._id) : null;
    if (!user) {
      if (req.flash) req.flash('danger', 'Tafadhali login upya kuendelea');
      return res.redirect('/auth/login');
    }

    const paymentEntry = await PaymentBin.findOne({ _id: id, email: user.email, payment_status: 'PENDING' }).lean();
    if (!paymentEntry) {
      return next();
    }

    const networkKey = paymentEntry.meta?.network || 'default';
    const network = NETWORKS[networkKey] || NETWORKS.default;

    return res.render('pages/pay-instructions', {
      layout: false,
      phone: paymentEntry.phone,
      orderId: paymentEntry.orderId,
      reference: paymentEntry.reference || paymentEntry.orderId,
      amount: PRICE.weekly,
      network,
      paymentId: paymentEntry._id,
    });
  } catch (error) {
    console.error('PAY instructions error:', error?.message || error);
    return res.status(500).render('fragments/payment-error', { layout: false, message: 'Hitilafu imetokea. Jaribu tena.' });
  }
});

router.post('/api/payment-webhook', async (req, res) => {
  console.log('WEBHOOK received:', req.body);
  try {
    const { phone, status, SECRET } = req.body || {};
    if (!phone || SECRET !== process.env.PASS_USER) return res.sendStatus(400).json({ success: false, message: 'Invalid request' });

    if (status === 'COMPLETED') {
      try {
        //find the payment bin entry
        const paymentEntry = await PaymentBin.findOne({ phone, payment_status: 'PENDING' }).sort({ createdAt: -1 });
        if (!paymentEntry) {
          sendTelegramNotification(`❌ No pending payment entry found for phone ${phone} - yaUhakika`, true);
          return res.sendStatus(404).json({ success: false, message: 'Payment entry not found' });
        }

        await confirmWeeklySubscription(paymentEntry.email);
        paymentEntry.payment_status = 'COMPLETED';
        await paymentEntry.save();
        sendTelegramNotification(`✅ Confirmed paid sub for ${paymentEntry.email} - yaUhakika`, true);
      } catch (e) {
        console.error('grantSubscription webhook error:', e?.message || e);
        sendTelegramNotification(`❌ Failed to confirm a paid sub for ${paymentEntry.email} - yaUhakika. Please confirm manually`, true);
      }
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error('WEBHOOK error:', error?.message || error);
    sendTelegramNotification(`❌ Webhook error: ${error?.message || error}`, true);
    res.sendStatus(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
