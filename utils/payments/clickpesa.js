import axios from 'axios';

const PRICE = { weekly: 7920 };
const CLICKPESA_URL = 'https://baruakazi.co.tz/payment/process/uhakika';

async function initializeClickPesaPayment({ user, email, phone, orderRef }) {
  const payload = {
    SECRET: process.env.PASS_USER,
    orderRef,
    user: {
      userId: user._id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
    },
    phoneNumber: phone,
    amount: (email === 'janjatzblog@gmail.com' || user.role === 'admin') ? 1000 : PRICE.weekly,
  };

  try {
    await axios.post(CLICKPESA_URL, payload, {
      headers: { 'x-webhook-secret': process.env.PASS_USER },
    });
  } catch (error) {
    let message = 'Imeshindikana kuanzisha malipo. Jaribu tena baadaye.';

    if (error?.response) {
      message = error.response.data?.message || message;
    } else if (error?.request) {
      message = 'Hakuna majibu kutoka server. Angalia internet au jaribu tena.';
    } else {
      message = error.message;
    }

    const initiationError = new Error(message);
    initiationError.userMessage = message;
    throw initiationError;
  }
}

export { initializeClickPesaPayment };
