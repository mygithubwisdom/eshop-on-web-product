import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../lib/shop/catalog.js';
import { setCartItem, mergeCart, createOrder, cancelOrder, applyVerifiedPayment, validateDelivery } from '../lib/shop/model.js';
const user = { id: 'customer-1', email: 'shopper@example.test' };
const delivery = { name: 'Test Shopper', phone: '08012345678', street: '12 Test Street', city: 'Lagos', state: 'Lagos' };
function prepare() {
  const state = initialState();
  setCartItem(state, 'user', { productId: 'lagos-essential', size: 'M', quantity: 2 });
  return state;
}
function paid(order) { return { reference: order.id, amount: order.total, currency: 'NGN', status: 'success', customer: { email: user.email } }; }
test('checkout calculates prices on server and reserves stock only once for a repeated request', () => {
  const state = prepare();
  const order = createOrder(state, 'user', user, delivery, false, 'request-1');
  assert.equal(order.total, 3850000);
  assert.equal(state.products['lagos-essential'].stock, 28);
  assert.equal(state.carts.user.items.length, 0);
  assert.equal(createOrder(state, 'user', user, delivery, false, 'request-1').id, order.id);
  assert.equal(Object.keys(state.orders).length, 1);
  assert.equal(state.products['lagos-essential'].stock, 28);
});
test('all selected sizes share the same inventory', () => {
  const state = initialState();
  state.products['lagos-essential'].stock = 3;
  setCartItem(state, 'a', { productId: 'lagos-essential', size: 'M', quantity: 2 });
  assert.throws(() => setCartItem(state, 'a', { productId: 'lagos-essential', size: 'L', quantity: 2 }), /Only 3/);
  setCartItem(state, 'b', { productId: 'lagos-essential', size: 'L', quantity: 2 });
  createOrder(state, 'a', user, delivery, false, 'one');
  assert.throws(() => createOrder(state, 'b', { ...user, id:'customer-2' }, delivery, false, 'two'), /Only 1/);
  assert.equal(state.products['lagos-essential'].stock, 1);
});
test('cancellation is owner-only and restores inventory exactly once', () => {
  const state = prepare();
  const order = createOrder(state, 'user', user, delivery, false, 'one');
  assert.throws(() => cancelOrder(state, order.id, 'stranger'), /not found/);
  cancelOrder(state, order.id, user.id);
  cancelOrder(state, order.id, user.id);
  assert.equal(state.products['lagos-essential'].stock, 30);
});
test('verification rejects incorrect amount, email, currency, reference and failed payment', () => {
  const state = prepare();
  const order = createOrder(state, 'user', user, delivery, false, 'one');
  for (const patch of [{ amount: 1 }, { currency: 'USD' }, { reference: 'fake' }, { customer: { email:'wrong@example.test' } }, { status:'failed' }]) {
    assert.throws(() => applyVerifiedPayment(state, order.id, { ...paid(order), ...patch }));
    assert.equal(order.status, 'pending');
  }
});
test('replayed payments create one email job and never reserve stock twice', () => {
  const state = prepare();
  const order = createOrder(state, 'user', user, delivery, false, 'one');
  applyVerifiedPayment(state, order.id, paid(order));
  applyVerifiedPayment(state, order.id, paid(order));
  assert.equal(order.status, 'paid');
  assert.equal(state.products['lagos-essential'].stock, 28);
  assert.equal(Object.keys(state.email_jobs).length, 1);
  cancelOrder(state, order.id, user.id);
  assert.equal(order.status, 'paid');
});
test('late payment after cancellation is marked for review without selling restored stock', () => {
  const state = prepare();
  const order = createOrder(state, 'user', user, delivery, false, 'one');
  cancelOrder(state, order.id, user.id);
  applyVerifiedPayment(state, order.id, paid(order));
  applyVerifiedPayment(state, order.id, paid(order));
  assert.equal(order.status, 'review');
  assert.equal(state.products['lagos-essential'].stock, 30);
  assert.equal(Object.keys(state.email_jobs).length, 0);
});
test('sign-in merges guest bag and removes the guest copy', () => {
  const state = prepare();
  setCartItem(state, 'guest', { productId:'lagos-essential', size:'M', quantity:1 });
  mergeCart(state, 'guest', 'user');
  assert.equal(state.carts.user.items[0].quantity, 3);
  assert.equal(state.carts.guest, undefined);
});
test('rejects invalid quantities, sizes and delivery details', () => {
  for (const quantity of [-1, 1.5, 11, '2']) assert.throws(() => setCartItem(initialState(), 'a', { productId:'lagos-essential', size:'M', quantity }));
  assert.throws(() => setCartItem(initialState(), 'a', { productId:'lagos-essential', size:'XXXL', quantity:1 }));
  assert.throws(() => validateDelivery({ ...delivery, phone:'not-a-phone' }));
  assert.throws(() => validateDelivery({ ...delivery, street:'' }));
});
test('demo checkout saves only an email preview and cannot accept a Paystack confirmation', () => {
  const state = prepare();
  const order = createOrder(state, 'user', user, delivery, true, 'demo');
  assert.equal(order.status, 'paid');
  assert.equal(state.email_jobs[order.id].status, 'preview');
  assert.throws(() => applyVerifiedPayment(state, order.id, paid(order)));
});
