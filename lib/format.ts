/**
 * Formatting helpers.
 *
 * Australian English, sentence case, whole-dollar amounts with commas
 * (sections 8.3 and 10). Everything numeric is rendered with tabular figures
 * by the base stylesheet, so columns line up without extra classes.
 */

import {
  NEVER_CONTACTED_GRACE_DAYS,
  STALE_AFTER_DAYS,
  STALE_ELIGIBLE_STATUSES,
  type BuyerStatus,
} from "./domain.ts";

const MS_PER_DAY = 86_400_000;

/** 850000 -> "$850,000". Always whole dollars. */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  return `$${Math.round(amount).toLocaleString("en-AU")}`;
}

/**
 * A buyer's budget as one readable string.
 * The stretch is shown separately because it changes how an agent reads the
 * number — it isn't really part of the range.
 */
export function formatBudget(
  min: number | null,
  max: number | null,
  stretch: number | null = null,
): string {
  let range: string;

  if (min !== null && max !== null) range = `${formatMoney(min)} to ${formatMoney(max)}`;
  else if (max !== null) range = `Up to ${formatMoney(max)}`;
  else if (min !== null) range = `From ${formatMoney(min)}`;
  else return "Not set";

  if (stretch !== null && (max === null || stretch > max)) {
    return `${range}, stretch ${formatMoney(stretch)}`;
  }
  return range;
}

/** Whole days between a past date and now. */
export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / MS_PER_DAY);
}

/** Whole days from now until a future date. Negative once it has passed. */
export function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / MS_PER_DAY);
}

/** "Today", "Yesterday", "9 days ago", "3 months ago", "Never". */
export function formatLastContacted(date: Date | null): string {
  if (date === null) return "Never";

  const days = daysSince(date);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 31) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/** "12 Mar 2026" — unambiguous, and short enough for a table cell. */
export function formatDate(date: Date | null): string {
  if (date === null) return "";
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The "Check in" flag (section 6).
 *
 * A buyer needs a check in when they were last contacted more than 60 days
 * ago, or were never contacted and came in more than 14 days ago. Only buyers
 * still in the active pipeline qualify — chasing someone who has already
 * bought elsewhere isn't useful.
 *
 * Stale buyers are flagged, never excluded from matching.
 */
export function needsCheckIn(
  status: BuyerStatus,
  lastContactedAt: Date | null,
  createdAt: Date,
): boolean {
  if (!STALE_ELIGIBLE_STATUSES.includes(status)) return false;

  if (lastContactedAt === null) {
    return daysSince(createdAt) > NEVER_CONTACTED_GRACE_DAYS;
  }
  return daysSince(lastContactedAt) > STALE_AFTER_DAYS;
}

/** "Armstrong Creek, Highton and 2 more" — keeps table cells to one line. */
export function formatSuburbs(suburbs: string[], limit = 2): string {
  if (suburbs.length === 0) return "Any";
  if (suburbs.length <= limit) return suburbs.join(", ");
  return `${suburbs.slice(0, limit).join(", ")} and ${suburbs.length - limit} more`;
}
