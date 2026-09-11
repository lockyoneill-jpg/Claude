import { ComingLater } from "@/components/coming-later";
import { PageHeader } from "@/components/page-header";

export default function PipelinePage() {
  return (
    <>
      <PageHeader title="Pipeline" />
      <ComingLater
        session={5}
        contains="A board with one column per pipeline status, where dragging a card changes the buyer's status and logs an activity."
      />
    </>
  );
}
