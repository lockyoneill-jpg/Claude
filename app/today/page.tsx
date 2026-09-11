import { ComingLater } from "@/components/coming-later";
import { PageHeader } from "@/components/page-header";

export default function TodayPage() {
  return (
    <>
      <PageHeader title="Today" />
      <ComingLater
        session={5}
        contains="Buyers to check in, pre-approvals expiring in the next 30 days, properties added in the last 7 days with their match counts, and pipeline counts by status."
      />
    </>
  );
}
