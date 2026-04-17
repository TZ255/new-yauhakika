import { Router } from 'express';
import { sendTelegramNotification } from '../utils/sendTelegramNotifications.js';
import { confirmWeeklySubscription } from '../utils/subscription.js';
import User from '../models/user.js';
import { isValidPhoneNumber, getPhoneNumberDetails } from 'tanzanian-phone-validator';
import axios from 'axios';
import { initializeSnippePayment } from '../utils/snippe-api.js';

const router = Router();


// helpers
const generateOrderId = (phone) => `UHAKIKA${Date.now().toString(36)}`;
const PRICE = { weekly: 8500 };

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

// normalize the user name, if it contains space, first part will be firstname, the rest will be lastname. If no space, all will be firstname and lastname will be also the same as firstname
function normalizeName(name) {
    if (!name) return { firstName: 'Customer', lastName: '' };
    const parts = name.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : firstName;
    return { firstName, lastName };
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
        let network = phoneNumberDetails?.telecomCompanyDetails?.brand?.toLowerCase() || 'unknown';

        const orderRef = generateOrderId(phone);
        const timestamp_string = Date.now().toString(36);

        // build payment payload
        const payload = {
            "payment_type": "mobile",
            "details": {
                "amount": email === "janjatzblog@gmail.com" ? 500 : PRICE.weekly,
                "currency": "TZS"
            },
            "phone_number": phone,
            "customer": {
                "firstname": normalizeName(user?.name || null).firstName,
                "lastname": normalizeName(user?.name || null).lastName,
                "email": `${user._id}@tanzabyte.com`
            },
            "webhook_url": "https://baruakazi.co.tz/payment/webhook/snippe/uhakika",
            "metadata": {
                "order_id": orderRef
            }
        }

        try {
            //initiate payment
            const apiResp = await initializeSnippePayment(payload);
            if (!apiResp) throw new Error('PAY error: No response from payment API');

        } catch (error) {
            console.error('PAY error:', error?.message || 'Payment API returned unsuccessful response');
            res.set('HX-Reswap', 'none');
            sendTelegramNotification(`❌❌ Payment Inition Error (UH): \nEmail: ${email} \nPhone: ${phone} \nMessage: ${error?.message}`, true);
            return res.render('fragments/payment-form-error', { layout: false, message: 'Imeshindikana kuanzisha malipo. Jaribu tena baadaye.' });
        }

        // Send notification to Laura about the successfully initiated payment
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

router.post('/webhook/snippe', async (req, res) => {
    console.log('SNIPPE WEBHOOK received:', req.body);
    res.status(200).json({ success: true, message: 'Webhook received' }); // Acknowledge receipt of the webhook immediately

    try {
        const { id, type, data: { status, customer: { email, phone }, metadata: { order_id } } } = req.body || {};

        if (!id || !type || !status || !email || !phone || !order_id) {
            throw new Error('Missing required fields in webhook payload');
        }

        if (!String(email || '').includes('@tanzabyte.com')) throw new Error('Ignoring webhook for wrong email');

        if (type === 'payment.completed' && status === 'completed') {
            let user_id = String(email).split('@tanzabyte.com')[0];
            let user = await User.findById(user_id);

            if (!user) throw new Error('User not found for email: ' + email);
            let user_email = user.email;
            let user_phone = String(phone).replace('+', '');
            try {
                await confirmWeeklySubscription(user_email, user_phone);
                sendTelegramNotification(`✅ YAUhakika Confirmed \nEmail: ${user_email} \nPhone: ${user_phone} \nOrder ID: ${order_id}`, true);
            } catch (e) {
                console.error('grantSubscription webhook error:', e?.message || e);
                sendTelegramNotification(`❌ Failed to confirm a paid sub for ${user_email} with phone ${user_phone} - yaUhakika. Please confirm manually`, true);
            }
        }
    } catch (error) {
        console.error('SNIPPE WEBHOOK error:', error?.message || error);
        sendTelegramNotification(`❌ UHAKIKA Webhook error: ${error?.message || error}`, true);
    }
});

export default router;