import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  activities as activitiesTable,
  agents as agentsTable,
  buyers as buyersTable,
  properties as propertiesTable,
  searchProfiles as profilesTable,
  type Activity,
  type Agent,
  type Buyer,
  type SearchProfile,
} from "@/db/schema";
import type { BuyerStatus, FinanceStatus } from "@/lib/domain";
import { needsCheckIn } from "@/lib/format";

export type BuyerRow = {
  id: string;
  firstName: string;
  lastName: string;
  status: BuyerStatus;
  finance: FinanceStatus;
  agentId: string | null;
  agentName: string | null;
  /** From the buyer's first active profile — what the table shows. */
  suburbs: string[];
  priceMin: number | null;
  priceMax: number | null;
  stretchMax: number | null;
  lastContactedAt: Date | null;
  createdAt: Date;
  needsCheckIn: boolean;
  /** Across every active profile — what the suburb and price filters use. */
  allSuburbs: string[];
  profileCount: number;
};

export type BuyerSort =
  | "name"
  | "status"
  | "agent"
  | "budget"
  | "last_contacted";

export type BuyerFilters = {
  search?: string;
  status?: BuyerStatus;
  agentId?: string;
  suburb?: string;
  priceMin?: number;
  priceMax?: number;
  finance?: FinanceStatus;
  staleOnly?: boolean;
  sort?: BuyerSort;
  direction?: "asc" | "desc";
};

/**
 * Buyers for the list screen (section 9).
 *
 * Filtering and sorting happen here in the page rather than in SQL. At Phase 1
 * scale that is simpler to read and fast enough; `LATER.md` records the point
 * at which it should move into the query.
 */
export async function listBuyers(
  agencyId: string,
  filters: BuyerFilters = {},
): Promise<BuyerRow[]> {
  const [buyerRows, profileRows] = await Promise.all([
    db
      .select({ buyer: buyersTable, agent: agentsTable })
      .from(buyersTable)
      .leftJoin(agentsTable, eq(agentsTable.id, buyersTable.assignedAgentId))
      .where(
        and(eq(buyersTable.agencyId, agencyId), isNull(buyersTable.archivedAt)),
      ),
    db
      .select()
      .from(profilesTable)
      .where(
        and(
          eq(profilesTable.agencyId, agencyId),
          eq(profilesTable.active, true),
        ),
      )
      .orderBy(asc(profilesTable.createdAt)),
  ]);

  const profilesByBuyer = new Map<string, SearchProfile[]>();
  for (const row of profileRows) {
    const list = profilesByBuyer.get(row.buyerId) ?? [];
    list.push(row);
    profilesByBuyer.set(row.buyerId, list);
  }

  let rows: BuyerRow[] = buyerRows.map(({ buyer, agent }) => {
    const profiles = profilesByBuyer.get(buyer.id) ?? [];
    const primary = profiles[0];

    return {
      id: buyer.id,
      firstName: buyer.firstName,
      lastName: buyer.lastName,
      status: buyer.status,
      finance: buyer.finance,
      agentId: agent?.id ?? null,
      agentName: agent?.name ?? null,
      suburbs: primary?.suburbs ?? [],
      priceMin: primary?.priceMin ?? null,
      priceMax: primary?.priceMax ?? null,
      stretchMax: primary?.stretchMax ?? null,
      lastContactedAt: buyer.lastContactedAt,
      createdAt: buyer.createdAt,
      needsCheckIn: needsCheckIn(
        buyer.status,
        buyer.lastContactedAt,
        buyer.createdAt,
      ),
      allSuburbs: [
        ...new Set(
          profiles.flatMap((p) => [...p.suburbs, ...p.alsoConsiderSuburbs]),
        ),
      ],
      profileCount: profiles.length,
    };
  });

  /* ---- Filters --------------------------------------------------------- */

  const search = filters.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter((row) =>
      `${row.firstName} ${row.lastName}`.toLowerCase().includes(search),
    );
  }

  if (filters.status) rows = rows.filter((r) => r.status === filters.status);
  if (filters.agentId) rows = rows.filter((r) => r.agentId === filters.agentId);
  if (filters.finance) rows = rows.filter((r) => r.finance === filters.finance);
  if (filters.staleOnly) rows = rows.filter((r) => r.needsCheckIn);

  if (filters.suburb) {
    rows = rows.filter((r) => r.allSuburbs.includes(filters.suburb!));
  }

  // A buyer is in range if their budget overlaps the range asked for. Someone
  // who set no budget is kept: we don't know that they're outside it.
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    const low = filters.priceMin ?? 0;
    const high = filters.priceMax ?? Number.MAX_SAFE_INTEGER;
    rows = rows.filter((r) => {
      const top = r.stretchMax ?? r.priceMax;
      if (r.priceMin === null && top === null) return true;
      return (top ?? Number.MAX_SAFE_INTEGER) >= low && (r.priceMin ?? 0) <= high;
    });
  }

  /* ---- Sort ------------------------------------------------------------ */

  const direction = filters.direction ?? "asc";
  const flip = direction === "desc" ? -1 : 1;
  const byName = (a: BuyerRow, b: BuyerRow) =>
    `${a.lastName} ${a.firstName}`.localeCompare(
      `${b.lastName} ${b.firstName}`,
      "en-AU",
    );

  rows.sort((a, b) => {
    switch (filters.sort) {
      case "status":
        return flip * a.status.localeCompare(b.status) || byName(a, b);
      case "agent":
        return (
          flip * (a.agentName ?? "").localeCompare(b.agentName ?? "", "en-AU") ||
          byName(a, b)
        );
      case "budget": {
        // Never-set budgets sort last whichever way the column is pointed.
        const av = a.priceMax ?? a.stretchMax ?? a.priceMin;
        const bv = b.priceMax ?? b.stretchMax ?? b.priceMin;
        if (av === null && bv === null) return byName(a, b);
        if (av === null) return 1;
        if (bv === null) return -1;
        return flip * (av - bv) || byName(a, b);
      }
      case "last_contacted": {
        // Never-contacted sorts last whichever way the column is pointed.
        const av = a.lastContactedAt?.getTime() ?? null;
        const bv = b.lastContactedAt?.getTime() ?? null;
        if (av === null && bv === null) return byName(a, b);
        if (av === null) return 1;
        if (bv === null) return -1;
        return flip * (bv - av) || byName(a, b);
      }
      default:
        return flip * byName(a, b);
    }
  });

  return rows;
}

