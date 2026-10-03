'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { browserAuth } from '@/lib/browser-auth';
import { useShop } from '@/components/shop-provider';
export default function CallbackPage() {
  const { act } = useShop();
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error')) throw new Error('Google sign-in was cancelled or could not finish. Please try again.');
      const code = params.get('code');
      if (!code) throw new Error('The sign-in link is incomplete. Please start again.');
      const client = browserAuth();
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (error || !data.session) throw new Error('Sign-in expired. Please start again.');
      try { await act({ action: 'oauth', token: data.session.access_token }); }
      finally { await client.auth.signOut({ scope: 'local' }); }
      const next = sessionStorage.getItem('nb_after_login') === '/checkout' ? '/checkout' : '/account';
      sessionStorage.removeItem('nb_after_login');
      router.replace(next);
    })().catch(e => setError(e.message));
  }, [act, router]);
  return <div className="page-wrap"><h1>Finishing sign-in.</h1>{error ? <p className="notice error" role="alert">{error} <Link href="/account">Back to account</Link></p> : <p role="status">Please wait while we confirm your account…</p>}</div>;
}
