import { FlagIcon } from "@/components/icons";
import {
  BUYER_STATUS_LABELS,
  FINANCE_LABELS,
  FINANCE_SHORT_LABELS,
  OFF_PIPELINE_STATUSES,
  type BuyerStatus,
  type FinanceStatus,
} from "@/lib/domain";

/**
 * Buyer status.
 *
 * The label always spells the status out, so the styling only has to separate
 * "still in play" from "closed out" at a glance — it never has to carry the
 * meaning by itself.
 */
export function StatusPill({ status }: { status: BuyerStatus }) {
  const offPipeline = (OFF_PIPELINE_STATUSES as readonly string[]).includes(status);
  const purchased = status === "purchased";

  const tone = purchased
    ? "bg-gum-tint text-gum"
    : offPipeline
      ? "bg-paper text-muted"
      : "bg-paper text-ink";

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border border-rule px-2.5 py-0.5 text-sm ${tone}`}
    >
      {BUYER_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * The "Check in" flag (section 6).
 *
 * Icon plus words, never colour alone.
 */
export function CheckInFlag() {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-wattle-tint px-2.5 py-0.5 text-sm font-semibold text-ink">
      <FlagIcon />
      Check in
    </span>
  );
}

/**
 * Finance readiness. Cash and pre-approved are the two that change how an
 * agent treats a buyer, so only those are marked — by weight as well as
 * colour, never colour alone.
 *
 * Pass `short` under a column already headed "Finance", so the word doesn't
 * repeat in every cell.
 */
export function FinanceLabel({
  finance,
  short = false,
}: {
  finance: FinanceStatus;
  short?: boolean;
}) {
  const ready = finance === "cash" || finance === "pre_approved";
  const labels = short ? FINANCE_SHORT_LABELS : FINANCE_LABELS;
  return (
    <span className={ready ? "font-semibold text-gum" : "text-muted"}>
      {labels[finance]}
    </span>
  );
}
