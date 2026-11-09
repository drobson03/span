# Span

A workout tracking app with analytics and calendar views. Built with TanStack Start (React), Drizzle ORM, and Neon Postgres, deployed to Cloudflare Workers with [Alchemy](https://alchemy.run).

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19, Vite, SSR)
- **Hosting:** Cloudflare Workers, deployed with [Alchemy](https://alchemy.run) (`alchemy.run.ts`)
- **Database:** PostgreSQL (Neon) through [Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/), with [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** [Better Auth](https://www.better-auth.com)
- **Styling:** Tailwind CSS v4, Radix UI, shadcn/ui
- **Charts:** Recharts
- **Validation:** Valibot

## Getting Started

### Prerequisites

- Node.js 24.x
- pnpm
- A Cloudflare account and a Neon API key, configured with `pnpm exec alchemy profile edit --add Cloudflare --add Neon` (or `CLOUDFLARE_*` / `NEON_API_KEY` in the environment for CI)

### Stages

`alchemy.run.ts` declares one Worker (`Cloudflare.Website.Vite`) bound to a Hyperdrive connection.

- **`prod`** adopts the existing Neon project named by `NEON_PROJECT_NAME`, and is served from the hostname of `BETTER_AUTH_URL` as a Worker custom domain (its zone must be on the Cloudflare account). The project is retained if the stage is destroyed.
- **Every other stage** (`alchemy dev` uses `dev_$USER`, CI uses `pr-<number>`) gets its own copy-on-write Neon branch of production, with migrations applied, and its own generated `BETTER_AUTH_SECRET`, never production's. Previews are public URLs behind the same sign-in as production.

Destroying a non-production stage deletes its branch. Preview branches also expire after 14 days without a deploy, in case cleanup never runs.

`prod` must be deployed before any other stage can branch from it.

### CI and PR previews

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys `prod` on every push to `main`, deploys `pr-<number>` for each pull request, and destroys it when the PR closes. Previews are served at `https://span-pr-<number>.<WORKERS_SUBDOMAIN>.workers.dev` and linked from the PR's deployments. PRs from forks or Dependabot never deploy, because they don't receive secrets.

Create two GitHub environments:

- **`production`**: restrict deployment branches to `main`.
- **`preview`**: used by preview deploys and cleanup.

| Name                          | Kind     | `production` | `preview` |
| ----------------------------- | -------- | :----------: | :-------: |
| `CLOUDFLARE_API_TOKEN`        | secret   |      ✓       |     ✓     |
| `CLOUDFLARE_ACCOUNT_ID`       | secret   |      ✓       |     ✓     |
| `NEON_API_KEY`                | secret   |      ✓       |     ✓     |
| `GOOGLE_CLIENT_ID`            | variable |      ✓       |     ✓     |
| `GOOGLE_CLIENT_SECRET`        | secret   |      ✓       |     ✓     |
| `OAUTH_PROXY_PRODUCTION_URL`  | variable |      ✓       |     ✓     |
| `OAUTH_PROXY_SECRET`          | secret   |      ✓       |     ✓     |
| `NEON_PROJECT_NAME`           | variable |      ✓       |           |
| `BETTER_AUTH_URL`             | variable |      ✓       |           |
| `BETTER_AUTH_SECRET`          | secret   |      ✓       |           |
| `BETTER_AUTH_TRUSTED_ORIGINS` | variable |      ✓       |           |
| `WORKERS_SUBDOMAIN`           | variable |              |     ✓     |

So sign-in works on previews, production's `BETTER_AUTH_TRUSTED_ORIGINS` must include `https://span-pr-*.<WORKERS_SUBDOMAIN>.workers.dev`.

### First production deploy

```bash
pnpm install

# Production config: set NEON_PROJECT_NAME and the production BETTER_AUTH_URL
cp .env.example .env.prod

# Adopt the existing Neon project (only needed once)
pnpm deploy:prod --adopt
```

After that, use `pnpm deploy:prod`.

### Local development

```bash
# Local config: BETTER_AUTH_URL=http://localhost:3000
cp .env.example .env

# Vite dev server with HMR, connected to this stage's Neon branch
pnpm dev
```

### Schema changes

Migrations live in `migrations/` and are applied by Alchemy on deploy, to the production project on `prod` and to each stage's branch elsewhere. Alchemy records applied migrations in the `__alchemy_migrations` table.

```bash
# After editing src/lib/server/db/schema, generate a migration and commit it
pnpm db:generate

# Apply it to your own branch first, then production
pnpm exec alchemy deploy
pnpm deploy:prod
```

### Environment Variables

`alchemy.run.ts` reads these at deploy time and binds them to the Worker. Secrets are bound as `secret_text`. Locally, `prod` deploys read `.env.prod` and other stages read `.env`; CI reads GitHub environment secrets and variables (see above).

| Variable                      | Description                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `NEON_PROJECT_NAME`           | Name of the existing Neon project adopted by the `prod` stage                                     |
| `BETTER_AUTH_URL`             | This deployment's origin, e.g. `http://localhost:3000`. Previews derive it from their hostname    |
| `BETTER_AUTH_SECRET`          | Production's auth secret. Other stages generate their own                                         |
| `GOOGLE_CLIENT_ID`            | Shared Google OAuth client ID                                                                     |
| `GOOGLE_CLIENT_SECRET`        | Shared Google OAuth client secret                                                                 |
| `OAUTH_PROXY_PRODUCTION_URL`  | Production origin used for Google callbacks, identical in every environment                       |
| `OAUTH_PROXY_SECRET`          | Dedicated shared proxy secret, at least 32 characters, identical in every environment             |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Optional comma-separated additional trusted origins, including local and preview URLs             |
| `WORKERS_SUBDOMAIN`           | Previews only: the account's `workers.dev` subdomain                                              |

### Google OAuth proxy

Each deployment binds its own `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_TRUSTED_ORIGINS`, while `OAUTH_PROXY_PRODUCTION_URL` and `OAUTH_PROXY_SECRET` go to the proxy plugin, so previews can use their own base URL and auth secret while sharing the production callback and proxy encryption key.

The [Better Auth OAuth Proxy](https://better-auth.com/docs/plugins/oauth-proxy.md) routes local and preview sign-ins through production, so Google only needs one registered callback URL. Production sign-ins use the normal flow. The originating environment creates the user and session in its own database.

1. Deploy this configuration to production first. Set `BETTER_AUTH_URL` and `OAUTH_PROXY_PRODUCTION_URL` to the production origin (without `/api/auth`).
2. In the Google OAuth client, register `https://your-production-domain.example/api/auth/callback/google` as an authorized redirect URI, replacing the example domain with your production domain.
3. Generate a dedicated proxy secret with `openssl rand -hex 32`. Set it as `OAUTH_PROXY_SECRET` on production, previews, and localhost. Use the same Google client credentials and `OAUTH_PROXY_PRODUCTION_URL` everywhere. `BETTER_AUTH_SECRET` is only set for production; other stages generate their own.
4. Set `BETTER_AUTH_URL` to production's origin, and to `http://localhost:3000` for local development. Previews derive theirs from `span-pr-<number>.<WORKERS_SUBDOMAIN>.workers.dev`.
5. On production, set `BETTER_AUTH_TRUSTED_ORIGINS` to the allowed local and preview origins (comma-separated without spaces), for example `http://localhost:3000,https://span-pr-*.<WORKERS_SUBDOMAIN>.workers.dev`. Keep wildcards scoped to your own subdomain. The deployment's own base URL is trusted automatically.

Production must be reachable for local and preview sign-ins. After deploying, verify Google sign-in on production, then on a preview or localhost: Google's callback should go to production, and the completed sign-in should return to the originating environment with a working session.

## Scripts

| Command                         | Description                                          |
| ------------------------------- | ---------------------------------------------------- |
| `pnpm dev`                      | `alchemy dev`: Vite dev server against a Neon branch |
| `pnpm deploy:prod`              | Deploy the `prod` stage using `.env.prod`            |
| `pnpm exec alchemy deploy`      | Deploy a personal `live_$USER` stage using `.env`    |
| `pnpm exec alchemy destroy`     | Tear down a non-production stage and its Neon branch |
| `pnpm db:generate`             | Generate a migration from schema changes             |
| `pnpm lint`                     | Lint with Biome                                      |
| `pnpm format`                   | Format with Prettier                                 |

## Project Structure

```
alchemy.run.ts     # Alchemy stack: Worker, Hyperdrive, Neon
infra/             # Deploy-time resources (Neon project/branch, Hyperdrive)
migrations/        # drizzle-kit migrations, applied by Alchemy
src/
├── components/    # UI components
├── hooks/         # React hooks
├── lib/
│   ├── client/    # Client-side utilities
│   └── server/    # Server-side code (auth, db, API functions)
└── routes/        # TanStack Router file-based routes
```
