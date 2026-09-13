# Vercel deployment — Client and Admin

SewaSync ships two production surfaces from this one repository, built by the
same `src/App.tsx` entrypoint and split by which of two build scripts runs:

| Surface | Local dev | Build script | Renders |
|---|---|---|---|
| Client (SOS + booking app) | `pnpm dev:client` — `:3001` | `pnpm build:client` | The screen router in `src/App.tsx` |
| Admin (Ops console) | `pnpm dev:admin` — `:3002` | `pnpm build:admin` | `src/components/admin/AdminDashboard` directly, no client router |

Both scripts set `VITE_APP_TARGET` (`client` / `admin`), which
`src/lib/appTarget.ts` reads to decide what `App()` renders. See that file's
comment for the full precedence (env var → dev-server port → `/admin` path
prefix → default `client`).

`pnpm dev` runs Client + Admin together via `concurrently`. The Technician
surface (`apps/technician`, port 3003) is untouched by this split — run it
with `pnpm dev:technician`, or all three with `pnpm dev:all`.

## Two Vercel projects, one repository

Vercel deploys by **Project**, not by build target, so Client and Admin need
**two separate Vercel projects**, both pointing at this same GitHub
repository. Root Directory is `.` (repo root) for both — there is no
`apps/admin` directory; the split happens in the build script and the shared
entrypoint, as above.

The committed [`vercel.json`](../vercel.json) supplies the **Client**
defaults (`pnpm build:client`, output `dist`, SPA rewrite to `index.html`).
A Vercel project's own dashboard settings override `vercel.json` when set
explicitly, so the Admin project only needs one override.

### 1. Client project

Import the repo as a new Vercel project and accept the defaults from
`vercel.json`. No dashboard changes needed beyond environment variables (§3).

### 2. Admin project

Import the repo again as a **second** Vercel project, then in
**Settings → Build & Development Settings**, override:

- **Build Command:** `pnpm build:admin`
- **Output Directory:** `dist` (unchanged)
- **Install Command:** `pnpm install --frozen-lockfile` (unchanged)

Everything else (framework, rewrite) is inherited from `vercel.json`.

Consider also setting **Settings → Deployment Protection** (Vercel
Authentication or a password) on this project, and an
`X-Robots-Tag: noindex` response header under **Settings → Headers** — the
Ops console has no auth of its own yet (see Known gaps below) and should not
be indexable. Do this per-project in the dashboard, not in the committed
`vercel.json`, since that file is shared with the public-facing Client
project.

### 3. Environment variables

Both projects need the same two build-time variables (from
[`.env.example`](../.env.example)), pointed at your actual Supabase project
rather than `127.0.0.1`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (the anon/public key — never the service_role key)

Do **not** set `VITE_APP_TARGET` in either project's environment variables.
It's fixed by the build script (`build:client` / `build:admin`) already; an
env var override there would fight with a value the script sets inline and
Vite would need to reconcile, which is exactly the ambiguity
`src/lib/appTarget.ts`'s comment warns against for local `.env` files.

## Known gaps

- **The Admin build now requires a real `platform_staff` row**, not just any
  Supabase session — `src/App.tsx` checks `staffRole` from `AuthContext` and
  shows "Not authorised" for a signed-in client/technician. Vercel Deployment
  Protection (above) is still worth keeping as a second layer.
- **`AdminDashboard`'s "Exit Console" button is inert on this deployment.**
  It's wired to a `navigate` callback that only makes sense inside the
  client screen router (see the comment in `src/App.tsx` above the
  `target === 'admin'` branch). Fine for now; revisit if Admin gets real
  navigation (e.g. a logout).
- **`apps/clients` (port 3002) predates this split** and is a second,
  independent way to run the Client build locally via the pnpm workspace
  filter. It now hardcodes `VITE_APP_TARGET=client` so it can't be
  misdetected as Admin by its port (3002 is also the new `dev:admin` port —
  they're never meant to run at the same time). Prefer `pnpm dev:client`
  going forward.
