# Span

Workout tracking with a calendar, tag filters, training heatmap, and exercise progression. The app uses [Foldkit](https://foldkit.dev/get-started.md), [Foldcn](https://foldcn.elianiva.com/) components, Effect 4, [Yielded Auth](https://yielded.dev/auth/guide/getting-started/), and Drizzle's native Effect PostgreSQL driver. [Alchemy](https://alchemy.run/getting-started.md) defines the Cloudflare deployment.

Requires Node.js 22.22.2 or newer and pnpm 12.6.0. PostgreSQL remains the application and authentication database; an existing Neon PostgreSQL connection works too.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

Fill in `.env` with your PostgreSQL URL, Google OAuth credentials, and exact application origin. Generate `AUTH_BINDING_SECRET` and `AUTH_TRANSACTION_SECRET` independently:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Keep these keys stable for each environment. The origin must be HTTPS in production; local development uses `http://localhost:3000`. Register `${AUTH_ORIGIN}/auth/google/callback` as an authorized redirect URI in your Google OAuth client. Configure each environment's callback URL. The previous Better Auth OAuth proxy is replaced by direct Yielded callbacks.

For a **new, empty PostgreSQL database**:

```bash
pnpm db:migrate
```

For an **existing Span database** created with the previous `db:push` command, take a backup and run this once:

```bash
pnpm db:adopt
```

Adoption checks the existing tables, records the baseline migration, and applies the new auth migration. It preserves user IDs, workout ownership, exercises, and Google identities. Old sessions are retained in their legacy table but are not accepted by Yielded; users sign in again. Subsequent migrations use `pnpm db:migrate`. Adoption refuses databases with existing migration history.

```bash
pnpm dev
```

This starts Vite on port 3000 and the Effect API on port 3001, with `/api` and `/auth` proxied through Vite. `pnpm dev:web` starts only the frontend and needs a separately running API for authentication and workouts.

Google sign-in uses durable PostgreSQL flow storage and request-bound cookies. A new Google user completes registration and then signs in again. Existing migrated Google identities sign in to their original user ID. Account ownership is based on Google's verified issuer and subject; email addresses do not link identities.

For a Node production server:

```bash
pnpm build
pnpm start
```

For Cloudflare, configure Alchemy's Cloudflare credentials and the same application environment variables, with `AUTH_ORIGIN` set to the deployment's exact HTTPS origin. The PostgreSQL server must be reachable from Workers. Secrets are bound as Cloudflare secrets by `alchemy.run.ts`; the Worker uses the same Effect HTTP routes and PostgreSQL adapter as Node.

```bash
pnpm dev:cloud
pnpm deploy
```

Alchemy owns the Foldkit asset build, Worker, and Cloudflare deployment state. Database migrations are a separate explicit step before deployment. `pnpm deploy` requires configured Cloudflare credentials; it is not part of building or testing locally.

| Command            | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `pnpm check`       | Type-check client, server, and infrastructure |
| `pnpm lint`        | Check with Biome                              |
| `pnpm test`        | PostgreSQL integration and application tests  |
| `pnpm build`       | Build the Foldkit application                 |
| `pnpm db:generate` | Generate a migration after changing schemas   |
| `pnpm db:migrate`  | Apply migrations                              |
| `pnpm db:adopt`    | Adopt an existing Span database once          |

Tests create isolated PGlite databases and exercise PostgreSQL semantics, including the production driver over the PostgreSQL wire protocol. They do not require or change your database or contact Google.

The UI follows Foldkit's model/update/view architecture in `src/main.ts`; copied Foldcn components live in `src/components/ui`. Shared Effect schemas and analytics are in `src/shared`. Server composition, Yielded persistence mappings, migrations, and workout handlers live in `src/server`. `src/worker.ts` adapts the HTTP app to Cloudflare; `src/server/node.ts` runs it on Node.

Effect is pinned to stable 4.0.0. Yielded, Alchemy, and the Drizzle Effect integration are pinned to compatible prerelease versions in `package.json` and the lockfile; update them together after checking their peer requirements. `patches/effect@4.0.0.patch` supplies compatibility aliases for Alchemy beta.79 and its SDKs, which still import the pre-stable `effect/unstable/*` and `effect/Encoding` paths. The aliases use stable Effect 4 implementations. Keep this patch until those dependencies update their imports.
