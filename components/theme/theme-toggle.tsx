"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardTheme } from "@/components/dashboard/dashboard-theme-provider";

import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const dashboardTheme = useDashboardTheme();

  if (!dashboardTheme) {
    return null;
  }

  const isDark = dashboardTheme.theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn("shrink-0", className)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => dashboardTheme.toggleTheme()}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
