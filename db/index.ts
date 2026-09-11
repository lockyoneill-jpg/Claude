import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

function connectionString(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and paste " +
        "your Supabase connection string into it, then restart the app.",
    );
  }

  return url;
}

/**
 * Next.js reloads modules on every edit in development, which would open a new
 * pool of database connections each time until Supabase refuses more. Caching
 * the client on `globalThis` keeps one pool across reloads.
 */
const globalForDb = globalThis as unknown as {
  buyerHubClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.buyerHubClient ??
  postgres(connectionString(), {
    // Supabase's transaction pooler doesn't support prepared statements.
    // Turning them off means the same connection string works whether you
    // use the pooled or the direct port.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.buyerHubClient = client;
}

export const db = drizzle(client, { schema });

export { schema };
