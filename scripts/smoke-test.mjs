// Uses an isolated temporary database. Your own demo orders are never reset.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dir = await mkdtemp(path.join(tmpdir(), 'naija-smoke-'));
const base = 'http://localhost:3101';
const env = { ...process.env, DEMO_MODE:'true', APP_URL:base, DEMO_DB_PATH:path.join(dir,'shop.sqlite'), NEXT_TELEMETRY_DISABLED:'1' };
let server;
let output = '';
async function start() {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--webpack','-p','3101'], { env, stdio:['ignore','pipe','pipe'] });
  server.stdout.on('data', b => { output += b; }); server.stderr.on('data', b => { output += b; });
  for (let i=0;i<120;i++) {
    if (server.exitCode !== null) throw new Error(output);
    try { const r = await fetch(base+'/api/shop'); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server did not start: '+output);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise(r => server.once('exit', r));
  server.kill('SIGTERM'); await exited;
}
function browser() {
  const jar = new Map();
  return async (body, origin=base) => {
    const r = await fetch(base+'/api/shop', { method:body?'POST':'GET', headers: { cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '), origin, 'content-type':'application/json' }, ...(body?{body:JSON.stringify(body)}:{}) });
    for (const cookie of r.headers.getSetCookie()) { const [key,...v]=cookie.split(';')[0].split('='); jar.set(key,v.join('=')); }
    return { status:r.status, data:await r.json() };
  };
}
try {
  await start();
  const request = browser();
  const stranger = browser();
  assert.equal((await request()).data.products.length,3);
  assert.equal((await request({action:'cart',productId:'lagos-essential',size:'M',quantity:2})).status,200);
  assert.equal((await request()).data.cart[0].quantity,2);
  assert.equal((await stranger()).data.cart.length,0);
  assert.equal((await request({action:'cart',productId:'lagos-essential',size:'M',quantity:3},'https://evil.example')).status,403);
  assert.equal((await request({action:'checkout'})).status,401);
  assert.equal((await request({action:'login',email:'wisdom.ugwoh@gmail.com',password:'wrong-password'})).status,401);
  assert.equal((await request({action:'login',email:'wisdom.ugwoh@gmail.com',password:'DemoShop2026!'})).status,200);
  assert.equal((await request()).data.cart[0].quantity,2);
  const checkout = { action:'checkout', requestId:crypto.randomUUID(), amount:1,
    delivery:{name:'Demo Customer',phone:'08012345678',street:'12 Test Street',city:'Lagos',state:'Lagos'} };
  assert.equal((await request({...checkout,delivery:{}})).status,400);
  const order = (await request(checkout)).data.order;
  assert.equal(order.total,3850000);
  assert.equal(order.status,'paid');
  assert.equal((await request(checkout)).data.order.id,order.id);
  assert.equal((await request()).data.orders.length,1);
  assert.equal((await stranger()).data.orders.length,0);
  assert.equal((await stranger({action:'verify',reference:order.id})).status,401);
  assert.equal((await fetch(base+'/api/paystack/webhook',{method:'POST',body:'{}'})).status,401);
  await stop(); await start();
  const persisted = (await request()).data;
  assert.equal(persisted.orders[0].id,order.id);
  assert.equal(persisted.products.find(p=>p.id==='lagos-essential').stock,28);
  await request({action:'logout'});
  assert.equal((await request()).data.user,null);
  assert.equal((await request()).data.orders.length,0);
  console.log('PASS: catalog, cart persistence/isolation, CSRF, authentication, cart merge, validation, server pricing, checkout idempotency, order privacy, webhook rejection, restart persistence and logout.');
} catch(error) { console.error(output.slice(-7000)); throw error; }
finally { await stop(); await rm(dir,{recursive:true,force:true}); }
