"use client";

import { useRouter } from "next/navigation";

import {
  BUYER_STATUSES,
  BUYER_STATUS_LABELS,
  FINANCE_LABELS,
  FINANCE_STATUSES,
} from "@/lib/domain";

type Option = { value: string; label: string };

const SELECT =
  "rounded-md border border-rule bg-surface px-2.5 py-1.5 text-sm text-ink";

/**
 * Search and filters for the buyers table (section 9).
 *
 * State lives in the URL, so a filtered view can be bookmarked, shared with
 * another agent, or reloaded without losing the filter — and the table stays
 * server rendered.
 *
 * The current values arrive as a prop rather than being read here with
 * `useSearchParams`. The server has already parsed the query string, so
 * handing it down avoids parsing it twice and sidesteps the Suspense boundary
 * that reading it on the client would otherwise need.
 *
 * Each control is uncontrolled with a `key` tied to its current value rather
 * than being driven by `value`/`checked`. A fully controlled input would snap
 * back to the old state for as long as the navigation takes, which reads as
 * the filter ignoring the click. This way the control responds immediately and
 * is re-synced from the server when the new results arrive.
 */
export function BuyerFilters({
  agents,
  suburbs,
  total,
  showing,
  current,
}: {
  agents: Option[];
  suburbs: string[];
  total: number;
  showing: number;
  /** The query string as the server read it. */
  current: Record<string, string>;
}) {
  const router = useRouter();

  const value = (key: string) => current[key] ?? "";

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(current);
    for (const [key, v] of Object.entries(changes)) {
      if (v === "") next.delete(key);
      else next.set(key, v);
    }
    // Filtering resets paging-style state; sort is deliberately preserved.
    router.push(next.toString() ? `/buyers?${next}` : "/buyers");
  }

  const filtered = showing !== total;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input
        key={value("q")}
        type="search"
        defaultValue={value("q")}
        placeholder="Search by name"
        aria-label="Search buyers by name"
        onKeyDown={(e) => {
          if (e.key === "Enter") update({ q: e.currentTarget.value });
        }}
        onBlur={(e) => update({ q: e.currentTarget.value })}
        className="w-56 rounded-md border border-rule bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-muted"
      />

      <select
        aria-label="Filter by status"
        className={SELECT}
        key={value("status")}
        defaultValue={value("status")}
        onChange={(e) => update({ status: e.target.value })}
      >
        <option value="">Any status</option>
        {BUYER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {BUYER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by agent"
        className={SELECT}
        key={value("agent")}
        defaultValue={value("agent")}
        onChange={(e) => update({ agent: e.target.value })}
      >
        <option value="">Any agent</option>
        {agents.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by suburb"
        className={SELECT}
        key={value("suburb")}
        defaultValue={value("suburb")}
        onChange={(e) => update({ suburb: e.target.value })}
      >
        <option value="">Any suburb</option>
        {suburbs.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by finance"
        className={SELECT}
        key={value("finance")}
        defaultValue={value("finance")}
        onChange={(e) => update({ finance: e.target.value })}
      >
        <option value="">Any finance</option>
        {FINANCE_STATUSES.map((f) => (
          <option key={f} value={f}>
            {FINANCE_LABELS[f]}
          </option>
        ))}
      </select>

      <input
        type="text"
        inputMode="numeric"
        defaultValue={value("min")}
        placeholder="Price from"
        aria-label="Budget from"
        onBlur={(e) => update({ min: e.currentTarget.value })}
        className="w-28 rounded-md border border-rule bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-muted"
      />
      <input
        type="text"
        inputMode="numeric"
        defaultValue={value("max")}
        placeholder="Price to"
        aria-label="Budget to"
        onBlur={(e) => update({ max: e.currentTarget.value })}
        className="w-28 rounded-md border border-rule bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-muted"
      />

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          key={value("stale")}
          defaultChecked={value("stale") === "1"}
          onChange={(e) => update({ stale: e.target.checked ? "1" : "" })}
          className="h-4 w-4 rounded border-rule accent-gum"
        />
        Needs a check in
      </label>

      {filtered && (
        <button
          type="button"
          onClick={() => router.push("/buyers")}
          className="rounded-md border border-rule px-2.5 py-1.5 text-sm text-ink hover:bg-paper"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
