import 'server-only';
import { ShopError } from './model';
export function isDemo() { return process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production'; }
export function appOrigin() {
  const url = process.env.APP_URL;
  if (!url && !isDemo()) throw new ShopError('The shop address has not been configured.', 503);
  return new URL(url || 'http://localhost:3000').origin;
}
export const contactEmail = () => process.env.CONTACT_EMAIL || 'wisdom.ugwoh@gmail.com';
