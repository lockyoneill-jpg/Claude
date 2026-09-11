import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.ts";

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Next.js reloads modules on every edit in development, which would open a new
 * pool of database connections each time until Supabase refuses more. Caching
 * on `globalThis` keeps one pool across reloads.
 */
const globalForDb = globalThis as unknown as {
  buyerHubClient?: ReturnType<typeof postgres>;
  buyerHubDb?: Db;
};

function connect(): Db {
  if (globalForDb.buyerHubDb) return globalForDb.buyerHubDb;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and paste " +
        "your Supabase connection string into it, then restart the app.",
    );
  }

  const client =
    globalForDb.buyerHubClient ??
    postgres(url, {
      // Supabase's transaction pooler doesn't support prepared statements.
      // Turning them off means the same connection string works whether the
      // pooled or the direct port is used.
      prepare: false,
    });

  const instance = drizzle(client, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.buyerHubClient = client;
    globalForDb.buyerHubDb = instance;
  }

  return instance;
}

/**
 * The database handle.
 *
 * Connecting is deferred until the first query rather than happening when this
 * module is imported. That matters for two reasons: `next build` imports every
 * page to collect its data and would otherwise fail on a machine with no
 * DATABASE_URL set, and a missing connection string should surface as the
 * app's own "The database isn't connected yet" screen rather than a crash on
 * import.
 */
export const db = new Proxy({} as Db, {
  get(_target, property, receiver) {
    const real = connect();
    const value = Reflect.get(real as object, property, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
