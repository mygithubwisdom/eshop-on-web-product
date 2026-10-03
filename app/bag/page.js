'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useShop, ShopStatus } from '@/components/shop-provider';
import { money } from '@/lib/shop/catalog';
import BagSummary from '@/components/bag-summary';
export default function BagPage() {
  const { shop, busy, act } = useShop();
  const [error, setError] = useState('');
  async function update(item, quantity) { setError(''); try { await act({ action: 'cart', ...item, quantity }); } catch (e) { setError(e.message); } }
  return <div className="page-wrap"><p className="eyebrow">YOUR EVERYDAY ROTATION</p><h1>Your bag.</h1><ShopStatus />{error && <p role="alert" className="notice error">{error}</p>}{shop && (shop.cart.length ? <div className="two-column"><section aria-label="Bag items">{shop.cart.map(item => { const p = shop.products.find(p => p.id === item.productId); return <article className="bag-item" key={item.productId + item.size}><img src={p?.image} alt={p?.name} width="110" height="140"/><div><h2>{p?.name || 'Unavailable product'}</h2><p>Size {item.size} · {money(p?.price || 0)} each</p><label>Quantity <select aria-label={`Quantity for ${p?.name}, ${item.size}`} disabled={busy} value={item.quantity} onChange={e => update(item, Number(e.target.value))}>{Array.from({length: 10}, (_,i) => <option key={i+1}>{i+1}</option>)}</select></label><button className="text-button" disabled={busy} onClick={() => update(item, 0)}>Remove</button></div><strong>{money((p?.price || 0) * item.quantity)}</strong></article>; })}<Link className="underlined" href="/">Continue shopping</Link></section><aside><BagSummary/><Link className="button full" href="/checkout">Continue to checkout</Link><p className="muted">{shop.user ? 'Your bag is saved to your account.' : 'Sign in at checkout. Your bag comes with you.'}</p></aside></div> : <div className="empty-state"><span className="empty-mark">NB</span><h2>A little room for something good.</h2><p>Your bag is empty. Explore the everyday collection.</p><Link className="button" href="/">Shop the essentials</Link></div>)}</div>;
}
