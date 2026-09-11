import { db } from "@/db";
import { agencies, type Agency } from "@/db/schema";

/**
 * Phase 1 has exactly one agency and no login, so "the current agency" is
 * simply the seeded one.
 *
 * Everything else in the app takes an `agencyId` and filters by it. That means
 * when Phase 5 adds real accounts, this function is the only thing that has to
 * change — it starts returning the signed-in user's agency instead.
 */
export async function getCurrentAgency(): Promise<Agency> {
  const [agency] = await db.select().from(agencies).limit(1);

  if (!agency) {
    throw new Error(
      "No agency found. Run `npm run db:seed` to load the demo data.",
    );
  }

  return agency;
}
