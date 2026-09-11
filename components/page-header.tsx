/**
 * Page title block.
 *
 * 28px page titles, sentence case, left aligned, no eyebrow labels above the
 * title and no all-caps (section 10).
 */
export function PageHeader({
  title,
  count,
  description,
  action,
  back,
}: {
  title: string;
  /** Optional "80 buyers" style line — plain, not a badge. */
  count?: string;
  description?: React.ReactNode;
  /** Primary action, shown at the right of the title row. */
  action?: React.ReactNode;
  /** Optional breadcrumb link back to the list this page came from. */
  back?: React.ReactNode;
}) {
  return (
    <header className="border-b border-rule bg-surface px-8 py-6">
      {back && <div className="mb-2 text-sm">{back}</div>}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-title font-semibold text-ink">{title}</h1>
            {count && <p className="text-base text-muted">{count}</p>}
          </div>
          {description && (
            <p className="mt-1 max-w-2xl text-base text-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
