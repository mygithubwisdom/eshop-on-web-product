import { randomUUID } from 'node:crypto';
export const SHIPPING = 250000;
export class ShopError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function requireUser(user) {
  if (!user) throw new ShopError('Please sign in to continue.', 401);
  return user;
}
export function setCartItem(state, cartKey, { productId, size, quantity }) {
  const product = state.products[productId];
  if (!product || !product.sizes.includes(size)) throw new ShopError('Choose an available product and size.');
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10) throw new ShopError('Quantity must be a whole number from 0 to 10.');
  const items = (state.carts[cartKey]?.items || []).filter(i => i.productId !== productId || i.size !== size);
  const otherSizes = items.filter(i => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0);
  if (quantity > 0 && quantity + otherSizes > product.stock) throw new ShopError(`Only ${product.stock} of ${product.name} remain. Stock is shared across sizes.`);
  if (quantity) items.push({ productId, size, quantity });
  state.carts[cartKey] = { items };
}
export function mergeCart(state, guestKey, userKey) {
  const items = state.carts[userKey]?.items || [];
  for (const item of state.carts[guestKey]?.items || []) {
    const existing = items.find(i => i.productId === item.productId && i.size === item.size);
    if (existing) existing.quantity = Math.min(10, existing.quantity + item.quantity);
    else items.push(item);
  }
  state.carts[userKey] = { items };
  delete state.carts[guestKey];
}
export function validateDelivery(input) {
  const result = {};
  for (const key of ['name', 'phone', 'street', 'city', 'state']) {
    if (typeof input?.[key] !== 'string' || input[key].trim().length < 2 || input[key].length > 200)
      throw new ShopError('Complete your name, phone number and delivery address.');
    result[key] = input[key].trim();
  }
  if (!/^\+?[\d\s()-]{7,20}$/.test(result.phone)) throw new ShopError('Enter a valid phone number.');
  return result;
}
export function queueEmail(state, order) {
  state.email_jobs[order.id] ||= {
    to: order.email, status: order.demo ? 'preview' : 'pending',
    body: `Thank you for shopping with Naija Boy Apparel.\nOrder: ${order.id}\nTotal: NGN ${(order.total / 100).toFixed(2)}\n` +
      order.items.map(i => `${i.name}, size ${i.size}, quantity ${i.quantity}`).join('\n') +
      '\nQuestions? wisdom.ugwoh@gmail.com',
  };
}
export function createOrder(state, cartKey, user, delivery, demo, requestId) {
  requireUser(user);
  // The browser retains this key after network failures, so retries cannot create a second order.
  const previous = Object.values(state.orders).find(o => o.userId === user.id && o.requestId === requestId);
  if (previous) return previous;
  if (Object.values(state.orders).some(o => o.userId === user.id && o.status === 'pending'))
    throw new ShopError('You have an unpaid order. Check or cancel it in your account before placing another.');
  const cart = state.carts[cartKey]?.items || [];
  if (!cart.length) throw new ShopError('Your bag is empty.');
  const items = cart.map(item => {
    const p = state.products[item.productId];
    if (!p || !p.sizes.includes(item.size) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)
      throw new ShopError('An item in your bag is no longer available. Please update your bag.');
    return { ...item, name: p.name, price: p.price };
  });
  for (const p of Object.values(state.products)) {
    const needed = items.filter(i => i.productId === p.id).reduce((sum, i) => sum + i.quantity, 0);
    if (needed > p.stock) throw new ShopError(`Only ${p.stock} of ${p.name} remain. Please update your bag.`);
  }
  for (const item of items) state.products[item.productId].stock -= item.quantity;
  const order = { id: 'NB-' + randomUUID(), requestId, userId: user.id, email: user.email, items,
    delivery: validateDelivery(delivery), shipping: SHIPPING,
    total: items.reduce((sum, i) => sum + i.price * i.quantity, SHIPPING),
    status: demo ? 'paid' : 'pending', demo, createdAt: new Date().toISOString() };
  state.orders[order.id] = order;
  state.carts[cartKey] = { items: [] };
  if (demo) queueEmail(state, order);
  return order;
}
export function cancelOrder(state, reference, userId) {
  const order = state.orders[reference];
  if (!order || order.userId !== userId) throw new ShopError('Order not found.', 404);
  if (order.status !== 'pending') return order;
  for (const item of order.items) state.products[item.productId].stock += item.quantity;
  order.status = 'cancelled';
  return order;
}
export function applyVerifiedPayment(state, reference, payment) {
  const order = state.orders[reference];
  if (!order || order.demo) throw new ShopError('Payment order not found.', 404);
  if (payment.status !== 'success') throw new ShopError('Payment is not confirmed yet. Check again from your account.');
  if (payment.reference !== order.id || payment.amount !== order.total || payment.currency !== 'NGN' ||
      payment.customer?.email?.toLowerCase() !== order.email.toLowerCase())
    throw new ShopError('Payment details do not match this order. Please contact the shop.');
  if (order.status === 'cancelled' || order.status === 'review') { order.status = 'review'; return order; }
  order.status = 'paid'; // Inventory was already reserved. Replayed notifications do not deduct again.
  queueEmail(state, order);
  return order;
}
