import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { agents, buyers, searchProfiles } from "@/db/schema";
import type { BuyerStatus, FinanceStatus } from "@/lib/domain";

export type BuyerRow = {
  id: string;
  firstName: string;
  lastName: string;
  status: BuyerStatus;
  finance: FinanceStatus;
  agentName: string | null;
  suburbs: string[];
  priceMin: number | null;
  priceMax: number | null;
  stretchMax: number | null;
  lastContactedAt: Date | null;
  createdAt: Date;
};

/**
 * Buyers for the list screen (section 9).
 *
 * Search, filters and sorting arrive in Session 3. For now this returns the
 * agency's buyers by surname so the seeded data is easy to scan.
 *
 * A buyer can hold more than one search profile. The table shows their first
 * active one, which in the seeded data is the primary brief — the buyer page
 * in Session 3 is where all of a buyer's profiles get shown properly.
 */
export async function listBuyers(agencyId: string): Promise<BuyerRow[]> {
  const rows = await db
    .select({
      id: buyers.id,
      firstName: buyers.firstName,
      lastName: buyers.lastName,
      status: buyers.status,
      finance: buyers.finance,
      lastContactedAt: buyers.lastContactedAt,
      createdAt: buyers.createdAt,
      agentName: agents.name,
      profileId: searchProfiles.id,
      suburbs: searchProfiles.suburbs,
      alsoConsiderSuburbs: searchProfiles.alsoConsiderSuburbs,
      priceMin: searchProfiles.priceMin,
      priceMax: searchProfiles.priceMax,
      stretchMax: searchProfiles.stretchMax,
      profileCreatedAt: searchProfiles.createdAt,
    })
    .from(buyers)
    .leftJoin(agents, eq(agents.id, buyers.assignedAgentId))
    .leftJoin(
      searchProfiles,
      and(
        eq(searchProfiles.buyerId, buyers.id),
        eq(searchProfiles.agencyId, agencyId),
        eq(searchProfiles.active, true),
      ),
    )
    .where(and(eq(buyers.agencyId, agencyId), isNull(buyers.archivedAt)))
    .orderBy(asc(buyers.lastName), asc(buyers.firstName), asc(searchProfiles.createdAt));

  // The join fans out one row per profile, so keep the first profile per buyer.
  const seen = new Set<string>();
  const result: BuyerRow[] = [];

  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);

    result.push({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      status: row.status,
      finance: row.finance,
      agentName: row.agentName,
      suburbs: row.suburbs ?? [],
      priceMin: row.priceMin,
      priceMax: row.priceMax,
      stretchMax: row.stretchMax,
      lastContactedAt: row.lastContactedAt,
      createdAt: row.createdAt,
    });
  }

  return result;
}
