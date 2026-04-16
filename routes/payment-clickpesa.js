import { Router } from 'express';
import { sendTelegramNotification } from '../utils/sendTelegramNotifications.js';
import { confirmWeeklySubscription } from '../utils/subscription.js';
import User from '../models/user.js';
import { isValidPhoneNumber, getPhoneNumberDetails } from 'tanzanian-phone-validator';
import axios from 'axios';

const router = Router();

const generateOrderId = (phone) => `UHAKIKA${Date.now().toString(36)}`;
const PRICE = { weekly: 8000 };

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone9 = '') {
    //if (!isValidPhoneNumber(`255${phone9.trim()}`)) return null;

    const phoneString = String(phone9).trim();

    // Ensure it starts with 6 or 7 and is followed by exactly 8 digits
    if (!/^[67]\d{8}$/.test(phoneString)) {
        return null;
    }

    return `255${phoneString}`;
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

    const phoneNumberDetails = getPhoneNumberDetails(phone);
    if (phoneNumberDetails.telecomCompanyDetails?.brand?.toLowerCase() === 'vodacom') {
      res.set('HX-Reswap', 'none');
      return res.render('fragments/payment-form-error', { layout: false, message: 'Samahani! Malipo kwa Vodacom hayaruhusiwi kwa sasa. Tumia Tigo, Airtel au Halotel.' });
    }

    // restrict halotel temporary
    // if (phoneNumberDetails.telecomCompanyDetails.brand.toLowerCase() === 'halotel') {
    //   res.set('HX-Reswap', 'none');
    //   return res.render('fragments/payment-form-error', { layout: false, message: 'Samahani! Kuna changamoto ya mtandao kwa Halotel. Tafadhali tumia Tigo au Airtel.' });
    // }

    const orderRef = generateOrderId(phone);

    // build payment payload
    const payload = {
      SECRET: process.env.PASS_USER,
      orderRef,
      user: { userId: user._id, email: user.email, name: user.name || user.email.split('@')[0] },
      phoneNumber: phone,
      amount: (email === "janjatzblog@gmail.com" || user.role === 'admin') ? 1000 : PRICE.weekly
    };

    const bkaziServer = "https://baruakazi.co.tz/payment/process/uhakika"
    
    try {
      const apiResp = await axios.post(bkaziServer, payload, {
        headers: {"x-webhook-secret": process.env.PASS_USER}
      });
      if (!apiResp || apiResp.data?.success !== true) throw new Error(`Hitilafu imetokea. Tafadhali jaribu tena baadae`);
    } catch (error) {
      let errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      console.error('Payment initiation error:', errorMessage);
      return res.render('fragments/payment-error', { layout: false, message: errorMessage });
    }

    sendTelegramNotification(`💰 ${email} initiated payment for weekly plan - yaUhakika`, true);

    return res.render('fragments/payment-initiated', {
      layout: false,
      orderId: orderRef,
      phone,
    });
  } catch (error) {
    console.error('PAY error:', error?.message || error);
    return res.render('fragments/payment-error', { layout: false, message: 'Hitilafu imetokea. Tafadhali jaribu tena.' });
  }
});

router.post('/api/payment-webhook', async (req, res) => {
  console.log('WEBHOOK received:', req.body);
  try {
    const { order_id, payment_status, email, phone, reference, SECRET } = req.body || {};
    if (!order_id || SECRET !== process.env.PASS_USER) return res.sendStatus(400).json({ success: false, message: 'Invalid request' });

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
    res.sendStatus(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;