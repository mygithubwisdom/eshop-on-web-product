import { NextResponse, after } from 'next/server';
import { isDemo, appOrigin } from '@/lib/shop/config';
import { readState, transact, supabase } from '@/lib/shop/database';
import { identity, startSession, endSession, limitAttempts } from '@/lib/shop/session';
import { setCartItem, createOrder, cancelOrder, requireUser, validateDelivery, ShopError } from '@/lib/shop/model';
import { initializePayment, verifyPayment } from '@/lib/shop/payment';
import { deliverEmail } from '@/lib/shop/email';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function failure(error) {
  if (!(error instanceof ShopError)) console.error('Shop request failed:', error.message);
  return reply({ error: error instanceof ShopError ? error.message : 'Something went wrong. Please try again.' }, error.status || 500);
}
export async function GET() {
  try {
    const { user, cartKey } = await identity();
    const state = await readState();
    return reply({ products: Object.values(state.products), cart: state.carts[cartKey]?.items || [],
      user: user ? { email: user.email } : null, demo: isDemo(),
      orders: user ? Object.values(state.orders).filter(o => o.userId === user.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)) : [] });
  } catch (error) { return failure(error); }
}
export async function POST(request) {
  try {
    if (request.headers.get('origin') !== appOrigin()) throw new ShopError('Please make this request from the shop website.', 403);
    if (!request.headers.get('content-type')?.includes('application/json')) throw new ShopError('JSON is required.', 415);
    const raw = await request.text();
    if (raw.length > 16000) throw new ShopError('Request is too large.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { throw new ShopError('Invalid request.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ShopError('Invalid request.');
    const { user, guestKey, cartKey } = await identity();
    if (['login', 'register', 'oauth'].includes(body.action)) {
      await limitAttempts(guestKey, typeof body.email === 'string' ? body.email.slice(0, 254) : '');
      if (isDemo()) {
        if (body.action !== 'login') throw new ShopError('Use the demo account for now. Registration and Google sign-in need Supabase.');
        if (body.email?.toLowerCase() !== 'wisdom.ugwoh@gmail.com' || body.password !== 'DemoShop2026!') throw new ShopError('Email or password is incorrect.', 401);
        await startSession({ id: 'local-demo', email: 'wisdom.ugwoh@gmail.com' }, guestKey);
        return reply({ ok: true });
      }
      const auth = supabase().auth;
      if (body.action === 'oauth') {
        if (typeof body.token !== 'string' || body.token.length > 8000) throw new ShopError('Invalid sign-in.');
        const { data, error } = await auth.getUser(body.token);
        if (error || !data.user?.email) throw new ShopError('Google sign-in could not be verified.', 401);
        await startSession(data.user, guestKey);
        return reply({ ok: true });
      }
      if (typeof body.email !== 'string' || !/^\S+@\S+\.\S+$/.test(body.email) || body.email.length > 254 ||
          typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128)
        throw new ShopError('Enter a valid email and a password of 8–128 characters.');
      if (body.action === 'register') {
        const { error } = await auth.signUp({ email: body.email.trim(), password: body.password });
        if (error) throw new ShopError('Registration could not be completed. Check your details and try again.');
        return reply({ message: 'Check your email to confirm your account, then sign in.' });
      }
      const { data, error } = await auth.signInWithPassword({ email: body.email.trim(), password: body.password });
      if (error || !data.user?.email) throw new ShopError('Email or password is incorrect, or your email is not confirmed.', 401);
      await startSession(data.user, guestKey);
      return reply({ ok: true });
    }
    if (body.action === 'logout') { await endSession(); return reply({ ok: true }); }
    if (body.action === 'cart') {
      if (typeof body.productId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(body.productId) || typeof body.size !== 'string') throw new ShopError('Invalid item.');
      await transact(state => setCartItem(state, cartKey, body));
      return reply({ ok: true });
    }
    requireUser(user);
    if (body.action === 'checkout') {
      const delivery = validateDelivery(body.delivery);
      if (typeof body.requestId !== 'string' || !/^[a-f\d-]{36}$/i.test(body.requestId)) throw new ShopError('Please reload checkout and try again.');
      if (!isDemo() && !process.env.PAYSTACK_SECRET_KEY) throw new ShopError('Payments are not configured yet. Please contact the shop.', 503);
      const order = await transact(state => createOrder(state, cartKey, user, delivery, isDemo(), body.requestId));
      if (order.status !== 'pending') return reply({ order });
      if (order.paymentUrl) return reply({ order, url: order.paymentUrl });
      try { return reply({ order, url: await initializePayment(order) }); }
      catch (error) {
        // Never lose the reservation/order on an ambiguous network failure. Customers can check/cancel it.
        throw new ShopError('Payment could not open. Your unpaid order is saved in your account; check its status or cancel it before trying again.', 502);
      }
    }
    if (['verify', 'cancel'].includes(body.action)) {
      if (typeof body.reference !== 'string' || !/^NB-[a-f\d-]{36}$/i.test(body.reference)) throw new ShopError('Order not found.', 404);
      const order = (await readState()).orders[body.reference];
      if (!order || order.userId !== user.id) throw new ShopError('Order not found.', 404);
      if (body.action === 'cancel') return reply({ order: await transact(state => cancelOrder(state, body.reference, user.id)) });
      const updated = await verifyPayment(body.reference);
      after(() => deliverEmail(body.reference));
      return reply({ order: updated });
    }
    throw new ShopError('Unknown action.');
  } catch (error) { return failure(error); }
}
