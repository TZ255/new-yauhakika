import axios from 'axios';

const PAY_URL = 'https://zenoapi.com/api/payments/mobile_money_tanzania';
const STATUS_URL = 'https://zenoapi.com/api/payments/order-status';

const apiKey = process.env.ZENOPAY_API_KEY;

export async function makePayment(payload) {
  const res = await axios.post(PAY_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });
  return res.data;
}

export async function getTransactionStatus(orderId) {
  const res = await axios.get(`${STATUS_URL}?order_id=${encodeURIComponent(orderId)}`, {
    headers: { 'x-api-key': apiKey },
  });
  return res.data;
}
