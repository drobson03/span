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

| Variable               | Description                  |
| ---------------------- | ---------------------------- |
| `DATABASE_URL`         | Neon Postgres connection URL |
| `DATABASE_AUTH_TOKEN`  | Database auth token          |

## Scripts

| Command        | Description                  |
| -------------- | ---------------------------- |
| `pnpm dev`     | Start dev server             |
| `pnpm build`   | Production build             |
| `pnpm test`    | Run workout regression tests |
| `pnpm start`   | Start production server      |
| `pnpm db:push` | Push schema changes to DB    |
| `pnpm lint`    | Lint with Biome              |
| `pnpm format`  | Format with Prettier         |

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

## Set weights

Each set records its own weight in kilograms and reps. The default exercise
weight fills the first set; subsequent sets copy the previous set’s weight.
Changing a set or the default weight does not change other recorded sets.
Workout history shows each set’s weight and reps, and charts calculate volume
as the sum of weight × reps for each set and maximum weight across sets.

Existing workouts use their exercise weight for sets that have no weight yet.
Editing and saving a workout writes an explicit weight on each set. This uses
the existing JSONB sets column, so no database migration is needed.
