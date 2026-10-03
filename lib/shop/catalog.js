// Prices are integer kobo: 1 naira = 100 kobo. Photos are illustrative samples.
export const catalog = [
  { id: 'lagos-essential', name: 'The Lagos Essential', category: 'EVERYDAY CLASSIC',
    description: 'A clean white tee with an easy, relaxed silhouette. Your everyday starting point.',
    price: 1800000, stock: 30, sizes: ['S', 'M', 'L', 'XL'], image: '/images/essential.jpg' },
  { id: 'weekend-hoodie', name: 'The Weekend Hoodie', category: 'OFF-DUTY UNIFORM',
    description: 'Keep your weekend rotation simple with this laid-back wardrobe staple.',
    price: 2200000, stock: 25, sizes: ['S', 'M', 'L', 'XL'], image: '/images/weekend.jpg' },
  { id: 'signature-tee', name: 'The Signature Tee', category: 'LESS, BUT BETTER',
    description: 'An understated essential. Style it your way, from a slow morning to a night out.',
    price: 2000000, stock: 20, sizes: ['S', 'M', 'L', 'XL'], image: '/images/signature.jpg' },
];
export function initialState() {
  return { products: Object.fromEntries(catalog.map(p => [p.id, structuredClone(p)])),
    carts: {}, orders: {}, sessions: {}, rate_limits: {}, email_jobs: {} };
}
export function money(kobo) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(kobo / 100);
}
