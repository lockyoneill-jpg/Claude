"use client";

import { useId, useState } from "react";

import type { Reason, ReasonResult } from "@/lib/matching";

/**
 * The fit strip (brief section 10).
 *
 * The one memorable element in the app, so everything around it stays quiet.
 * One equal segment per criterion the buyer set, the score in tabular figures
 * to the left, and "Fits 5 of 7" beside it. Click to expand the reasons.
 *
 * Colour never carries the meaning on its own: every segment differs in fill
 * AND border style, each carries a text title, and the expanded list spells
 * every result out in words.
 */

const SEGMENT: Record<ReasonResult, string> = {
  met: "bg-gum border border-gum",
  partial: "bg-wattle border border-wattle",
  // Outline, not a fill — a miss should read as absence.
  missed: "bg-transparent border-2 border-brick",
  unknown: "bg-transparent border-2 border-dashed border-rule",
};

const RESULT_WORD: Record<ReasonResult, string> = {
  met: "Met",
  partial: "Partial",
  missed: "Missed",
  unknown: "Unknown",
};

const CHIP: Record<ReasonResult, string> = {
  met: "bg-gum-tint text-gum",
  partial: "bg-wattle-tint text-ink",
  missed: "bg-brick-tint text-brick",
  unknown: "bg-paper text-muted",
};

export function FitStrip({
  score,
  metCount,
  setCount,
  reasons,
  defaultOpen = false,
}: {
  score: number;
  metCount: number;
  setCount: number;
  reasons: Reason[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 rounded-md px-1 py-1 text-left hover:bg-paper"
      >
        <span className="text-xl font-semibold text-ink tabular-nums">
          {score}
        </span>

        <span className="whitespace-nowrap text-sm text-muted">
          Fits {metCount} of {setCount}
        </span>

        <span className="flex min-w-0 flex-1 gap-1" aria-hidden="true">
          {reasons.map((reason, i) => (
            <span
              key={`${reason.criterion}-${i}`}
              title={`${reason.label}: ${reason.detail}`}
              className={`h-3 flex-1 rounded-sm ${SEGMENT[reason.result]}`}
            />
          ))}
        </span>

        <span className="whitespace-nowrap text-sm text-muted">
          {open ? "Hide reasons" : "Show reasons"}
        </span>
      </button>

      {open && (
        <dl id={panelId} className="mt-2 space-y-1.5 px-1 pb-1">
          {reasons.map((reason, i) => (
            <div
              key={`${reason.criterion}-${i}`}
              className="flex items-baseline gap-2 text-sm"
            >
              <dt className="w-28 shrink-0 font-semibold text-ink">
                {reason.label}
              </dt>
              <dd className="flex min-w-0 items-baseline gap-2">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-sm ${CHIP[reason.result]}`}
                >
                  {RESULT_WORD[reason.result]}
                </span>
                <span className="text-ink">{reason.detail}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
