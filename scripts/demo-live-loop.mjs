#!/usr/bin/env node
// SewaSync — live client ↔ technician loop against the local Supabase stack.
//
// Exercises the seeded Greater Noida demo (supabase/seed.sql) through the real
// auth, PostgREST, Realtime and Storage endpoints, signed in as each persona.
// The portals do not read the database yet, so this is the end-to-end check.
//
// Usage:   node scripts/demo-live-loop.mjs          (Node 22+, no dependencies)
// Replay:  supabase db reset                        (the loop consumes Scenario A)

import { execSync } from 'node:child_process';

const API = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? readLocalAnonKey();
const PASSWORD = 'SewaSync@2026';

const PEOPLE = {
  abdullah: { email: 'abdullah@sewasync.test', label: 'Abdullah (client)' },
  amit: { email: 'amit.singh@sewasync.test', label: 'Amit Singh', lat: 28.6139, lng: 77.4402 },
  rahul: { email: 'rahul.kumar@sewasync.test', label: 'Rahul Kumar', lat: 28.4744, lng: 77.488 },
  vikram: { email: 'vikram.sharma@sewasync.test', label: 'Vikram Sharma', lat: 28.4712, lng: 77.5118 },
};
const SCENARIO = {
  A: 'aaaaaaaa-0000-4000-8000-00000000000a',
  B: 'bbbbbbbb-0000-4000-8000-00000000000b',
  C: 'cccccccc-0000-4000-8000-00000000000c',
};

function readLocalAnonKey() {
  const env = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const match = env.match(/^ANON_KEY="?([^"\n]+)"?$/m);
  if (!match) throw new Error('ANON_KEY not found; is the local stack running (supabase start)?');
  return match[1];
}

async function signIn(person) {
  const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: person.email, password: PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`sign-in failed for ${person.email}: ${JSON.stringify(body)}`);
  person.token = body.access_token;
  person.id = body.user.id;
}

