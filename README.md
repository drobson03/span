# Span

A workout tracking app with analytics and calendar views. Built with TanStack Start (React), Drizzle ORM, and Neon Postgres.

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19, Vite, SSR)
- **Hosting:** Cloudflare Workers and static assets, managed by [Alchemy](https://alchemy.run)
- **Database:** PostgreSQL (Neon) through Cloudflare Hyperdrive with [Drizzle ORM](https://orm.drizzle.team)
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
pnpm install
cp .env.example .env
```

Fill in the existing Neon identifiers and auth credentials when ready to connect. They are not required for Vite builds:

```bash
pnpm typecheck
pnpm build
```

## Alchemy architecture

The `Span` stack in `alchemy.run.ts` composes the documented [TanStack Start](https://alchemy.run/cloudflare/frontend/tanstack-start.md) and [Neon](https://alchemy.run/neon/index.md) integrations, with [Better Auth](https://better-auth.com/docs/integrations/tanstack) running inside the website:

- `Website`: `Cloudflare.Website.Vite` serves TanStack Start SSR, static assets, and server functions. Vite config contains only the app's normal plugins; `alchemy dev` and deploy inject the Cloudflare integration.
- Better Auth runs directly in the website Worker using the Drizzle adapter and existing schema. The `/api/auth/*` route calls its handler, and server functions read sessions directly. The TanStack Start cookie plugin forwards session cookies to the response.
- `Database`: an Alchemy `Neon.Branch` adopts the existing branch in the existing project. Hyperdrive derives its origin from this resource output. No manually copied database URL is needed for deployment. Existing tables, users, sessions, and workouts remain in place.
- `Hyperdrive`: a [Cloudflare Hyperdrive connection](https://alchemy.run/cloudflare/data/hyperdrive.md) fronts the existing Neon branch and is bound to the website as `HYPERDRIVE`. Production uses the direct Neon origin; local Alchemy development uses Neon's pooled origin. Query caching is disabled so session checks and workout reads reflect writes immediately. Both Better Auth and app queries use Drizzle's `node-postgres` adapter. Clients are created inside requests and closed when released; Hyperdrive manages the origin connection pool.

There is no R2 resource. Cloudflare-hosted Alchemy state uses its own state-store Worker and Durable Object.

### Existing database protection

Adoption uses [Alchemy's built-in adoption workflow](https://alchemy.run/cli/adopting-resources.md). The pinned Neon provider returns ordinary attributes for an existing branch, so Alchemy adopts it automatically without `--adopt`. That flag permits ownership takeovers across the stack; it does not prevent creation when a resource is missing. Our provider guard adds that separate restriction and deletion protection; it does not implement adoption itself.

`NEON_PROJECT_ID` and `NEON_BRANCH_ID` are required only when planning/deploying. `infra/database.ts` verifies the branch through Neon's API and requires exactly one database on it, matching Alchemy's primary-database connection selection. A missing branch or missing identifiers fail; the provider guard refuses creation/replacement and retargeting. The branch is retained on stack removal, and deletion is disabled in this stack's Neon provider. A separate stage can target a different existing branch by using another env file.

The project itself stays outside this stack's ownership. No new project or branch is provisioned. Auth does not run schema migrations; the existing Drizzle schema is used as-is. Keep the current `BETTER_AUTH_SECRET` and `OAUTH_PROXY_SECRET` when moving hosting. The Drizzle adapter preserves the app's existing relations and queries.

### Configuration

| Setting                                     | Purpose                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `NEON_PROJECT_ID`                           | Existing Neon project ID                                                                                 |
| `NEON_BRANCH_ID`                            | Existing branch ID (not its display name)                                                                |
| `BETTER_AUTH_URL`                           | Website origin: `https://span.darcyr.dev` in production, localhost or the exact preview origin elsewhere |
| `BETTER_AUTH_SECRET`                        | Existing signing secret for that environment                                                             |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Existing Google OAuth credentials                                                                        |
| `OAUTH_PROXY_SECRET`                        | Existing shared proxy secret, at least 32 characters                                                     |
| `BETTER_AUTH_TRUSTED_ORIGINS`               | Optional comma-separated additional trusted local/preview origins                                        |
| `DATABASE_URL`                              | Optional for manually running `db:push`; the website uses `HYPERDRIVE`                                 |

Auth configuration is bound directly to the website Worker. Secret values use `Config.Redacted`; the database connection is supplied by the `HYPERDRIVE` binding. Management API credentials stay in Alchemy profiles, not in the website's bindings. Do not prefix secrets with `VITE_`.

### Production and Google sign-in

The `prod` stage attaches `span.darcyr.dev` as the website's custom domain. `darcyr.dev` must already be in the connected Cloudflare account. Other stages do not attach that domain. Set production's `BETTER_AUTH_URL` to `https://span.darcyr.dev` as shown in `.env.production.example`.

The OAuth proxy's production origin is `https://span.darcyr.dev` in every stage. Register this Google redirect URI:

```text
https://span.darcyr.dev/api/auth/callback/google
```

Production must be reachable for local/preview OAuth proxy sign-in. Share the Google credentials and proxy secret across environments, preserve production's signing secret, and explicitly allow the local/preview return origins through `BETTER_AUTH_TRUSTED_ORIGINS`. Google, the admin plugin, and the existing database schema are preserved. Cookie handling uses the Better Auth TanStack Start plugin inside the website Worker.

### Connect and deploy when ready

Copy `.env.production.example` to the ignored `.env.production` and supply the existing identifiers and secrets. Configure both provider profiles interactively:

```bash
pnpm alchemy profile edit --add Cloudflare
pnpm alchemy profile edit --add Neon
```

After confirming the individual deployment:

```bash
pnpm alchemy deploy --stage prod --env-file .env.production
```

Alchemy resolves the existing branch by ID/name through Neon, adopts it, provisions Hyperdrive, and deploys the website Worker. Review the plan before accepting it. Verify the returned `websiteUrl`, `databaseBranchId`, and `hyperdriveId`, then check Google sign-in and authenticated workout reads/writes. These live checks require real credentials.

### Development and checks

`pnpm dev` runs `alchemy dev` with HMR and real service/database bindings. It can deploy resources, so confirm before running it. It reads `.env` by default; use `pnpm alchemy dev --stage dev --env-file <file>` to select another environment. Configure an existing development branch if you do not want development requests to use production data.

`pnpm build` runs `vite build` to compile the website without evaluating the Alchemy stack or accessing cloud accounts.

`pnpm db:push` remains an explicit schema-changing command using a separately supplied `DATABASE_URL`. Do not run it merely to move hosting. This project has no committed migration history; introducing managed migrations for existing data requires a verified baseline first.

## Scripts

| Command              | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `pnpm dev`           | Alchemy-managed development; may deploy resources         |
| `pnpm build`         | Build the website with Vite    |
| `pnpm deploy`        | Alchemy deployment; confirm before running                |
| `pnpm typecheck`     | Check app and infrastructure TypeScript                   |
| `pnpm db:push`       | Explicitly push schema changes to the configured database |
| `pnpm lint`          | Lint with Biome                                           |
| `pnpm format`        | Format with Prettier                                      |

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
