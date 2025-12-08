import { Router } from 'express';
import { makePayment } from '../utils/zenoapi.js';
import PaymentBin from '../models/paymentBin.js';
import { sendTelegramNotification } from '../utils/sendTelegramNotifications.js';
import { confirmWeeklySubscription } from '../utils/subscription.js';
import User from '../models/user.js';

const router = Router();

const WEBHOOK_BASE = process.env.SITE_URL || process.env.DOMAIN || '';
const webhookUrl = WEBHOOK_BASE ? `${WEBHOOK_BASE.replace(/\/+$/, '')}/api/zenopay-webhook` : '';
const generateOrderId = (phone) => `ORD-${Date.now().toString(36)}-${phone}`;
const PRICE = { weekly: 8500 };

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone9 = '') {
  const clean = String(phone9).trim();
  if (!/^[1-9][0-9]{8}$/.test(clean)) return null;
  return `255${clean}`;
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
      return res.render('fragments/payment-error', { layout: false, message: 'Barua pepe si sahihi. Tafadhali login upya.' });
    }
    if (!phone) {
      return res.render('fragments/payment-error', { layout: false, message: 'Namba ya simu si sahihi. Weka tarakimu 9 bila kuanza na 0.' });
    }

    const orderId = generateOrderId(phone.slice(-9));

    await PaymentBin.create({
      email,
      phone,
      orderId,
      payment_status: 'PENDING',
      meta: { gateway: 'ZenoPay', plan: 'weekly', amount: PRICE.weekly },
      updatedAt: new Date(),
    });

    const payload = {
      order_id: orderId,
      buyer_name: user.name || email.split('@')[0],
      buyer_phone: phone,
      buyer_email: email,
      amount: PRICE.weekly,
      webhook_url: webhookUrl || undefined,
    };

    const apiResp = await makePayment(payload);

    if (!apiResp || apiResp.status !== 'success') {
      return res.render('fragments/payment-error', {
        layout: false,
        message: apiResp?.message || 'Imeshindikana kuanzisha malipo. Jaribu tena.',
      });
    }

    sendTelegramNotification(`💰 ${email} initiated payment for weekly plan via ZenoPay`, false);

    return res.render('fragments/payment-initiated', {
      layout: false,
      orderId: apiResp.order_id || orderId,
      phone,
    });
  } catch (error) {
    console.error('PAY error:', error?.message || error);
    return res.render('fragments/payment-error', { layout: false, message: 'Hitilafu imetokea. Tafadhali jaribu tena.' });
  }
});

router.post('/api/zenopay-webhook', async (req, res) => {
  try {
    const { order_id, payment_status, reference } = req.body || {};
    if (!order_id) return res.sendStatus(200);

    const record = await PaymentBin.findOne({ orderId: order_id });
    if (record) {
      if (payment_status === 'COMPLETED') {
        record.payment_status = payment_status || record.payment_status;
        record.reference = reference || record.reference;
        record.updatedAt = new Date();
        await record.save();

        try {
          await confirmWeeklySubscription(record.email);
        } catch (e) {
          console.error('grantSubscription webhook error:', e?.message || e);
          sendTelegramNotification(`❌ Failed to confirm a paid sub for ${record?.email} - ${record?.meta?.plan}. Please confirm manually`);
        }
      }
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error('WEBHOOK error:', error?.message || error);
    return res.sendStatus(200);
  }
});

export default router;
