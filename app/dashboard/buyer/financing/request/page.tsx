import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ propertyId?: string }>;
};

export default async function FinancingRequestRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const propertyId = params.propertyId;

  if (propertyId) {
    redirect(
      `/dashboard/buyer/applications?propertyId=${encodeURIComponent(propertyId)}&intent=financing`
    );
  }

  redirect("/dashboard/buyer/applications");
}
