"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CHECKOUT_PLANS,
  PLAN_CATALOG,
  type CheckoutPlanId,
} from "@/lib/subscription/plans";
import { getSubscriptionPrice } from "@/lib/subscription/pricing";
import { cn } from "@/lib/utils";

function formatPrice(planId: CheckoutPlanId) {
  if (planId === "FREE") return "Free";
  return `GHS ${getSubscriptionPrice(planId, "MONTHLY").toFixed(2)}`;
}

export function UpgradePlanPicker({
  currentPlan,
  onSelectPlan,
  isDark = false,
}: {
  currentPlan: CheckoutPlanId;
  onSelectPlan: (plan: CheckoutPlanId) => void;
  isDark?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 px-3 py-4 sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-6">
      {CHECKOUT_PLANS.map((planId) => {
        const plan = PLAN_CATALOG[planId];
        const isCurrent = currentPlan === planId;
        const isHighlight = plan.highlight;

        return (
          <div
            key={planId}
            data-plan-card={isHighlight ? "highlight" : "default"}
            className={cn(
              "flex flex-col !rounded-none border p-3 sm:p-5",
              isHighlight
                ? "border-emerald-600 bg-gradient-to-b from-emerald-600 to-emerald-700"
                : isDark
                  ? "border-white/10 bg-zinc-900 text-zinc-50"
                  : "border-border bg-card text-card-foreground"
            )}
          >
            <div className="mb-2 flex min-h-[20px] items-center gap-2 sm:mb-3 sm:min-h-[24px]">
              {isHighlight ? (
                <span className="rounded-none bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-emerald-900 sm:px-2 sm:text-[10px]">
                  MOST POPULAR
                </span>
              ) : null}
              {isCurrent ? (
                <span
                  className={cn(
                    "rounded-none border px-1.5 py-0.5 text-[9px] font-bold tracking-wide sm:px-2 sm:text-[10px]",
                    isDark
                      ? "border-white/15 text-zinc-300"
                      : "border-border text-muted-foreground"
                  )}
                >
                  CURRENT PLAN
                </span>
              ) : null}
            </div>

            <h3
              className={cn(
                "text-sm font-semibold sm:text-lg",
                isHighlight ? "text-white" : isDark ? "text-zinc-50" : "text-foreground"
              )}
            >
              {plan.name}
            </h3>
            <p
              className={cn(
                "mt-0.5 text-[11px] leading-snug sm:mt-1 sm:text-sm",
                isHighlight
                  ? "text-emerald-50/90"
                  : isDark
                    ? "text-zinc-300"
                    : "text-muted-foreground"
              )}
            >
              {plan.tagline}
            </p>
            <p
              className={cn(
                "mt-2 text-lg font-bold sm:mt-4 sm:text-2xl",
                isHighlight ? "text-white" : isDark ? "text-zinc-50" : "text-foreground"
              )}
            >
              {formatPrice(planId)}
              {planId !== "FREE" ? (
                <span
                  className={cn(
                    "text-xs font-normal sm:text-sm",
                    isHighlight
                      ? "text-emerald-100"
                      : isDark
                        ? "text-zinc-400"
                        : "text-muted-foreground"
                  )}
                >
                  {" "}
                  /mo
                </span>
              ) : null}
            </p>

            <ul className="mt-2 flex-1 space-y-1 sm:mt-4 sm:space-y-2">
              {plan.features.slice(0, 4).map((feature) => (
                <li
                  key={feature}
                  className={cn(
                    "flex items-start gap-1.5 text-[10px] leading-relaxed sm:gap-2 sm:text-xs",
                    isHighlight
                      ? "text-emerald-50"
                      : isDark
                        ? "text-zinc-300"
                        : "text-muted-foreground"
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5",
                      isHighlight
                        ? "text-emerald-100"
                        : isDark
                          ? "text-emerald-400"
                          : "text-emerald-600"
                    )}
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              size="sm"
              className={cn(
                "mt-3 h-8 w-full text-xs !rounded-none sm:mt-5 sm:h-9 sm:text-sm",
                isCurrent
                  ? isDark
                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-800"
                    : "bg-muted text-muted-foreground hover:bg-muted"
                  : isHighlight
                    ? "bg-white text-emerald-800 hover:bg-emerald-50"
                    : isDark
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "bg-foreground text-background hover:bg-foreground/90"
              )}
              disabled={isCurrent}
              onClick={() => onSelectPlan(planId)}
            >
              {planId === "FREE"
                ? "Your current plan"
                : isCurrent
                  ? "Your current plan"
                  : "Choose plan"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
