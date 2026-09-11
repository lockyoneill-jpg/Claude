"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  activities as activitiesTable,
  buyers as buyersTable,
  matchFeedback as feedbackTable,
  searchProfiles as profilesTable,
} from "@/db/schema";
import { getCurrentAgency } from "@/lib/agency";
import {
  BUYER_SOURCES,
  BUYER_STATUSES,
  BUYER_STATUS_LABELS,
  FINANCE_STATUSES,
  MATCH_FEEDBACK_STATES,
  PROPERTY_TYPES,
  TIMEFRAMES,
} from "@/lib/domain";
import { FEATURE_SLUGS } from "@/lib/features";

/**
 * Server actions for the buyer screens.
 *
 * Every action re-reads the agency and filters by `agency_id`, even though
 * Phase 1 has exactly one. That is what makes Phase 5 a change of scope rather
 * than an audit of every query.
 *
 * There is no login in Phase 1, so actions are attributed to the buyer's
 * assigned agent. When real accounts arrive in Phase 5 this becomes the signed
 * in user, and it is the only thing that has to change.
 */

/* -------------------------------------------------------------------------
 * Shared helpers
 * ---------------------------------------------------------------------- */

async function requireBuyer(buyerId: string) {
  const agency = await getCurrentAgency();
  const [buyer] = await db
    .select()
    .from(buyersTable)
    .where(
      and(eq(buyersTable.id, buyerId), eq(buyersTable.agencyId, agency.id)),
    )
    .limit(1);

  if (!buyer) {
    throw new Error("That buyer no longer exists. Go back to Buyers and try again.");
  }

  return { agency, buyer };
}

function refreshBuyerScreens(buyerId: string) {
  revalidatePath("/buyers");
  revalidatePath(`/buyers/${buyerId}`);
  revalidatePath("/today");
  revalidatePath("/pipeline");
}

/* -------------------------------------------------------------------------
 * Log contact
 * ---------------------------------------------------------------------- */

/**
 * Stamps the buyer as contacted today and writes it to the timeline, which is
 * what clears their "Check in" flag.
 */
export async function logContact(buyerId: string, note?: string) {
  const { agency, buyer } = await requireBuyer(buyerId);
  const now = new Date();

  await db
    .update(buyersTable)
    .set({ lastContactedAt: now, updatedAt: now })
    .where(eq(buyersTable.id, buyerId));

  await db.insert(activitiesTable).values({
    agencyId: agency.id,
    buyerId,
    agentId: buyer.assignedAgentId,
    type: "call",
    body: note?.trim() || "Logged contact with the buyer.",
  });

  refreshBuyerScreens(buyerId);
}

/* -------------------------------------------------------------------------
 * Notes
 * ---------------------------------------------------------------------- */

const noteSchema = z
  .string()
  .trim()
  .min(1, "Write something before saving the note.")
  .max(5000, "That note is too long. Keep it under 5,000 characters.");

