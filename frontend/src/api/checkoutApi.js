// ASSUMPTIONS — replace once Pod B's contract is available:
// - POST /api/checkout/create-order  { courseId, amount, currency }  -> { orderId, ... }
// - POST /api/checkout/verify        { orderId, paymentId, signature } -> { success, enrollmentId }
// Flip USE_MOCK to false once real endpoints + payload shapes are confirmed.

const BASE = '/api/checkout';
const USE_MOCK = true;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonOrThrow(res, fallbackMessage) {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    throw new Error(fallbackMessage);
  }
  return res.json();
}

export async function createOrder({ courseId, amount, currency = 'INR' }) {
  if (USE_MOCK) {
    await delay(400);
    return {
      orderId: `order_mock_${Date.now()}`,
      courseId,
      amount,
      currency,
    };
  }
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ courseId, amount, currency }),
  });
  return parseJsonOrThrow(res, 'Could not create order.');
}

export async function verifyPayment({ orderId, paymentId, signature }) {
  if (USE_MOCK) {
    await delay(600);
    return { success: true, enrollmentId: `enr_mock_${Date.now()}` };
  }
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId, paymentId, signature }),
  });
  return parseJsonOrThrow(res, 'Payment verification failed.');
}