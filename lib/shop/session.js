import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { readState, transact } from './database';
import { mergeCart, ShopError } from './model';
export const hash = value => createHash('sha256').update(value).digest('hex');
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
export async function identity() {
  const jar = await cookies();
  let guest = jar.get('nb_guest')?.value;
  if (!guest || !/^[a-f0-9]{64}$/.test(guest)) {
    guest = randomBytes(32).toString('hex');
    jar.set('nb_guest', guest, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  }
  const token = jar.get('nb_session')?.value;
  const state = await readState();
  const session = token ? state.sessions[hash(token)] : null;
  const user = session && session.expires > Date.now() ? { id: session.userId, email: session.email } : null;
  return { user, guestKey: 'g_' + hash(guest), cartKey: user ? 'u_' + user.id : 'g_' + hash(guest) };
}
export async function startSession(user, guestKey) {
  const token = randomBytes(32).toString('hex');
  const jar = await cookies();
  const oldToken = jar.get('nb_session')?.value;
  await transact(state => {
    for (const [key, s] of Object.entries(state.sessions)) if (s.expires < Date.now()) delete state.sessions[key];
    if (oldToken) delete state.sessions[hash(oldToken)];
    state.sessions[hash(token)] = { userId: user.id, email: user.email, expires: Date.now() + 3600000 };
    mergeCart(state, guestKey, 'u_' + user.id);
  });
  jar.set('nb_session', token, { ...cookieOptions, maxAge: 3600 });
}
export async function endSession() {
  const jar = await cookies();
  const token = jar.get('nb_session')?.value;
  if (token) await transact(s => { delete s.sessions[hash(token)]; });
  jar.delete('nb_session');
}
export async function limitAttempts(guestKey, email) {
  const allowed = await transact(state => {
    const now = Date.now();
    for (const [key, limit] of Object.entries(state.rate_limits)) if (limit.until < now) delete state.rate_limits[key];
    const keys = [guestKey, ...(email ? ['email_' + hash(email.toLowerCase())] : [])];
    const limits = keys.map(key => state.rate_limits[key] ||= { count: 0, until: now + 600000 });
    if (limits.some(limit => limit.count >= 10)) return false;
    limits.forEach(limit => limit.count++);
    return true;
  });
  if (!allowed) throw new ShopError('Too many sign-in attempts. Please wait ten minutes.', 429);
}
