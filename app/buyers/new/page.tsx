import Link from "next/link";

import { BuyerForm } from "@/components/buyer-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentAgency } from "@/lib/agency";
import { emptyBuyerForm } from "@/lib/buyer-form-values";
import { listAgents } from "@/lib/buyers";

export const dynamic = "force-dynamic";

export default async function NewBuyerPage() {
  const agency = await getCurrentAgency();
  const agents = await listAgents(agency.id);

  return (
    <>
      <PageHeader
        title="Add buyer"
        back={
          <Link href="/buyers" className="text-muted hover:text-ink">
            Buyers
          </Link>
        }
      />
      <div className="px-8 py-6">
        <BuyerForm
          buyerId={null}
          profileId={null}
          agents={agents}
          values={emptyBuyerForm()}
        />
      </div>
    </>
  );
}
