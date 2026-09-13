// cache-technician-location — writes a technician's last-known position into
// Redis with a 90s TTL, matching TECHNICIAN_LOCATION_TTL_SECONDS in
// src/lib/redis.ts and the freshness window get_nearby_matching_technicians
// requires.
//
// Called only from private.report_technician_location() via pg_net's async
// http_post (supabase/migrations/20260913000006_technician_location_cache.sql)
// — never directly by clients. It is not on the public API surface (Kong
// never routes to it; only containers on supabase_network_SewaSyncx can reach
// it), so it has no auth of its own beyond that network boundary. That's the
// accepted local-dev posture (config.toml's own "no authentication" notice
// already covers Studio, pg-meta and analytics); a production deployment
// should add a shared secret or verify_jwt with a service-role-signed call.
//
// pg_net is fire-and-forget: a failure here never surfaces to the RPC caller
// or blocks report_technician_location. That's intentional — this is a cache,
// not the source of truth (public.technician_locations is).
import { connect } from 'https://deno.land/x/redis@v0.41.2/mod.ts';

const REDIS_HOST = Deno.env.get('REDIS_HOST') ?? 'redis';
const REDIS_PORT = Number(Deno.env.get('REDIS_PORT') ?? '6379');
// Matches docker-compose.yml's own default, so this works out of the box
// without requiring a .env file, exactly like the compose file itself does.
const REDIS_PASSWORD = Deno.env.get('REDIS_PASSWORD') ?? 'sewasync_local_dev';
const TTL_SECONDS = 90;

interface CacheLocationBody {
  technician_id?: unknown;
  lat?: unknown;
  lng?: unknown;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function isCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: CacheLocationBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { technician_id, lat, lng } = body;
  if (!isUuid(technician_id) || !isCoordinate(lat, -90, 90) || !isCoordinate(lng, -180, 180)) {
    return Response.json({ error: 'invalid_payload' }, { status: 400 });
  }

  try {
    const redis = await connect({ hostname: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD });
    try {
      await redis.setex(
        `technician:${technician_id}:location`,
        TTL_SECONDS,
        JSON.stringify({ lat, lng, updatedAt: new Date().toISOString() }),
      );
    } finally {
      redis.close();
    }
  } catch (error) {
    console.error('[cache-technician-location] Redis write failed:', error);
    return Response.json({ error: 'redis_unavailable' }, { status: 502 });
  }

  return Response.json({ ok: true });
});
