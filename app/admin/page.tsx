"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/stat-card";
import { Users, Building2, CreditCard, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ChartCard = dynamic(
  () => import("@/components/dashboard/chart-card").then((mod) => mod.ChartCard),
  {
    ssr: false,
    loading: () => (
      <Card className="rounded-none">
        <CardContent className="py-10 text-sm text-muted-foreground">
          Loading revenue chart…
        </CardContent>
      </Card>
    ),
  }
);

type RevenuePeriod = 3 | 6 | 12;

const PERIOD_OPTIONS: { value: RevenuePeriod; label: string }[] = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "This year" },
];

export default function AdminDashboardPage() {
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>(6);

  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message ?? "Could not load admin stats");
      }
      return json.data;
    },
    refetchInterval: 30_000,
  });

  const { data: failedLoginStats } = useQuery({
    queryKey: ["admin-failed-logins"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats/failed-logins");
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message ?? "Could not load failed login stats");
      }
      return json.data as { failedLogins?: number };
    },
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const { data: revenueTrend, isLoading: revenueLoading } = useQuery({
    queryKey: ["admin-revenue", revenuePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats/revenue?months=${revenuePeriod}`);
      const json = await res.json();
      return json.data ?? [];
    },
  });

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">
          User management, fraud monitoring, and platform oversight
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={String(data?.users ?? "—")} icon={Users} />
        <StatCard title="Active Properties" value={String(data?.properties ?? "—")} icon={Building2} />
        <StatCard title="Transactions" value={String(data?.transactions ?? "—")} icon={CreditCard} />
        <StatCard
          title="Failed logins (total)"
          value={String(failedLoginStats?.failedLogins ?? data?.failedLogins ?? 0)}
          icon={AlertTriangle}
          description="All recorded failed login attempts"
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Platform revenue</h2>
            <p className="text-sm text-muted-foreground">
              Completed transaction volume over time
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={revenuePeriod === option.value ? "default" : "outline"}
                className={cn(
                  "rounded-none",
                  revenuePeriod === option.value && "bg-emerald-600 hover:bg-emerald-700"
                )}
                onClick={() => setRevenuePeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        {revenueLoading ? (
          <Card className="rounded-none">
            <CardContent className="py-10 text-sm text-muted-foreground">
              Loading revenue chart…
            </CardContent>
          </Card>
        ) : (
          <ChartCard
            title={`Revenue — last ${revenuePeriod === 12 ? "12 months" : `${revenuePeriod} months`}`}
            data={revenueTrend ?? []}
            dataKey="revenue"
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/admin/users", label: "Users", desc: "Suspend, unlock, delete" },
          { href: "/admin/properties", label: "Listings", desc: "Approve, reject, suspend" },
          { href: "/admin/financing", label: "Financing", desc: "Track rent-to-own requests" },
          { href: "/admin/settlements", label: "Settlements", desc: "Mark merchant payouts" },
          { href: "/admin/withdrawals", label: "Withdrawals", desc: "Review payout queue" },
          { href: "/admin/fraud", label: "Fraud & security", desc: "Login logs & locked accounts" },
        ].map((item) => (
          <Card key={item.href} className="rounded-none">
            <CardHeader><CardTitle className="text-base">{item.label}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{item.desc}</p>
              <Button asChild variant="outline" size="sm" className="rounded-none">
                <Link href={item.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="text-base">Pending approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{data?.pendingProperties ?? 0} properties awaiting verification</p>
            <p>{data?.pendingFinancing ?? 0} financing requests pending</p>
            <Button asChild variant="outline" size="sm" className="mt-2 rounded-none">
              <Link href="/admin/properties">Review properties</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="text-base">This month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              GHS {Number(data?.revenue?.monthlyRevenue ?? 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Current month revenue</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
