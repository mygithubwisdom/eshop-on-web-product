'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useShop, ShopStatus } from '@/components/shop-provider';
import { money } from '@/lib/shop/catalog';
function ProductCard({ product, index }) {
  const { shop, busy, act } = useShop();
  const [size, setSize] = useState('M');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function add() {
    setError(''); setMessage('');
    const quantity = (shop.cart.find(i => i.productId === product.id && i.size === size)?.quantity || 0) + 1;
    try { await act({ action: 'cart', productId: product.id, size, quantity }); setMessage(`${size} added to your bag.`); }
    catch (e) { setError(e.message); }
  }
  return <article className="product-card">
    <div className="product-image"><img src={product.image} alt={product.name + ' — sample product photograph'} width="800" height="1000" loading={index === 0 ? 'eager' : 'lazy'} /><span className="product-tag">0{index + 1} / THE ESSENTIALS</span></div>
    <div className="product-details"><p className="eyebrow">{product.category}</p><div className="product-title"><h2>{product.name}</h2><span>{money(product.price)}</span></div><p className="description">{product.description}</p>
      <div className="product-controls"><label className="size-label">Size<select aria-label={`Size for ${product.name}`} value={size} onChange={e => setSize(e.target.value)}>{product.sizes.map(s => <option key={s}>{s}</option>)}</select></label><button className="button" disabled={busy || !product.stock} onClick={add}>{product.stock ? 'Add to bag' : 'Sold out'}</button></div>
      <div className="product-feedback" aria-live="polite">{error ? <span className="error-text">{error}</span> : message ? <span>{message} <Link href="/bag">View bag</Link></span> : <span className="muted">Available in {product.sizes.join(' / ')}</span>}</div>
    </div>
  </article>;
}
export default function ShopPage() {
  const { shop } = useShop();
  return <div className="storefront"><section className="collection-heading"><div><p className="eyebrow">THE EVERYDAY COLLECTION / 001</p><h1>Good style.<br/><span>No wahala.</span></h1></div><div className="collection-intro"><p>Easy essentials for wherever the day takes you. Find your fit. Make it your own.</p><span className="collection-stamp">NAIJA SPIRIT.<br/>EVERYDAY ENERGY.</span></div></section>
    <div className="collection-bar"><span>THE ESSENTIALS</span><span>{shop ? `${shop.products.length} pieces` : 'Sample collection'}</span></div>
    <ShopStatus />
    {shop && <section className="product-grid" aria-label="Shop the collection">{shop.products.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}</section>}
    <section className="shop-notes"><div><span>01</span><h3>Find your everyday fit</h3><p>Three simple essentials. Sizes S through XL.</p></div><div><span>02</span><h3>Keep your favourites close</h3><p>Your bag is saved as you browse. Sign in to keep it with your account.</p></div><div><span>03</span><h3>A little help? Just ask.</h3><p>Questions about the collection? <a href="mailto:wisdom.ugwoh@gmail.com">Get in touch.</a></p></div></section>
  </div>;
}
