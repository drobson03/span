# Span

A workout tracking app with analytics and calendar views. Built with TanStack Start (React), Drizzle ORM, and Neon Postgres.

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19, Vite, SSR)
- **Database:** PostgreSQL (Neon) with [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** [Better Auth](https://www.better-auth.com)
- **Styling:** Tailwind CSS v4, Radix UI, shadcn/ui
- **Charts:** Recharts
- **Validation:** Valibot

## Getting Started

### Prerequisites

- Node.js 22.x
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Copy env file and fill in your values
cp .env.example .env

# Push the database schema
pnpm db:push

# Start the dev server
pnpm dev
```

### Environment Variables

| Variable                      | Description                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                | Neon Postgres connection URL                                                               |
| `BETTER_AUTH_URL`             | This deployment's origin, e.g. `http://localhost:3000` or the exact preview/production URL |
| `BETTER_AUTH_SECRET`          | Auth secret unique to each environment                                                     |
| `GOOGLE_CLIENT_ID`            | Shared Google OAuth client ID                                                              |
| `GOOGLE_CLIENT_SECRET`        | Shared Google OAuth client secret                                                          |
| `OAUTH_PROXY_PRODUCTION_URL`  | Production origin used for Google callbacks, identical in every environment                |
| `OAUTH_PROXY_SECRET`          | Dedicated shared proxy secret, at least 32 characters, identical in every environment      |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Optional comma-separated additional trusted origins, including local and preview URLs      |

### Google OAuth proxy

The [Better Auth OAuth Proxy](https://better-auth.com/docs/plugins/oauth-proxy.md) routes local and preview sign-ins through production, so Google only needs one registered callback URL. Production sign-ins use the normal flow. The originating environment creates the user and session in its own database.

1. Deploy this configuration to production first. Set `BETTER_AUTH_URL` and `OAUTH_PROXY_PRODUCTION_URL` to the production origin (without `/api/auth`).
2. In the Google OAuth client, register `https://your-production-domain.example/api/auth/callback/google` as an authorized redirect URI, replacing the example domain with your production domain.
3. Generate a dedicated proxy secret with `openssl rand -hex 32`. Set it as `OAUTH_PROXY_SECRET` on production, previews, and localhost. Use the same Google client credentials and `OAUTH_PROXY_PRODUCTION_URL` everywhere; keep `BETTER_AUTH_SECRET` separate per environment.
4. Set `BETTER_AUTH_URL` to each deployment's own origin. For previews, supply the generated preview URL through your deployment environment; for local development, use `http://localhost:3000`.
5. On production and previews, set `BETTER_AUTH_TRUSTED_ORIGINS` to the allowed local/preview origins, for example `http://localhost:3000,https://your-preview-domain.example`. Better Auth also supports narrowly scoped wildcard patterns for preview domains you control. Avoid broad shared-host wildcards such as `https://*.vercel.app`. The deployment's own base URL is trusted automatically.

Production must be reachable for local and preview sign-ins. After deploying, verify Google sign-in on production, then on a preview or localhost: Google's callback should go to production, and the completed sign-in should return to the originating environment with a working session.

## Scripts

| Command        | Description               |
| -------------- | ------------------------- |
| `pnpm dev`     | Start dev server          |
| `pnpm build`   | Production build          |
| `pnpm start`   | Start production server   |
| `pnpm db:push` | Push schema changes to DB |
| `pnpm lint`    | Lint with Biome           |
| `pnpm format`  | Format with Prettier      |

## Project Structure

```
src/
├── components/    # UI components
├── hooks/         # React hooks
├── lib/
│   ├── client/    # Client-side utilities
│   └── server/    # Server-side code (auth, db, API functions)
└── routes/        # TanStack Router file-based routes
```
