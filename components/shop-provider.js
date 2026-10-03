'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
const ShopContext = createContext(null);
export async function shopRequest(body) {
  const response = await fetch('/api/shop', body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  } : { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The shop is unavailable. Please try again.');
  return data;
}
export function ShopProvider({ children }) {
  const [shop, setShop] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const data = await shopRequest(); setShop(data); setError(''); return data;
  }, []);
  useEffect(() => { refresh().catch(e => setError(e.message)); }, [refresh]);
  async function act(body) {
    setBusy(true);
    try { const result = await shopRequest(body);
      if (['cart', 'cancel', 'logout'].includes(body.action)) sessionStorage.removeItem('nb_checkout_key');
      await refresh(); return result; }
    finally { setBusy(false); }
  }
  return <ShopContext.Provider value={{ shop, error, busy, refresh, act }}>{children}</ShopContext.Provider>;
}
export const useShop = () => useContext(ShopContext);
export function ShopStatus() {
  const { shop, error, refresh } = useShop();
  if (error) return <div className="notice error" role="alert">{error} <button onClick={() => refresh().catch(() => {})}>Try again</button></div>;
  if (!shop) return <p className="loading" role="status">Opening the shop…</p>;
  return null;
}
