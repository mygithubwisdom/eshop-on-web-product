import './globals.css';
import { ShopProvider } from '@/components/shop-provider';
import SiteShell from '@/components/site-shell';
export const metadata = {
  title: { default: 'Naija Boy Apparel | Everyday essentials', template: '%s | Naija Boy Apparel' },
  description: 'Discover the Naija Boy Apparel sample collection. Shop everyday essentials in Nigerian naira.',
  icons: { icon: '/icon.svg' },
};
export default function RootLayout({ children }) {
  return <html lang="en-NG"><body><ShopProvider><SiteShell contact={process.env.CONTACT_EMAIL || 'wisdom.ugwoh@gmail.com'}>{children}</SiteShell></ShopProvider></body></html>;
}
