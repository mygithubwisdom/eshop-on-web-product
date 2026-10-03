import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readState, transact } from './database';
import { applyVerifiedPayment, ShopError } from './model';
import { appOrigin, isDemo } from './config';
export async function paystack(endpoint, body) {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new ShopError('Payments are not configured yet. Please contact the shop.', 503);
  const response = await fetch('https://api.paystack.co' + endpoint, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok || !result.status) throw new ShopError('Paystack could not complete this request. Please check your order before retrying.', 502);
  return result.data;
}
export async function initializePayment(order) {
  const result = await paystack('/transaction/initialize', {
    reference: order.id, amount: order.total, currency: 'NGN', email: order.email,
    callback_url: new URL('/checkout', appOrigin()).href,
  });
  const url = new URL(result.authorization_url);
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.paystack.com') throw new ShopError('Unexpected payment address.', 502);
  await transact(state => { state.orders[order.id].paymentUrl = url.href; });
  return url.href;
}
export async function verifyPayment(reference) {
  const order = (await readState()).orders[reference];
  if (!order || order.demo) throw new ShopError('Payment order not found.', 404);
  const payment = await paystack('/transaction/verify/' + encodeURIComponent(reference));
  return transact(state => applyVerifiedPayment(state, reference, payment));
}
export function validSignature(raw, signature) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (isDemo() || !secret || !/^[a-f\d]{128}$/i.test(signature || '')) return false;
  const expected = createHmac('sha512', secret).update(raw).digest();
  return timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}
