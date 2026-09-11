import { ComingLater } from "@/components/coming-later";
import { PageHeader } from "@/components/page-header";

export default function PropertiesPage() {
  return (
    <>
      <PageHeader title="Properties" />
      <ComingLater
        session={4}
        contains="The properties table, and a property page showing ranked matched buyers with a fit strip for each one."
      />
    </>
  );
}
