import { NodeRuntime } from "@effect/platform-node";
import * as PgClient from "@effect/sql-pg/PgClient";
import * as Drizzle from "drizzle-orm/effect-postgres";
import { migrate } from "drizzle-orm/effect-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Config, Effect, Redacted, Schema } from "effect";
import { SqlClient } from "effect/sql";

class MigrationError extends Schema.TaggedError<MigrationError>()(
  "MigrationError",
  { message: Schema.String },
) {}

export const adoptBaseline = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const baseline = readMigrationFiles({ migrationsFolder: "./migrations" })[0]!;
  return yield* sql.withTransaction(
    Effect.gen(function* () {
      yield* sql`select pg_advisory_xact_lock(1936744814)`;
      const columns = yield* sql<{
        table_name: string;
        column_name: string;
      }>`select table_name, column_name from information_schema.columns where table_schema = 'public'`;
      const required: Record<string, string[]> = {
        user: ["id", "email", "banned", "created_at", "updated_at"],
        account: ["id", "account_id", "provider_id", "user_id"],
        session: ["id", "token", "user_id"],
        verification: ["id", "identifier", "value"],
        workout: ["id", "user_id", "date", "tags"],
        exercise: [
          "id",
          "workout_id",
          "exercise_type_id",
          "sets",
          "weight",
          "target_reps",
        ],
        exercise_type: ["id", "name"],
      };
      for (const [table, names] of Object.entries(required)) {
        for (const column of names) {
          if (
            !columns.some(
              (c) => c.table_name === table && c.column_name === column,
            )
          ) {
            return yield* new MigrationError({
              message: `Cannot adopt existing database: missing ${table}.${column}. Use db:migrate on an empty database.`,
            });
          }
        }
      }
      yield* sql.unsafe("CREATE SCHEMA IF NOT EXISTS drizzle");
      yield* sql.unsafe(
        "CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint, name text, applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP)",
      );
      const existing = yield* sql`select id from drizzle.__drizzle_migrations`;
      if (existing.length) {
        return yield* new MigrationError({
          message: "Database already has migration history; use db:migrate.",
        });
      }
      yield* sql`insert into drizzle.__drizzle_migrations (hash, created_at, name) values (${baseline.hash}, ${baseline.folderMillis}, ${baseline.name})`;
    }),
  );
});
if (process.argv[1]?.endsWith("/migrate.ts")) {
  NodeRuntime.runMain(
    Effect.gen(function* () {
      const url = yield* Config.String("DATABASE_URL");
      yield* Effect.gen(function* () {
        if (process.argv.includes("--adopt-existing")) {
          yield* adoptBaseline;
        }
        const db = yield* Drizzle.makeWithDefaults({});
        yield* migrate(db, { migrationsFolder: "./migrations" });
        yield* Effect.log("PostgreSQL migrations applied");
      }).pipe(Effect.provide(PgClient.layer({ url: Redacted.make(url) })));
    }),
  );
}