export async function addNote(buyerId: string, formData: FormData) {
  const parsed = noteSchema.safeParse(formData.get("body"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { agency, buyer } = await requireBuyer(buyerId);

  await db.insert(activitiesTable).values({
    agencyId: agency.id,
    buyerId,
    agentId: buyer.assignedAgentId,
    type: "note",
    body: parsed.data,
  });

  refreshBuyerScreens(buyerId);
  return { error: null };
}

/* -------------------------------------------------------------------------
 * Status
 * ---------------------------------------------------------------------- */

const statusSchema = z.enum(BUYER_STATUSES);

/** Changing status always writes an activity, so the history is complete. */
export async function changeStatus(buyerId: string, status: string) {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) {
    throw new Error("That isn't a status we recognise.");
  }

  const { agency, buyer } = await requireBuyer(buyerId);
  if (buyer.status === parsed.data) return;

  const now = new Date();

  await db
    .update(buyersTable)
    .set({ status: parsed.data, statusChangedAt: now, updatedAt: now })
    .where(eq(buyersTable.id, buyerId));

  await db.insert(activitiesTable).values({
    agencyId: agency.id,
    buyerId,
    agentId: buyer.assignedAgentId,
    type: "status_change",
    body: `Status changed from ${BUYER_STATUS_LABELS[buyer.status]} to ${BUYER_STATUS_LABELS[parsed.data]}.`,
  });

  refreshBuyerScreens(buyerId);
}

/* -------------------------------------------------------------------------
 * Match feedback — shortlist and dismiss
 * ---------------------------------------------------------------------- */

const feedbackSchema = z.enum(MATCH_FEEDBACK_STATES);

/**
 * One row per buyer and property, so recording a new view of the same pairing
 * replaces the old one rather than stacking up.
 *
 * `LATER.md` records the open question of what happens here once buyers can
 * swipe for themselves and two people hold a view of the same pairing.
 */
export async function setMatchFeedback(
  buyerId: string,
  propertyId: string,
  state: string,
  reason?: string,
) {
  const parsed = feedbackSchema.safeParse(state);
  if (!parsed.success) throw new Error("That isn't a feedback state we recognise.");

  const { agency, buyer } = await requireBuyer(buyerId);

  await db
    .insert(feedbackTable)
    .values({
      agencyId: agency.id,
      buyerId,
      propertyId,
      agentId: buyer.assignedAgentId,
      state: parsed.data,
      reason: reason?.trim() || null,
    })
    .onConflictDoUpdate({
      target: [feedbackTable.buyerId, feedbackTable.propertyId],
      set: {
        state: parsed.data,
        reason: reason?.trim() || null,
        updatedAt: new Date(),
      },
    });

  if (parsed.data === "shortlisted" || parsed.data === "dismissed") {
    await db.insert(activitiesTable).values({
      agencyId: agency.id,
      buyerId,
      propertyId,
      agentId: buyer.assignedAgentId,
      type: parsed.data === "shortlisted" ? "match_shortlisted" : "match_dismissed",
      body:
        parsed.data === "shortlisted"
          ? "Shortlisted this property for the buyer."
          : "Dismissed this property for the buyer.",
    });
  }

  refreshBuyerScreens(buyerId);
  revalidatePath(`/properties/${propertyId}`);
}

/** Undo a shortlist or dismissal, putting the property back in their matches. */
export async function clearMatchFeedback(buyerId: string, propertyId: string) {
  const { agency } = await requireBuyer(buyerId);

  await db
    .delete(feedbackTable)
    .where(
      and(
        eq(feedbackTable.agencyId, agency.id),
        eq(feedbackTable.buyerId, buyerId),
        eq(feedbackTable.propertyId, propertyId),
      ),
    );

  refreshBuyerScreens(buyerId);
  revalidatePath(`/properties/${propertyId}`);
}

/* -------------------------------------------------------------------------
 * Create and edit a buyer
 * ---------------------------------------------------------------------- */

/** Turns "" into null, so an empty form field doesn't become an empty string. */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** "850000", "$850,000" and "850,000" all mean the same thing to an agent. */
const money = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v.replace(/[$,\s]/g, ""))))
  .nullable()
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
    message: "Enter a price as a number, for example 850000.",
  });

const count = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .nullable()
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), {
    message: "Enter a whole number.",
  });

/** Comma-separated suburbs, tidied and de-duplicated. */
const suburbList = z
  .string()
  .trim()
  .transform((v) =>
    v === ""
      ? []
      : [
          ...new Set(
            v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ],
  );

const buyerSchema = z.object({
  firstName: z.string().trim().min(1, "Enter the buyer's first name."),
  lastName: z.string().trim().min(1, "Enter the buyer's last name."),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Enter a valid email address, or leave it blank.",
    })
    .transform((v) => (v === "" ? null : v)),
  phone: optionalText,
  partnerName: optionalText,
  assignedAgentId: optionalText,
  source: z.enum(BUYER_SOURCES),
  status: z.enum(BUYER_STATUSES),
  finance: z.enum(FINANCE_STATUSES),
  preApprovalRecordedOn: optionalText,
  timeframe: z.enum(TIMEFRAMES),
  needsToSell: z.enum(["yes", "no", "unknown"]),
  briefText: optionalText,

  profileName: z.string().trim().min(1, "Give the search profile a name."),
  suburbs: suburbList,
  alsoConsiderSuburbs: suburbList,
  propertyTypes: z.array(z.enum(PROPERTY_TYPES)),
  priceMin: money,
  priceMax: money,
  stretchMax: money,
  bedsMin: count,
  bathsMin: count,
  carsMin: count,
  landMinSqm: count,
  landMaxSqm: count,
  mustHaves: z.array(z.enum(FEATURE_SLUGS as [string, ...string[]])),
  niceToHaves: z.array(z.enum(FEATURE_SLUGS as [string, ...string[]])),
  dealBreakers: z.array(z.enum(FEATURE_SLUGS as [string, ...string[]])),
});

export type SaveBuyerState = { error: string | null };

