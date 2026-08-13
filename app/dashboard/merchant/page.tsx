"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Building2, Wallet, CheckCircle, Archive } from "lucide-react";
import { deriveAccountStatusLabel } from "@/lib/utils/account-verification";

export default function LandlordDashboardPage() {
  const { data: session } = useSession();

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: properties } = useQuery({
    queryKey: ["landlord-properties"],
    queryFn: async () => {
      const res = await fetch("/api/properties/landlord");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: settlements } = useQuery({
    queryKey: ["settlements"],
    queryFn: async () => {
      const res = await fetch("/api/settlements");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: kycStatus } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      if (!res.ok || json.success === false) return null;
      return json.data as {
        emailVerified?: boolean;
        phoneVerified?: boolean;
        profileStatus?: string;
        kycVerified?: boolean;
        identityVerified?: boolean;
        verifications?: { type: string; status: string }[];
        bankAccounts?: { isVerified?: boolean; validationStatus?: string }[];
      } | null;
    },
    enabled: !!session?.user?.id,
  });

  const stats = useMemo(() => {
    const listingCount = (properties ?? []).length;
    const settledCount = (settlements ?? []).filter((s: { status?: string }) => s.status === "COMPLETED").length;
    return { listingCount, settledCount };
  }, [properties, settlements]);

  const verificationStatus = useMemo(
    () =>
      deriveAccountStatusLabel({
        ...kycStatus,
        emailVerified: Boolean(session?.user?.emailVerified ?? kycStatus?.emailVerified),
        phoneVerified: Boolean(session?.user?.phoneVerified ?? kycStatus?.phoneVerified),
      }),
    [kycStatus, session?.user?.emailVerified, session?.user?.phoneVerified]
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Merchant Dashboard</h1>
        <p className="text-muted-foreground">Manage listings, affiliates, and earnings</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Listings" value={`${stats.listingCount}`} icon={Building2} />
        <StatCard title="Completed Settlements" value={`${stats.settledCount}`} icon={Archive} />
        <StatCard
          title="Wallet Balance"
          value={`GHS ${Number(wallet?.balance ?? 0).toLocaleString()}`}
          icon={Wallet}
        />
        <StatCard title="Verified" value={verificationStatus.label} icon={CheckCircle} />
      </div>
    </div>
  );
}
