'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShop } from './shop-provider';
export default function SiteShell({ children, contact }) {
  const { shop } = useShop();
  const pathname = usePathname();
  const count = shop?.cart.reduce((sum, i) => sum + i.quantity, 0) || 0;
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="announcement">{shop?.demo ? 'LOCAL DEMO · Explore the shop. No real payments or deliveries.' : 'NAIJA BOY APPAREL · Everyday style, your way.'}</div>
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Naija Boy Apparel home"><span className="brand-mark">NB<span>®</span></span><span>NAIJA BOY<small>APPAREL</small></span></Link>
      <nav aria-label="Main navigation">
        <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>Shop</Link>
        <Link href="/account" aria-current={pathname === '/account' ? 'page' : undefined}>Account</Link>
        <Link href="/bag" className="bag-link" aria-current={pathname === '/bag' ? 'page' : undefined}>Bag <span aria-label={`${count} items`}>{count}</span></Link>
      </nav>
    </header>
    <main id="main">{children}</main>
    <footer className="footer"><div><Link className="footer-brand" href="/">NAIJA BOY APPAREL</Link><p>Everyday essentials. A little Naija spirit.</p></div><div><span className="eyebrow">LET’S TALK</span><a href={`mailto:${contact}`}>{contact}</a></div><p className="footer-note">© {new Date().getFullYear()} Naija Boy Apparel.<br/>Sample collection · Photography is illustrative.</p></footer>
  </>;
}
