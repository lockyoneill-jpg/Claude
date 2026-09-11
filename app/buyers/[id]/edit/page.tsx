import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyerForm } from "@/components/buyer-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentAgency } from "@/lib/agency";
import { buyerFormValues } from "@/lib/buyer-form-values";
import { getBuyerDetail, listAgents } from "@/lib/buyers";

export const dynamic = "force-dynamic";

export default async function EditBuyerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const agency = await getCurrentAgency();

  const [detail, agents] = await Promise.all([
    getBuyerDetail(agency.id, id),
    listAgents(agency.id),
  ]);

  if (!detail) notFound();

  const active = detail.profiles.filter((p) => p.active);
  const requested = Array.isArray(search.profile)
    ? search.profile[0]
    : search.profile;
  const profile = active.find((p) => p.id === requested) ?? active[0] ?? null;

  return (
    <>
      <PageHeader
        title={`Edit ${detail.buyer.firstName} ${detail.buyer.lastName}`}
        description={
          active.length > 1 && profile
            ? `Editing their "${profile.name}" profile. Switch profiles on the buyer page.`
            : undefined
        }
        back={
          <Link
            href={`/buyers/${id}`}
            className="text-muted hover:text-ink"
          >
            {detail.buyer.firstName} {detail.buyer.lastName}
          </Link>
        }
      />
      <div className="px-8 py-6">
        <BuyerForm
          buyerId={detail.buyer.id}
          profileId={profile?.id ?? null}
          agents={agents}
          values={buyerFormValues(detail.buyer, profile)}
        />
      </div>
    </>
  );
}
