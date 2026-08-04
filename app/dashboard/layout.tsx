export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardThemeProvider } from "@/components/dashboard/dashboard-theme-provider";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <DashboardThemeProvider className="flex min-h-screen">
      {children}
    </DashboardThemeProvider>
  );
}
