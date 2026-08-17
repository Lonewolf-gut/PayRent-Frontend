"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AgentDashboardPage() {
  const { data: listings } = useQuery({
    queryKey: ["agent-listings"],
    queryFn: async () => {
      const res = await fetch("/api/marketer/listings");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: earnings } = useQuery({
    queryKey: ["agent-earnings"],
    queryFn: async () => {
      const res = await fetch("/api/marketer/earnings");
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Affiliate dashboard</h1>
        <p className="text-muted-foreground">
          Promote listings, track leads, and earn commission when customers buy or request financing through your referrals.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assigned listings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{listings?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total commission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              GHS {(earnings?.totalEarned ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Successful deals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{earnings?.totalDeals ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/dashboard/marketer/promote">Promote listings</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/marketer/earnings">View commissions</Link>
        </Button>
      </div>
    </div>
  );
}
