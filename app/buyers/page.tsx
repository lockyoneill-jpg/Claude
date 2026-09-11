import Link from "next/link";

import { BuyerFilters } from "@/components/buyer-filters";
import { PageHeader } from "@/components/page-header";
import { CheckInFlag, FinanceLabel, StatusPill } from "@/components/status-pill";
import { getCurrentAgency } from "@/lib/agency";
import {
  listAgents,
  listBuyerSuburbs,
  listBuyers,
  type BuyerFilters as Filters,
  type BuyerRow,
  type BuyerSort,
} from "@/lib/buyers";
import { BUYER_STATUSES, FINANCE_STATUSES } from "@/lib/domain";
import { formatBudget, formatLastContacted, formatSuburbs } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

const money = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

/** The query string flattened to plain strings, for the filter controls. */
function currentParams(search: Search): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    const v = one(value);
    if (v) out[key] = v;
  }
  return out;
}

function readFilters(search: Search): Filters {
  const status = one(search.status);
  const finance = one(search.finance);
  const sort = one(search.sort);

  return {
    search: one(search.q),
    status: BUYER_STATUSES.includes(status as never)
      ? (status as Filters["status"])
      : undefined,
    agentId: one(search.agent),
    suburb: one(search.suburb),
    finance: FINANCE_STATUSES.includes(finance as never)
      ? (finance as Filters["finance"])
      : undefined,
    priceMin: money(one(search.min)),
    priceMax: money(one(search.max)),
    staleOnly: one(search.stale) === "1",
    sort: sort as BuyerSort | undefined,
    direction: one(search.dir) === "desc" ? "desc" : "asc",
  };
}

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const filters = readFilters(search);
  const agency = await getCurrentAgency();

  const [rows, all, agents, suburbs] = await Promise.all([
    listBuyers(agency.id, filters),
    listBuyers(agency.id),
    listAgents(agency.id),
    listBuyerSuburbs(agency.id),
  ]);

  const checkInCount = rows.filter((r) => r.needsCheckIn).length;

  return (
    <>
      <PageHeader
        title="Buyers"
        count={
          rows.length === all.length
            ? `${all.length} buyers`
            : `${rows.length} of ${all.length} buyers`
        }
        description={
          checkInCount > 0 ? `${checkInCount} need a check in.` : undefined
        }
        action={
          <Link
            href="/buyers/new"
            className="rounded-md bg-gum px-4 py-2 text-base font-semibold text-white hover:bg-[#275948]"
          >
            Add buyer
          </Link>
        }
      />

      <div className="px-8 py-6">
        <BuyerFilters
          agents={agents.map((a) => ({ value: a.id, label: a.name }))}
          suburbs={suburbs}
          total={all.length}
          showing={rows.length}
          current={currentParams(search)}
        />

        {rows.length === 0 ? (
          <EmptyState hasBuyers={all.length > 0} />
        ) : (
          <BuyersTable rows={rows} search={search} />
        )}
      </div>
    </>
  );
}

function EmptyState({ hasBuyers }: { hasBuyers: boolean }) {
  return (
    <div className="max-w-lg rounded-lg border border-rule bg-surface p-6">
      <h2 className="text-xl font-semibold text-ink">
        {hasBuyers ? "No buyers match these filters" : "No buyers yet"}
      </h2>
      <p className="mt-2 text-base text-muted">
        {hasBuyers ? (
          "Widen the price range or clear a filter to see more."
        ) : (
          <>
            Load the demo data by running{" "}
            <code className="rounded bg-paper px-1.5 py-0.5 text-sm">
              npm run db:seed
            </code>{" "}
            in your terminal, then refresh this page.
          </>
        )}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * A real table, not a card grid (section 10). Desktop only.
 * ---------------------------------------------------------------------- */

const TD = "px-3 py-2.5 align-top text-sm text-ink";

/** A sortable column heading. Sorting lives in the URL, so no JS is needed. */
function SortableHeader({
  label,
  column,
  search,
}: {
  label: string;
  column: BuyerSort;
  search: Search;
}) {
  const active = one(search.sort) === column;
  const descending = active && one(search.dir) === "desc";

  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    const v = one(value);
    if (v && key !== "sort" && key !== "dir") next.set(key, v);
  }
  next.set("sort", column);
  if (!descending) next.set("dir", "desc");

  return (
    <th scope="col" className="px-3 py-2 text-left">
      <Link
        href={`/buyers?${next}`}
        aria-sort={active ? (descending ? "descending" : "ascending") : "none"}
        className={`inline-flex items-center gap-1 text-sm ${
          active ? "font-semibold text-ink" : "font-semibold text-muted"
        } hover:text-ink`}
      >
        {label}
        <span aria-hidden="true" className="text-sm">
          {active ? (descending ? "↓" : "↑") : " "}
        </span>
      </Link>
    </th>
  );
}

function BuyersTable({ rows, search }: { rows: BuyerRow[]; search: Search }) {
  return (
    <div className="overflow-hidden rounded-lg border border-rule bg-surface">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Buyers. Shows status, assigned agent, suburbs, budget, finance and
          when they were last contacted.
        </caption>
        <thead className="border-b border-rule bg-paper">
          <tr>
            <SortableHeader label="Name" column="name" search={search} />
            <SortableHeader label="Status" column="status" search={search} />
            <SortableHeader label="Agent" column="agent" search={search} />
            <th scope="col" className="px-3 py-2 text-left text-sm font-semibold text-muted">
              Suburbs
            </th>
            <SortableHeader label="Budget" column="budget" search={search} />
            <th scope="col" className="px-3 py-2 text-left text-sm font-semibold text-muted">
              Finance
            </th>
            <SortableHeader
              label="Last contacted"
              column="last_contacted"
              search={search}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-rule last:border-b-0 hover:bg-paper"
            >
              <th scope="row" className={`${TD} font-semibold`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/buyers/${row.id}`}
                    className="text-ink underline-offset-2 hover:underline"
                  >
                    {row.firstName} {row.lastName}
                  </Link>
                  {row.needsCheckIn && <CheckInFlag />}
                  {row.profileCount > 1 && (
                    <span className="rounded-full border border-rule px-2 py-0.5 text-sm font-normal text-muted">
                      {row.profileCount} profiles
                    </span>
                  )}
                </div>
              </th>
              <td className={TD}>
                <StatusPill status={row.status} />
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                {row.agentName ?? "Unassigned"}
              </td>
              <td className={TD}>{formatSuburbs(row.suburbs)}</td>
              <td className={`${TD} whitespace-nowrap`}>
                {formatBudget(row.priceMin, row.priceMax, row.stretchMax)}
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                <FinanceLabel finance={row.finance} short />
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                {formatLastContacted(row.lastContactedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