function readForm(formData: FormData) {
  const text = (key: string) => (formData.get(key) as string | null) ?? "";
  const many = (key: string) => formData.getAll(key).map(String);

  return {
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email"),
    phone: text("phone"),
    partnerName: text("partnerName"),
    assignedAgentId: text("assignedAgentId"),
    source: text("source"),
    status: text("status"),
    finance: text("finance"),
    preApprovalRecordedOn: text("preApprovalRecordedOn"),
    timeframe: text("timeframe"),
    needsToSell: text("needsToSell") || "unknown",
    briefText: text("briefText"),
    profileName: text("profileName") || "Search profile",
    suburbs: text("suburbs"),
    alsoConsiderSuburbs: text("alsoConsiderSuburbs"),
    propertyTypes: many("propertyTypes"),
    priceMin: text("priceMin"),
    priceMax: text("priceMax"),
    stretchMax: text("stretchMax"),
    bedsMin: text("bedsMin"),
    bathsMin: text("bathsMin"),
    carsMin: text("carsMin"),
    landMinSqm: text("landMinSqm"),
    landMaxSqm: text("landMaxSqm"),
    mustHaves: many("mustHaves"),
    niceToHaves: many("niceToHaves"),
    dealBreakers: many("dealBreakers"),
  };
}

const needsToSellValue = (v: "yes" | "no" | "unknown") =>
  v === "unknown" ? null : v === "yes";

/**
 * Creates a buyer and their first search profile, or updates an existing one.
 *
 * Nothing here saves on its own — the agent fills the form and presses
 * "Save buyer" (section 9). When the AI fill-in arrives in Session 6 it only
 * ever pre-fills these fields; this action stays the single way a buyer is
 * written.
 */
export async function saveBuyer(
  buyerId: string | null,
  profileId: string | null,
  _prev: SaveBuyerState,
  formData: FormData,
): Promise<SaveBuyerState> {
  const parsed = buyerSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const v = parsed.data;
  const agency = await getCurrentAgency();
  const now = new Date();

  const buyerValues = {
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email,
    phone: v.phone,
    partnerName: v.partnerName,
    assignedAgentId: v.assignedAgentId,
    source: v.source,
    status: v.status,
    finance: v.finance,
    preApprovalRecordedOn:
      v.finance === "pre_approved" ? v.preApprovalRecordedOn : null,
    timeframe: v.timeframe,
    needsToSell: needsToSellValue(v.needsToSell),
    briefText: v.briefText,
    updatedAt: now,
  };

  const profileValues = {
    name: v.profileName,
    suburbs: v.suburbs,
    alsoConsiderSuburbs: v.alsoConsiderSuburbs,
    propertyTypes: v.propertyTypes,
    priceMin: v.priceMin,
    priceMax: v.priceMax,
    stretchMax: v.stretchMax,
    bedsMin: v.bedsMin,
    bathsMin: v.bathsMin,
    carsMin: v.carsMin,
    landMinSqm: v.landMinSqm,
    landMaxSqm: v.landMaxSqm,
    mustHaves: v.mustHaves,
    niceToHaves: v.niceToHaves,
    dealBreakers: v.dealBreakers,
    updatedAt: now,
  };

  let savedId = buyerId;

  if (buyerId) {
    const { buyer } = await requireBuyer(buyerId);

    await db
      .update(buyersTable)
      .set({
        ...buyerValues,
        statusChangedAt:
          buyer.status === v.status ? buyer.statusChangedAt : now,
      })
      .where(eq(buyersTable.id, buyerId));

    if (buyer.status !== v.status) {
      await db.insert(activitiesTable).values({
        agencyId: agency.id,
        buyerId,
        agentId: v.assignedAgentId,
        type: "status_change",
        body: `Status changed from ${BUYER_STATUS_LABELS[buyer.status]} to ${BUYER_STATUS_LABELS[v.status]}.`,
      });
    }

    if (profileId) {
      await db
        .update(profilesTable)
        .set(profileValues)
        .where(
          and(
            eq(profilesTable.id, profileId),
            eq(profilesTable.agencyId, agency.id),
          ),
        );
    } else {
      await db
        .insert(profilesTable)
        .values({ ...profileValues, buyerId, agencyId: agency.id });
    }
  } else {
    const [created] = await db
      .insert(buyersTable)
      .values({ ...buyerValues, agencyId: agency.id, statusChangedAt: now })
      .returning();

    savedId = created.id;

    await db
      .insert(profilesTable)
      .values({ ...profileValues, buyerId: created.id, agencyId: agency.id });

    await db.insert(activitiesTable).values({
      agencyId: agency.id,
      buyerId: created.id,
      agentId: v.assignedAgentId,
      type: "note",
      body: "Added to the database.",
    });
  }

  refreshBuyerScreens(savedId!);
  redirect(`/buyers/${savedId}`);
}
