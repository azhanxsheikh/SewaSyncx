/**
 * Redis access for server-side code (dispatch workers, API routes, scripts).
 *
 * SERVER-ONLY. ioredis depends on Node's `net` and `tls` modules, so this file
 * must never be imported from anything the browser bundle reaches. Nothing in
 * the SPA imports it; `pnpm build` asset hashes are unchanged by its presence.
 *
 * Redis is an accelerator, never the source of truth. Technician positions are
 * persisted in `public.technician_locations`, and request claims are serialised
 * by the row lock inside `accept_request`. Every helper therefore degrades
 * instead of throwing when Redis is unreachable: reads return `null`, writes
 * return `false`, and locks report `unavailable` so the caller can fall back
 * to the database path. Invalid arguments are programmer errors and do throw.
 */
import { Redis, type RedisOptions } from 'ioredis';
import { randomUUID } from 'node:crypto';

const KEY_PREFIX = 'sewasync:';

/** Matches the 90 s freshness window of `get_nearby_matching_technicians`. */
export const TECHNICIAN_LOCATION_TTL_SECONDS = 90;

/** Minimum gap between repeated "unreachable" warnings. */
const WARNING_INTERVAL_MS = 30_000;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CachedTechnicianLocation extends Coordinates {
  /** ISO-8601 timestamp of the write. */
  updatedAt: string;
}

export type LockResult =
  | { acquired: true; token: string; release: () => Promise<boolean> }
  | { acquired: false; reason: 'held' | 'unavailable' };

// -----------------------------------------------------------------------------
// Connection
// -----------------------------------------------------------------------------

let client: Redis | null = null;
let pendingConnect: Promise<void> | null = null;
let lastWarningAt = 0;
let degraded = false;

function warn(message: string, error?: unknown): void {
  const now = Date.now();
  if (now - lastWarningAt < WARNING_INTERVAL_MS) return;
  lastWarningAt = now;
  const detail = error instanceof Error && error.message ? ` (${error.message})` : '';
  console.warn(`[redis] ${message}${detail}; continuing without cache.`);
}

function parsePort(raw: string | undefined): number {
  if (!raw) return 6379;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError(`REDIS_PORT must be an integer between 1 and 65535, got "${raw}"`);
  }
  return port;
}

function createClient(): Redis {
  const options: RedisOptions = {
    // Connect on first use, not at import time.
    lazyConnect: true,
    // Fail fast while disconnected instead of queueing commands indefinitely.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    commandTimeout: 1_000,
    // Keep reconnecting in the background with capped backoff.
    retryStrategy: (attempt) => Math.min(attempt * 250, 5_000),
  };

  const url = process.env.REDIS_URL;
  const redis = url
    ? new Redis(url, options)
    : new Redis({
        ...options,
        host: process.env.REDIS_HOST || 'localhost',
        port: parsePort(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD || undefined,
      });

  redis.on('error', (error: unknown) => {
    degraded = true;
    warn('Redis unreachable', error);
  });
  redis.on('ready', () => {
    if (degraded) console.info('[redis] Connection restored.');
    degraded = false;
  });

  return redis;
}

/**
 * Returns a ready client, or `null` when Redis is unavailable. The first call
 * waits for the initial connection attempt; later calls never block on a
 * reconnect in progress.
 */
export async function getRedis(): Promise<Redis | null> {
  client ??= createClient();

  if (client.status === 'wait') {
    pendingConnect ??= client
      .connect()
      .catch((error: unknown) => {
        degraded = true;
        warn('Redis unreachable', error);
      })
      .finally(() => {
        pendingConnect = null;
      });
  }
  if (pendingConnect) await pendingConnect;

  return client.status === 'ready' ? client : null;
}

/** Closes the connection. Call from graceful-shutdown handlers. */
export async function closeRedis(): Promise<void> {
  const current = client;
  client = null;
  pendingConnect = null;
  if (!current) return;
  try {
    await current.quit();
  } catch {
    current.disconnect();
  }
}

// -----------------------------------------------------------------------------
// Technician location cache
// -----------------------------------------------------------------------------

function technicianLocationKey(techId: string): string {
  return `${KEY_PREFIX}technician:${techId}:location`;
}

function assertTechnicianId(techId: string): void {
  if (typeof techId !== 'string' || techId.trim() === '') {
    throw new TypeError('techId must be a non-empty string');
  }
}

function isValidCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== 'object' || value === null) return false;
  const { lat, lng } = value as Record<string, unknown>;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Caches a technician's last known position. Returns `true` when written and
 * `false` when Redis is unavailable.
 */
