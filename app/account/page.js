'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useShop, ShopStatus } from '@/components/shop-provider';
import { browserAuth } from '@/lib/browser-auth';
import { money } from '@/lib/shop/catalog';
export default function AccountPage() {
  const { shop, busy, act } = useShop();
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await act({ action: register ? 'register' : 'login', email: form.get('email'), password: form.get('password') });
      if (result.message) setMessage(result.message);
      else if (new URLSearchParams(window.location.search).get('next') === 'checkout') router.push('/checkout');
    } catch (e) { setError(e.message); }
  }
  async function google() {
    setError(''); setGoogleBusy(true);
    try {
      sessionStorage.setItem('nb_after_login', new URLSearchParams(window.location.search).get('next') === 'checkout' ? '/checkout' : '/account');
      const { error } = await browserAuth().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/auth/callback' } });
      if (error) throw error;
    } catch (e) { setError(e.message); setGoogleBusy(false); }
  }
  async function orderAction(action, reference) {
    setError(''); setMessage('');
    try { const result = await act({ action, reference }); setMessage(result.order?.status === 'review' ? 'Payment needs review. Please contact the shop.' : action === 'cancel' ? 'Order cancelled. Reserved stock has been released.' : 'Payment confirmed. Thank you!'); }
    catch (e) { setError(e.message); }
  }
  return <div className="page-wrap"><p className="eyebrow">MAKE YOURSELF AT HOME</p><h1>Your account.</h1><ShopStatus />{error && <p className="notice error" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}{shop && (shop.user ? <>
    <div className="account-heading"><div><p className="muted">Signed in as</p><strong>{shop.user.email}</strong></div><button className="button secondary" disabled={busy} onClick={async () => { try { await act({action:'logout'}); setMessage(''); } catch(e) { setError(e.message); } }}>Sign out</button></div>
    <h2 className="section-heading">Order history</h2>{!shop.orders.length ? <div className="empty-state"><h2>Your next favourite is waiting.</h2><p>You haven’t placed an order yet.</p><Link className="button" href="/">Explore the collection</Link></div> : <div className="orders">{shop.orders.map(order => <article className="order-card" key={order.id}><div className="order-top"><div><p className="eyebrow">{order.demo ? 'DEMO ORDER' : 'ORDER'} · {new Date(order.createdAt).toLocaleDateString('en-NG')}</p><h3>{order.id}</h3></div><span className={`status ${order.status}`}>{order.status === 'review' ? 'Needs review' : order.status}</span></div>{order.items.map(i => <p key={i.productId+i.size}>{i.name} · {i.size} × {i.quantity} <strong>{money(i.price * i.quantity)}</strong></p>)}<div className="order-total"><span>Including delivery</span><strong>{money(order.total)}</strong></div><p className="muted">Delivery to {order.delivery.name}, {order.delivery.city}, {order.delivery.state}.</p>{order.demo && <p className="muted">Practice order only. No money was charged and no email was sent.</p>}{order.status === 'review' && <p className="notice">Payment arrived after cancellation. <a href="mailto:wisdom.ugwoh@gmail.com">Contact us</a> with your order reference for a review or refund.</p>}{order.status === 'pending' && <div className="button-row">{order.paymentUrl && <a className="button" href={order.paymentUrl}>Continue payment</a>}<button className="button secondary" disabled={busy} onClick={() => orderAction('verify', order.id)}>Check payment</button><button className="text-button" disabled={busy} onClick={() => orderAction('cancel', order.id)}>Cancel unpaid order</button></div>}</article>)}</div>}
  </> : <div className="auth-layout"><section className="auth-copy"><span className="large-monogram">NB.</span><h2>Your style.<br/>Your space.</h2><p>Save your bag, check out, and keep track of your orders in one place.</p>{shop.demo && <div className="demo-login"><strong>Try the local demo</strong><p>Email: wisdom.ugwoh@gmail.com<br/>Password: <code>DemoShop2026!</code></p><small>This is a practice password, not your Gmail password.</small></div>}</section><section className="auth-form"><h2>{register ? 'Create your account' : 'Welcome back'}</h2><p className="muted">{register ? 'Confirm your email before your first sign-in.' : 'Sign in to continue your shopping.'}</p><form onSubmit={submit}><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={shop.demo ? 'wisdom.ugwoh@gmail.com' : ''}/></label><label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} maxLength={128}/></label><button className="button full" disabled={busy || googleBusy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button></form><div className="form-divider">or</div><button className="button secondary full" disabled={shop.demo || busy || googleBusy} onClick={google}>Continue with Google</button>{shop.demo ? <p className="muted">Google sign-in and registration become available after Supabase is configured.</p> : <button className="text-button auth-toggle" onClick={() => { setRegister(!register); setError(''); setMessage(''); }}>{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>}</section></div>)}</div>;
}
