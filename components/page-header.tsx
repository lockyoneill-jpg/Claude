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
}: {
  title: string;
  /** Optional "80 buyers" style line — plain, not a badge. */
  count?: string;
  description?: string;
}) {
  return (
    <header className="border-b border-rule bg-surface px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-title font-semibold text-ink">{title}</h1>
        {count && <p className="text-base text-muted">{count}</p>}
      </div>
      {description && (
        <p className="mt-1 max-w-2xl text-base text-muted">{description}</p>
      )}
    </header>
  );
}
