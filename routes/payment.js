import { Router } from 'express';
import { sendTelegramNotification } from '../utils/sendTelegramNotifications.js';
import { confirmWeeklySubscription } from '../utils/subscription.js';
import User from '../models/user.js';
import {
  generateOrderId,
  getNetworkBrand,
  isValidEmail,
  normalizePhone,
  selectPaymentGateway,
} from '../utils/payments/common.js';
import { initializeClickPesaPayment } from '../utils/payments/clickpesa.js';
import { initializeSnippeGatewayPayment } from '../utils/payments/snippe.js';

const router = Router();

router.get('/api/pay-form', async (req, res) => {
  try {
    res.render('partials/payment-form', { layout: false });
  } catch (error) {
    console.error('[pay-form]', error);
    res.render('fragments/payment-error', { layout: false, message: 'Imeshindikana kupakia fomu ya malipo.' });
  }
});

router.post('/api/pay', async (req, res) => {
  console.log('PAY request body:', req.body);

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

    const networkBrand = getNetworkBrand(phone);
    const gateway = selectPaymentGateway(networkBrand);
    const orderRef = generateOrderId();

    try {
      if (gateway === 'snippe') {
        await initializeSnippeGatewayPayment({ user, email, phone, orderRef });
      } else {
        await initializeClickPesaPayment({ user, email, phone, orderRef });
      }
    } catch (error) {
      console.error('PAY error:', error?.message || error);
      const gatewayLabel = gateway === 'snippe' ? 'Snippe' : 'ClickPesa';
      res.set('HX-Reswap', 'none');
      sendTelegramNotification(`❌❌ YH Payment Initiation Error (${gatewayLabel}): \nEmail: ${email} \nPhone: ${phone} \nMessage: ${error?.message}`, true); 
      return res.render('fragments/payment-form-error', {
        layout: false,
        message: error?.userMessage || 'Imeshindikana kuanzisha malipo. Jaribu tena baadaye.',
      });
    }

    sendTelegramNotification(`💰 ${email}, ${phone} initiated payment for weekly plan - yaUhakika`, true);

    return res.render('fragments/payment-initiated', {
      layout: false,
      orderId: orderRef,
      phone,
    });
  } catch (error) {
    console.error('PAY error:', error?.message || error);
    sendTelegramNotification(`❌❌Payment Initiation Error (yaUH). Check Logs`, true);
    return res.render('fragments/payment-error', { layout: false, message: 'Hitilafu imetokea. Tafadhali jaribu tena.' });
  }
});

router.post('/api/payment-webhook', async (req, res) => {
  console.log('WEBHOOK received:', req.body);

  try {
    const { order_id, payment_status, email, phone } = req.body || {};
    const secret = req.headers['x-webhook-secret'];

    if (!order_id || secret !== process.env.PASS_USER) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    if (payment_status === 'COMPLETED') {
      try {
        await confirmWeeklySubscription(email, phone);
        sendTelegramNotification(`✅ YAUhakika Confirmed \nEmail: ${email} \nPhone: ${phone} \nOrder ID: ${order_id}`, true);
      } catch (e) {
        console.error('grantSubscription webhook error:', e?.message || e);
        sendTelegramNotification(`❌ Failed to confirm a paid sub for ${email} with phone ${phone} - yaUhakika. Please confirm manually`, true);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error('WEBHOOK error:', error?.message || error);
    sendTelegramNotification(`❌ Webhook error: ${error?.message || error}`, true);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/webhook/snippe', async (req, res) => {
  console.log('SNIPPE WEBHOOK received:', req.body);
  res.status(200).json({ success: true, message: 'Webhook received' });

  try {
    const {
      id,
      type,
      data: {
        status,
        customer: { email, phone },
        metadata: { order_id },
      } = {},
    } = req.body || {};

    if (!id || !type || !status || !email || !phone || !order_id) {
      throw new Error('Missing required fields in webhook payload');
    }

    if (!String(email || '').includes('@tanzabyte.com')) {
      throw new Error('Ignoring webhook for wrong email');
    }

    if (type === 'payment.completed' && status === 'completed') {
      const userId = String(email).split('@tanzabyte.com')[0];
      const user = await User.findById(userId);

      if (!user) {
        throw new Error(`User not found for email: ${email}`);
      }

      const userEmail = user.email;
      const userPhone = String(phone).replace('+', '');

      try {
        await confirmWeeklySubscription(userEmail, userPhone);
        sendTelegramNotification(`✅ YAUhakika Confirmed \nEmail: ${userEmail} \nPhone: ${userPhone} \nOrder ID: ${order_id}`, true);
      } catch (e) {
        console.error('grantSubscription webhook error:', e?.message || e);
        sendTelegramNotification(`❌ Failed to confirm a paid sub for ${userEmail} with phone ${userPhone} - yaUhakika. Please confirm manually`, true);
      }
    }
  } catch (error) {
    console.error('SNIPPE WEBHOOK error:', error?.message || error);
    sendTelegramNotification(`❌ UHAKIKA Webhook error: ${error?.message || error}`, true);
  }
});

export default router;
