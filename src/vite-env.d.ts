/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Selects the client app vs. the standalone Ops Admin console. Set by the
   * `dev:*` / `build:*` scripts in package.json, or by each Vercel project's
   * build command override — see src/lib/appTarget.ts. Not read from `.env`:
   * setting it there would force every local dev server to one target
   * regardless of which port it's running on.
   */
  readonly VITE_APP_TARGET?: 'client' | 'admin';
  /**
   * Start of the technician's simulated route when localhost has no GPS
   * (apps/technician useTechnicianBroadcaster). Defaults to Gaur City.
   */
  readonly VITE_DEV_TECH_LAT?: string;
  readonly VITE_DEV_TECH_LNG?: string;
}
