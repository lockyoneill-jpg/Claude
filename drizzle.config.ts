import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit reads this when generating and applying migrations.
 * DATABASE_URL is supplied by `node --env-file=.env.local` in the npm scripts,
 * so there's no extra config library to install.
 */
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and paste your " +
      "Supabase connection string into it before running a database command.",
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
