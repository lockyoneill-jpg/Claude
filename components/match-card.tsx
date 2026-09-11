"use client";

import { useTransition } from "react";

import { FitStrip } from "@/components/fit-strip";
import { clearMatchFeedback, setMatchFeedback } from "@/lib/actions";
import { LISTING_STATUS_LABELS, type ListingStatus } from "@/lib/domain";
import type { Reason } from "@/lib/matching";

/**
 * One matched property on the buyer page.
 *
 * The fit strip is the point of this card, so everything around it stays
 * quiet: address, a plain status word, and two buttons that say exactly what
 * they do (section 10).
 */
export function MatchCard({
  buyerId,
  propertyId,
  addressLine,
  suburb,
  priceDisplay,
  listingStatus,
  beds,
  baths,
  cars,
  score,
  metCount,
  setCount,
  reasons,
  feedbackState,
}: {
  buyerId: string;
  propertyId: string;
  addressLine: string;
  suburb: string;
  priceDisplay: string | null;
  listingStatus: ListingStatus;
  beds: number | null;
  baths: number | null;
  cars: number | null;
  score: number;
  metCount: number;
  setCount: number;
  reasons: Reason[];
  feedbackState: string | null;
}) {
  const [pending, start] = useTransition();

  const shortlisted = feedbackState === "shortlisted";
  const specs = [
    beds === null ? null : `${beds} bed`,
    baths === null ? null : `${baths} bath`,
    cars === null ? null : `${cars} car`,
  ].filter(Boolean);

  return (
    <article className="rounded-lg border border-rule bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">
            {addressLine}, {suburb}
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            {LISTING_STATUS_LABELS[listingStatus]}
            {specs.length > 0 && ` — ${specs.join(", ")}`}
          </p>
          <p className="mt-0.5 text-sm text-ink">
            {priceDisplay ?? "No price advertised"}
          </p>
        </div>

        {shortlisted && (
          <span className="shrink-0 rounded-full bg-gum-tint px-2.5 py-0.5 text-sm font-semibold text-gum">
            Shortlisted
          </span>
        )}
      </div>

      <div className="mt-3 border-t border-rule pt-3">
        <FitStrip
          score={score}
          metCount={metCount}
          setCount={setCount}
          reasons={reasons}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(() => {
              void (shortlisted
                ? clearMatchFeedback(buyerId, propertyId)
                : setMatchFeedback(buyerId, propertyId, "shortlisted"));
            })
          }
          className="rounded-md border border-rule px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60"
        >
          {shortlisted ? "Remove from shortlist" : "Shortlist"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(() => void setMatchFeedback(buyerId, propertyId, "dismissed"))
          }
          className="rounded-md border border-rule px-3 py-1.5 text-sm font-semibold text-brick hover:bg-brick-tint disabled:opacity-60"
        >
          Dismiss match
        </button>
      </div>
    </article>
  );
}