export async function cacheTechnicianLocation(
  techId: string,
  coords: { lat: number; lng: number },
  ttlSeconds: number = TECHNICIAN_LOCATION_TTL_SECONDS,
): Promise<boolean> {
  assertTechnicianId(techId);
  if (!isValidCoordinates(coords)) {
    throw new RangeError('coords must have finite lat in [-90, 90] and lng in [-180, 180]');
  }
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new RangeError('ttlSeconds must be a positive integer');
  }

  const redis = await getRedis();
  if (!redis) return false;

  const payload: CachedTechnicianLocation = {
    lat: coords.lat,
    lng: coords.lng,
    updatedAt: new Date().toISOString(),
  };

  try {
    await redis.set(technicianLocationKey(techId), JSON.stringify(payload), 'EX', ttlSeconds);
    return true;
  } catch (error) {
    warn('Failed to cache technician location', error);
    return false;
  }
}

/**
 * Returns the cached position, or `null` when absent, expired, unreadable, or
 * Redis is unavailable. Callers fall back to `public.technician_locations`.
 */
export async function getCachedTechnicianLocation(
  techId: string,
): Promise<CachedTechnicianLocation | null> {
  assertTechnicianId(techId);

  const redis = await getRedis();
  if (!redis) return null;

  let raw: string | null;
  try {
    raw = await redis.get(technicianLocationKey(techId));
  } catch (error) {
    warn('Failed to read technician location', error);
    return null;
  }
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidCoordinates(parsed)) return null;
    const { updatedAt } = parsed as { updatedAt?: unknown };
    if (typeof updatedAt !== 'string') return null;
    return { lat: parsed.lat, lng: parsed.lng, updatedAt };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Locks
// -----------------------------------------------------------------------------

// Delete only if the caller still owns the lock, so an expired holder cannot
// release a lock that has since been taken by someone else.
const RELEASE_LOCK_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
`;

function lockKey(resourceKey: string): string {
  return `${KEY_PREFIX}lock:${resourceKey}`;
}

/**
 * Acquires a single-instance mutual-exclusion lock (`SET NX PX`) for triage
 * contention, e.g. so only one worker broadcasts a given request.
 *
 * This is contention reduction, not a correctness guarantee: on `unavailable`
 * callers may proceed, because `accept_request` still serialises the claim
 * with `SELECT … FOR UPDATE`. On `held`, another holder is active; back off.
 */
export async function acquireLock(resourceKey: string, ttlMs: number): Promise<LockResult> {
  if (typeof resourceKey !== 'string' || resourceKey.trim() === '') {
    throw new TypeError('resourceKey must be a non-empty string');
  }
  if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
    throw new RangeError('ttlMs must be a positive integer');
  }

  const redis = await getRedis();
  if (!redis) return { acquired: false, reason: 'unavailable' };

  const key = lockKey(resourceKey);
  const token = randomUUID();

  let reply: string | null;
  try {
    reply = await redis.set(key, token, 'PX', ttlMs, 'NX');
  } catch (error) {
    warn('Failed to acquire lock', error);
    return { acquired: false, reason: 'unavailable' };
  }
  if (reply !== 'OK') return { acquired: false, reason: 'held' };

  const release = async (): Promise<boolean> => {
    const current = await getRedis();
    if (!current) return false; // The TTL releases it.
    try {
      return (await current.eval(RELEASE_LOCK_SCRIPT, 1, key, token)) === 1;
    } catch (error) {
      warn('Failed to release lock', error);
      return false;
    }
  };

  return { acquired: true, token, release };
}
