'use client';
import { createClient } from '@supabase/supabase-js';
let client;
export function browserAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Google sign-in is not configured yet.');
  client ||= createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: false, autoRefreshToken: false } });
  return client;
}
