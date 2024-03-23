import { remember } from "@epic-web/remember";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";
import { db } from "~/server/db";
import { type User, session, user } from "~/server/schema";
import { Google } from "arctic";
import { env } from "~/server/env";

export const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI,
);

export const lucia = remember("lucia", () => {
  const adapter = new DrizzleSQLiteAdapter(db, session, user);

  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: process.env.NODE_ENV === "production",
      },
    },
    getUserAttributes: (attributes) => {
      return {
        name: attributes.name,
        googleId: attributes.googleId,
      };
    },
  });
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: Pick<User, "name" | "googleId">;
  }
}
