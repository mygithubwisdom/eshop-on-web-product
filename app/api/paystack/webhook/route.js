import { after } from 'next/server';
import { validSignature, verifyPayment } from '@/lib/shop/payment';
import { deliverEmail } from '@/lib/shop/email';
export const runtime = 'nodejs';
export async function POST(request) {
  const raw = await request.text();
  if (raw.length > 100000) return new Response('Too large', { status: 413 });
  if (!validSignature(raw, request.headers.get('x-paystack-signature')))
    return new Response('Invalid signature', { status: 401 });
  try {
    const event = JSON.parse(raw);
    if (event.event === 'charge.success') {
      const reference = event.data?.reference;
      if (typeof reference !== 'string' || !/^NB-[a-f\d-]{36}$/i.test(reference)) return new Response('Invalid reference', { status: 400 });
      await verifyPayment(reference);
      after(() => deliverEmail(reference));
    }
    return Response.json({ received: true });
  } catch { return new Response('Verification failed; retry later', { status: 500 }); }
}
