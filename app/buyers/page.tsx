import { PageHeader } from "@/components/page-header";
import { CheckInFlag, FinanceLabel, StatusPill } from "@/components/status-pill";
import { getCurrentAgency } from "@/lib/agency";
import { listBuyers, type BuyerRow } from "@/lib/buyers";
import {
  formatBudget,
  formatLastContacted,
  formatSuburbs,
  needsCheckIn,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BuyersPage() {
  const agency = await getCurrentAgency();
  const rows = await listBuyers(agency.id);

  const checkInCount = rows.filter((row) =>
    needsCheckIn(row.status, row.lastContactedAt, row.createdAt),
  ).length;

  return (
    <>
      <PageHeader
        title="Buyers"
        count={rows.length === 1 ? "1 buyer" : `${rows.length} buyers`}
        description={
          checkInCount > 0
            ? `${checkInCount} need a check in.`
            : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="px-4 py-6 md:px-8">
          <DesktopTable rows={rows} />
          <MobileList rows={rows} />
        </div>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="px-4 py-10 md:px-8">
      <div className="max-w-lg rounded-lg border border-rule bg-surface p-6">
        <h2 className="text-xl font-semibold text-ink">No buyers yet</h2>
        <p className="mt-2 text-base text-muted">
          Load the demo data by running{" "}
          <code className="rounded bg-paper px-1.5 py-0.5 text-sm">
            npm run db:seed
          </code>{" "}
          in your terminal, then refresh this page.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Desktop: a real table (section 10)
 * ---------------------------------------------------------------------- */

const TH = "px-3 py-2 text-left text-sm font-semibold text-muted";
const TD = "px-3 py-2.5 align-top text-sm text-ink";

function DesktopTable({ rows }: { rows: BuyerRow[] }) {
  return (
    <div className="hidden overflow-hidden rounded-lg border border-rule bg-surface md:block">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Buyers, sorted by surname. Shows status, assigned agent, suburbs,
          budget, finance and when they were last contacted.
        </caption>
        <thead className="border-b border-rule bg-paper">
          <tr>
            <th scope="col" className={TH}>
              Name
            </th>
            <th scope="col" className={TH}>
              Status
            </th>
            <th scope="col" className={TH}>
              Agent
            </th>
            <th scope="col" className={TH}>
              Suburbs
            </th>
            <th scope="col" className={TH}>
              Budget
            </th>
            <th scope="col" className={TH}>
              Finance
            </th>
            <th scope="col" className={TH}>
              Last contacted
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const flag = needsCheckIn(
              row.status,
              row.lastContactedAt,
              row.createdAt,
            );
            return (
              <tr
                key={row.id}
                className="border-b border-rule last:border-b-0 hover:bg-paper"
              >
                <th scope="row" className={`${TD} font-semibold`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      {row.firstName} {row.lastName}
                    </span>
                    {flag && <CheckInFlag />}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Mobile: the same table as stacked rows (section 10)
 * ---------------------------------------------------------------------- */

function MobileList({ rows }: { rows: BuyerRow[] }) {
  return (
    <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-surface md:hidden">
      {rows.map((row) => {
        const flag = needsCheckIn(row.status, row.lastContactedAt, row.createdAt);
        return (
          <li key={row.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-ink">
                {row.firstName} {row.lastName}
              </span>
              {flag && <CheckInFlag />}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <StatusPill status={row.status} />
              <span className="text-sm">
                <FinanceLabel finance={row.finance} />
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted">Budget</dt>
              <dd className="text-ink">
                {formatBudget(row.priceMin, row.priceMax, row.stretchMax)}
              </dd>

              <dt className="text-muted">Suburbs</dt>
              <dd className="text-ink">{formatSuburbs(row.suburbs)}</dd>

              <dt className="text-muted">Agent</dt>
              <dd className="text-ink">{row.agentName ?? "Unassigned"}</dd>

              <dt className="text-muted">Last contacted</dt>
              <dd className="text-ink">
                {formatLastContacted(row.lastContactedAt)}
              </dd>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
