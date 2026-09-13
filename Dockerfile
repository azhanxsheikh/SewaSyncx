# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
#   VITE_SUPABASE_ANON_KEY is the public anon key: it is compiled into the
#   browser bundle by design and access is enforced by Row-Level Security.
#   Never pass a service_role key or any other secret as a build argument.

# -----------------------------------------------------------------------------
# Stage 1: type-check and bundle the SPA
# -----------------------------------------------------------------------------
FROM node:22-alpine AS build

# Matches .mise.toml.
ARG PNPM_VERSION=10.34.3
RUN npm install --global --no-fund --no-audit pnpm@${PNPM_VERSION}

WORKDIR /app

# Manifests first so the dependency layer is cached until the lockfile changes.
# --frozen-lockfile validates every workspace package (pnpm-workspace.yaml:
# apps/*, packages/*), so every manifest must be present. The root postinstall
# runs scripts/patch-vite.cjs, so it is needed before install too.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/patch-vite.cjs scripts/
COPY apps/admin/package.json apps/admin/
COPY apps/client/package.json apps/client/
COPY apps/technician/package.json apps/technician/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=sewasync-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

COPY . .

# Vite inlines VITE_* variables at build time; they cannot be changed at runtime.
ARG VITE_SUPABASE_URL=http://127.0.0.1:54321
ARG VITE_SUPABASE_ANON_KEY=
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# `vite build` strips types without checking them, so type-check explicitly.
RUN pnpm type-check && pnpm build

# -----------------------------------------------------------------------------
# Stage 2: static server
# -----------------------------------------------------------------------------
FROM nginx:1.31-alpine AS runtime

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --start-interval=1s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1/index.html"]