/* -------------------------------------------------------------------------
 * One buyer, for the buyer page
 * ---------------------------------------------------------------------- */

export type TimelineEntry = Activity & {
  agentName: string | null;
  propertyAddress: string | null;
};

export type BuyerDetail = {
  buyer: Buyer;
  agent: Agent | null;
  profiles: SearchProfile[];
  timeline: TimelineEntry[];
};

export async function getBuyerDetail(
  agencyId: string,
  buyerId: string,
): Promise<BuyerDetail | null> {
  const [row] = await db
    .select({ buyer: buyersTable, agent: agentsTable })
    .from(buyersTable)
    .leftJoin(agentsTable, eq(agentsTable.id, buyersTable.assignedAgentId))
    .where(and(eq(buyersTable.id, buyerId), eq(buyersTable.agencyId, agencyId)))
    .limit(1);

  if (!row) return null;

  const [profiles, timeline] = await Promise.all([
    db
      .select()
      .from(profilesTable)
      .where(
        and(
          eq(profilesTable.buyerId, buyerId),
          eq(profilesTable.agencyId, agencyId),
        ),
      )
      .orderBy(asc(profilesTable.createdAt)),
    db
      .select({
        activity: activitiesTable,
        agentName: agentsTable.name,
        propertyAddress: propertiesTable.addressLine,
      })
      .from(activitiesTable)
      .leftJoin(agentsTable, eq(agentsTable.id, activitiesTable.agentId))
      .leftJoin(
        propertiesTable,
        eq(propertiesTable.id, activitiesTable.propertyId),
      )
      .where(
        and(
          eq(activitiesTable.buyerId, buyerId),
          eq(activitiesTable.agencyId, agencyId),
        ),
      )
      .orderBy(desc(activitiesTable.createdAt)),
  ]);

  return {
    buyer: row.buyer,
    agent: row.agent,
    profiles,
    timeline: timeline.map((t) => ({
      ...t.activity,
      agentName: t.agentName,
      propertyAddress: t.propertyAddress,
    })),
  };
}

/* -------------------------------------------------------------------------
 * Filter options
 * ---------------------------------------------------------------------- */

export async function listAgents(agencyId: string): Promise<Agent[]> {
  return db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.agencyId, agencyId))
    .orderBy(asc(agentsTable.name));
}

/** Every suburb any buyer is looking in, for the suburb filter. */
export async function listBuyerSuburbs(agencyId: string): Promise<string[]> {
  const rows = await db
    .select({
      suburbs: profilesTable.suburbs,
      also: profilesTable.alsoConsiderSuburbs,
    })
    .from(profilesTable)
    .where(eq(profilesTable.agencyId, agencyId));

  const all = new Set(rows.flatMap((r) => [...r.suburbs, ...r.also]));
  return [...all].sort((a, b) => a.localeCompare(b, "en-AU"));
}
