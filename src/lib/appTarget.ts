/**
 * Resolves which surface the current page renders: the client SOS/booking
 * app, or the standalone Ops Admin console (`src/components/admin`). Read by
 * `src/App.tsx`, which both `apps/clients` and the repo-root entrypoint
 * (`src/main.tsx`, used by the Figma preview pipeline) import.
 *
 * Two independent signals feed this, since dev servers and production builds
 * set them differently:
 *  1. `VITE_APP_TARGET`, set by the `dev:*` / `build:*` scripts in the root
 *     `package.json`. This is the source of truth wherever it is set,
 *     including on Vercel (each of the two projects sets its own build
 *     command).
 *  2. The dev server's port, for a running server that didn't set the env
 *     var (e.g. `pnpm --filter clients dev`).
 *  3. The URL path, for a single deployment that reverse-proxies `/admin`
 *     to this same build rather than running a separate one.
 *
 * Unset and unmatched cases default to 'client' so a build with none of
 * these signals (the Figma deploy pipeline's `pnpm run build`) keeps
 * rendering what it always has.
 */
export type AppTarget = 'client' | 'admin';

const CLIENT_DEV_PORT = '3001';
const ADMIN_DEV_PORT = '3002';

export function getAppTarget(): AppTarget {
  const envTarget = import.meta.env.VITE_APP_TARGET;
  if (envTarget === 'admin' || envTarget === 'client') return envTarget;

  if (typeof window !== 'undefined') {
    const { port, pathname } = window.location;
    if (port === ADMIN_DEV_PORT) return 'admin';
    if (port === CLIENT_DEV_PORT) return 'client';
    if (pathname.startsWith('/admin')) return 'admin';
  }

  return 'client';
}