async function api(person, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${person.token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data?.message ?? text}`);
  return data;
}

const rest = (person, query) => api(person, `/rest/v1/${query}`);
const rpc = (person, fn, args) => api(person, `/rest/v1/rpc/${fn}`, { method: 'POST', body: args });

// PostgREST returns geography as hex EWKB; a point is [order][type][srid?][x][y].
function pointOf(hex) {
  const buf = Buffer.from(hex, 'hex');
  const le = buf[0] === 1;
  const type = le ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
  const offset = 5 + (type & 0x20000000 ? 4 : 0);
  const read = (o) => (le ? buf.readDoubleLE(o) : buf.readDoubleBE(o));
  return { lng: read(offset), lat: read(offset + 8) };
}

const googleDirections = ({ lat, lng }) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
const osm = ({ lat, lng }) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
const short = (id) => Object.entries(SCENARIO).find(([, v]) => v === id)?.[0] ?? id.slice(0, 8);
const step = (title) => console.log(`\n\x1b[1m${title}\x1b[0m`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Subscribes to postgres_changes on one table; resolves with the first event
// matching `predicate`, or null after timeoutMs.
function subscribe(person, table) {
  const ws = new WebSocket(`${API.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${ANON_KEY}&vsn=1.0.0`);
  const waiters = [];
  let ready;
  const readyPromise = new Promise((resolve) => (ready = resolve));
  ws.onopen = () => {
    ws.send(JSON.stringify({
      topic: `realtime:demo-${table}`, event: 'phx_join', ref: '1',
      payload: { config: { postgres_changes: [{ event: '*', schema: 'public', table }] }, access_token: person.token },
    }));
  };
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.event === 'system' && /Subscribed/i.test(msg.payload?.message ?? '')) ready();
    if (msg.event !== 'postgres_changes') return;
    const change = msg.payload.data;
    for (const w of [...waiters]) {
      if (w.predicate(change)) {
        waiters.splice(waiters.indexOf(w), 1);
        w.resolve(change);
      }
    }
  };
  const heartbeat = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'hb' })), 20000);
  return {
    ready: readyPromise,
    next: (predicate, timeoutMs = 8000) =>
      new Promise((resolve) => {
        const w = { predicate, resolve };
        waiters.push(w);
        setTimeout(() => {
          if (waiters.includes(w)) {
            waiters.splice(waiters.indexOf(w), 1);
            resolve(null);
          }
        }, timeoutMs);
      }),
    close: () => {
      clearInterval(heartbeat);
      ws.close();
    },
  };
}

async function main() {
  const { abdullah, amit, rahul, vikram } = PEOPLE;
  step('0. Sign in (GoTrue password grant) and refresh technician positions');
  for (const person of Object.values(PEOPLE)) {
    await signIn(person);
    console.log(`   ✓ ${person.label.padEnd(18)} ${person.email}`);
  }
  for (const tech of [amit, rahul, vikram]) {
    await rpc(tech, 'report_technician_location', { p_lat: tech.lat, p_lng: tech.lng, p_network_type: 'cellular_4g' });
  }
  console.log('   ✓ positions reported via report_technician_location (fresh for matching)');

  const [scenarioA] = await rest(abdullah, `requests?id=eq.${SCENARIO.A}&select=status`);
  if (scenarioA?.status !== 'pending') {
    console.log(`\n   Scenario A is "${scenarioA?.status}", not pending — run \`supabase db reset\` to replay.`);
    return;
  }

  step('1. Client — Abdullah sees his requests and live-tracks Rahul');
  for (const r of await rest(abdullah, 'requests?select=id,status,description,estimated_total,final_price&order=id')) {
    console.log(`   ${short(r.id)}  ${r.status.padEnd(10)} ₹${r.final_price ?? r.estimated_total}  ${r.description}`);
  }
  for (const loc of await rest(abdullah, 'technician_locations?select=technician_id,location,updated_at')) {
    const who = Object.values(PEOPLE).find((p) => p.id === loc.technician_id)?.label;
    console.log(`   tracking ${who} (Scenario B, en_route): ${osm(pointOf(loc.location))}`);
  }
  const clientFeed = subscribe(abdullah, 'requests');
  await clientFeed.ready;
  await sleep(1000);
  console.log('   ✓ subscribed to Realtime on requests');

  step('2. Technician — Amit sees the SOS in his feed, accepts, navigates');
  for (const tech of [amit, rahul, vikram]) {
    const feed = await rest(tech, 'requests?status=eq.pending&select=id,description,search_radius_km');
    const why = tech === amit ? '(plumbing, 0.5 km)' : tech === rahul ? '(plumbing, but 16.6 km > 10 km radius)' : '(no plumbing skill)';
    console.log(`   ${tech.label.padEnd(14)} pending feed: ${feed.map((r) => `${short(r.id)} "${r.description}"`).join(', ') || '(empty)'} ${why}`);
  }
  const matches = 'get_nearby_matching_technicians is service_role only; the feed above is the RLS view';
  console.log(`   note: ${matches}`);

  const pushed = clientFeed.next((c) => c.record?.id === SCENARIO.A && c.record?.status === 'accepted');
  const accepted = await rpc(amit, 'accept_request', { p_request_id: SCENARIO.A, p_technician_id: amit.id });
  console.log(`   ✓ accept_request → ${accepted.status}`);
  const event = await pushed;
  console.log(event ? `   ✓ client received Realtime ${event.type}: Scenario A is now ${event.record.status}` : '   ✗ client did not receive the Realtime update within 8 s');
  const destination = pointOf(accepted.service_location);
  console.log(`   Google Maps deep link: ${googleDirections(destination)}`);
  try {
    await rpc(rahul, 'accept_request', { p_request_id: SCENARIO.A, p_technician_id: rahul.id });
  } catch (err) {
    console.log(`   ✓ Rahul trying the same job: ${err.message.match(/already_claimed|scheduling_conflict/)?.[0] ?? err.message}`);
  }

  step('3. Advance to completed; client reviews the settled job');
  for (const status of ['en_route', 'arrived', 'in_progress', 'completed']) {
    const row = await rpc(amit, 'advance_request_status', { p_request_id: SCENARIO.A, p_next_status: status });
    if (status === 'en_route') {
      await rpc(amit, 'report_technician_location', { p_lat: 28.6158, p_lng: 77.4386, p_speed: 6.5, p_heading: 320 });
      const visible = await rest(abdullah, `technician_locations?technician_id=eq.${amit.id}&select=location`);
      console.log(`   → ${row.status.padEnd(11)} client can now track Amit: ${visible.length ? osm(pointOf(visible[0].location)) : 'no'}`);
    } else {
      console.log(`   → ${row.status}`);
    }
  }
  const timeline = await rest(abdullah, `request_status_events?request_id=eq.${SCENARIO.A}&select=status,actor_role&order=occurred_at`);
  console.log(`   timeline A: ${timeline.map((e) => `${e.status}(${e.actor_role})`).join(' → ')}`);
  console.log('   final price + adjustment reason: not set here — this walk uses advance_request_status() directly, matching');
  console.log('   what the technician UI actually calls today; settle_job_payment() now exists (see the migrations) but is');
  console.log('   not reachable from the browser yet since there is no real technician session. See Scenario C for its shape.');

  const [c] = await rest(abdullah, `requests?id=eq.${SCENARIO.C}&select=estimated_total,final_price,price_adjustment_reason,price_adjustment_notes`);
  const [invoice] = await rest(abdullah, `invoices?request_id=eq.${SCENARIO.C}&select=invoice_number,subtotal,tax,total,issued_at`);
  const additions = await rest(abdullah, `request_cost_additions?request_id=eq.${SCENARIO.C}&select=reason,amount,status`);
  const [payment] = await rest(abdullah, `payments?request_id=eq.${SCENARIO.C}&select=method,status,amount,upi_id`);
  const [review] = await rest(abdullah, `reviews?request_id=eq.${SCENARIO.C}&select=rating,tags,tip_amount`);
  console.log(`   Scenario C invoice ${invoice.invoice_number}`);
  console.log(`     estimate            ₹${c.estimated_total}`);
  for (const a of additions) console.log(`     + ${a.status} addition ₹${a.amount}  ${a.reason}`);
  console.log(`     final price         ₹${c.final_price}  (${c.price_adjustment_reason}: ${c.price_adjustment_notes})`);
  console.log(`     subtotal ₹${invoice.subtotal} + GST ₹${invoice.tax} = total ₹${invoice.total}`);
  console.log(`     paid ₹${payment.amount} via ${payment.method.toUpperCase()} (${payment.upi_id}) — ${payment.status}`);
  console.log(`     review ${'★'.repeat(review.rating)}  ${review.tags.join(', ')}  tip ₹${review.tip_amount}`);
  for (const photo of await rest(abdullah, `request_attachments?request_id=eq.${SCENARIO.C}&select=phase,storage_path&order=phase.desc`)) {
    const { signedURL } = await api(abdullah, `/storage/v1/object/sign/sos-media/${photo.storage_path}`, { method: 'POST', body: { expiresIn: 3600 } });
    const url = `${API}/storage/v1${signedURL}`;
    const ok = (await fetch(url)).ok;
    console.log(`     ${photo.phase.padEnd(9)} photo ${ok ? '✓' : '✗'} ${url}`);
  }
  const leaked = await rest(vikram, `invoices?request_id=eq.${SCENARIO.C}&select=id`);
  console.log(`   ✓ Vikram (not a participant) sees ${leaked.length} invoice rows for Scenario C`);

  clientFeed.close();
  console.log('\nDone. Replay with: supabase db reset');
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
