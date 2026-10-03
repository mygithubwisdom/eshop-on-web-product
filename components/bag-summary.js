'use client';
import { money } from '@/lib/shop/catalog';
import { useShop } from './shop-provider';
export default function BagSummary() {
  const { shop } = useShop();
  if (!shop) return null;
  const subtotal = shop.cart.reduce((sum, i) => sum + (shop.products.find(p => p.id === i.productId)?.price || 0) * i.quantity, 0);
  return <div className="summary"><p className="eyebrow">ORDER SUMMARY</p>{shop.cart.map(i => { const p = shop.products.find(p => p.id === i.productId); return <div className="summary-item" key={i.productId + i.size}><span>{p?.name}<small>Size {i.size} · Qty {i.quantity}</small></span><span>{money((p?.price || 0) * i.quantity)}</span></div>; })}<div className="summary-line"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="summary-line"><span>Delivery{shop.demo ? ' (sample)' : ''}</span><span>{money(250000)}</span></div><div className="summary-total"><span>Total</span><span>{money(subtotal + 250000)}</span></div><p className="muted">All prices in Nigerian naira. Final availability and prices are checked when you place your order.</p></div>;
}
