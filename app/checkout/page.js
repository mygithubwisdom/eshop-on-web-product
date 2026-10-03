'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useShop, ShopStatus } from '@/components/shop-provider';
import BagSummary from '@/components/bag-summary';
import { money } from '@/lib/shop/catalog';
export default function CheckoutPage() {
  const { shop, busy, act } = useShop();
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [reference, setReference] = useState('');
  const checked = useRef(false);
  const requestId = useRef(null);
  useEffect(() => { setReference(new URLSearchParams(window.location.search).get('reference') || ''); }, []);
  useEffect(() => {
    if (!reference || !shop?.user || checked.current) return;
    checked.current = true; setVerifying(true);
    act({ action: 'verify', reference }).then(result => setOrder(result.order)).catch(e => setError(e.message)).finally(() => setVerifying(false));
  }, [reference, shop?.user, act]);
  async function submit(event) {
    event.preventDefault(); setError('');
    requestId.current ||= sessionStorage.getItem('nb_checkout_key') || crypto.randomUUID();
    sessionStorage.setItem('nb_checkout_key', requestId.current);
    const delivery = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await act({ action: 'checkout', delivery, requestId: requestId.current });
      if (result.url) { sessionStorage.removeItem('nb_checkout_key'); window.location.assign(result.url); }
      else { setOrder(result.order); sessionStorage.removeItem('nb_checkout_key'); requestId.current = null; }
    } catch (e) { setError(e.message); }
  }
  return <div className="page-wrap"><p className="eyebrow">ONE STEP CLOSER</p><h1>Checkout.</h1><ShopStatus/>{error && <div className="notice error" role="alert">{error} <Link href="/account">View your orders</Link></div>}{shop && (order ? <section className="confirmation"><span className="confirmation-mark">✓</span><p className="eyebrow">{order.demo ? 'DEMO ORDER SAVED' : order.status === 'paid' ? 'PAYMENT CONFIRMED' : 'ORDER UPDATE'}</p><h2>{order.status === 'paid' ? 'Thank you. You’re all set.' : 'Your order needs attention.'}</h2><p>{order.demo ? 'This was a practice checkout. No money was charged, no email was sent, and no items will be delivered.' : order.status === 'review' ? 'Your payment arrived after cancellation. Please contact the shop for review.' : order.status === 'cancelled' ? 'This order was cancelled. You can start a new order from your bag.' : 'Your order is saved. You can follow its status in your account.'}</p><p className="order-reference">{order.id}</p><strong>{money(order.total)}</strong><div className="button-row"><Link className="button" href="/account">View order history</Link><Link className="button secondary" href="/">Continue shopping</Link></div></section> : !shop.user ? <section className="empty-state"><h2>First, make it yours.</h2><p>Sign in to save your order and delivery details. Your bag will come with you.</p><Link className="button" href="/account?next=checkout">Sign in to checkout</Link></section> : reference ? <section className="empty-state"><h2>{verifying ? 'Checking your payment…' : 'Check your order status'}</h2><p>We confirm payments with Paystack before marking your order paid.</p><Link className="button" href="/account">Go to your orders</Link></section> : !shop.cart.length ? <section className="empty-state"><h2>Your bag is empty.</h2><Link className="button" href="/">Browse the collection</Link></section> : <div className="two-column"><section><h2>Delivery details</h2><p className="muted">Order email: {shop.user.email}</p>{shop.demo && <p className="notice">Practice checkout · Use sample delivery details. Nothing will be charged or shipped.</p>}<form onSubmit={submit} className="delivery-form"><label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label><label>Phone number<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={20} placeholder="0801 234 5678"/></label><label className="span-two">Street address<input name="street" autoComplete="street-address" required minLength={2} maxLength={200}/></label><label>City<input name="city" autoComplete="address-level2" required minLength={2} maxLength={100}/></label><label>State<input name="state" autoComplete="address-level1" required minLength={2} maxLength={100}/></label><p className="muted span-two">Nigeria only. Delivery is a sample flat rate of ₦2,500.</p><button className="button span-two" disabled={busy}>{busy ? 'Processing…' : shop.demo ? 'Place demo order' : 'Continue to Paystack'}</button>{!shop.demo && <p className="muted span-two">Payment details are entered securely on Paystack, never on this website.</p>}</form></section><aside><BagSummary/><Link className="underlined" href="/bag">Edit your bag</Link></aside></div>)}</div>;
}
