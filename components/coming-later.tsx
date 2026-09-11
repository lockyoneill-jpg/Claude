/**
 * Placeholder for screens scheduled for a later session in the Phase 1 plan
 * (section 11). States plainly what will be here and which session builds it.
 */
export function ComingLater({
  session,
  contains,
}: {
  session: number;
  contains: string;
}) {
  return (
    <div className="px-4 py-10 md:px-8">
      <div className="max-w-lg rounded-lg border border-rule bg-surface p-6">
        <h2 className="text-xl font-semibold text-ink">Not built yet</h2>
        <p className="mt-2 text-base text-muted">{contains}</p>
        <p className="mt-2 text-base text-muted">
          This screen is scheduled for session {session}.
        </p>
      </div>
    </div>
  );
}
