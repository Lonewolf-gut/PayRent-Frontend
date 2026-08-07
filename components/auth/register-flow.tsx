"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  HandCoins,
  House,
  UserCog,
  UserRound,
} from "lucide-react";
import { RentVestLogo } from "@/components/rentvest/logo";
import { AuthBackLink, AuthSplitLayout } from "@/components/rentvest/auth-split-layout";
import { cn } from "@/lib/utils";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/constants/platform";

type EntityType = "INDIVIDUAL" | "COMPANY";
type SignUpRole = "BUYER" | "MERCHANT" | "MARKETER" | "LENDER";

const entityOptions: {
  value: EntityType;
  title: string;
  description: string;
  icon: typeof UserRound;
}[] = [
  {
    value: "INDIVIDUAL",
    title: "Individual",
    description: "I'm signing up for myself — Customer, merchant, or personal use.",
    icon: UserRound,
  },
  {
    value: "COMPANY",
    title: "Business",
    description: "I'm registering on behalf of a company or organization.",
    icon: Building2,
  },
];

const roleOptions: {
  value: SignUpRole;
  title: string;
  description: string;
  icon: typeof House;
}[] = [
  {
    value: "MERCHANT",
    title: ROLE_LABELS.MERCHANT,
    description: ROLE_DESCRIPTIONS.MERCHANT,
    icon: Building2,
  },
  {
    value: "BUYER",
    title: ROLE_LABELS.BUYER,
    description: ROLE_DESCRIPTIONS.BUYER,
    icon: House,
  },
  {
    value: "MARKETER",
    title: ROLE_LABELS.MARKETER,
    description: ROLE_DESCRIPTIONS.MARKETER,
    icon: UserCog,
  },
  {
    value: "LENDER",
    title: "Investor",
    description: ROLE_DESCRIPTIONS.LENDER,
    icon: HandCoins,
  },
];

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["About you", "Your role", "Your details"];
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                step >= n
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {n}
            </div>
            {n < 3 ? (
              <div
                className={cn(
                  "hidden h-0.5 w-8 sm:block",
                  step > n ? "bg-emerald-600" : "bg-slate-200"
                )}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3 hidden justify-center gap-6 text-xs text-muted-foreground sm:flex">
        {labels.map((label, i) => (
          <span
            key={label}
            className={cn("w-20 text-center", step === i + 1 && "font-medium text-emerald-700")}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RegisterFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<1 | 2>(1);
  const [entityType, setEntityType] = useState<EntityType | null>(null);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    const entityParam = searchParams.get("entityType");
    if (
      stepParam === "2" &&
      (entityParam === "INDIVIDUAL" || entityParam === "COMPANY")
    ) {
      setEntityType(entityParam);
      setStep(2);
    }
  }, [searchParams]);

  function chooseEntity(type: EntityType) {
    setEntityType(type);
    setStep(2);
  }

  function chooseRole(role: SignUpRole) {
    if (!entityType) return;
    const params = new URLSearchParams({
      role,
      entityType,
    });
    router.push(`/register/create?${params}`);
  }

  return (
    <AuthSplitLayout
      hero={
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-emerald-900/20 to-transparent" />
        </div>
      }
    >
      <div className="w-full max-w-2xl">
        {step === 2 ? (
          <div className="mb-4">
            <AuthBackLink onClick={() => setStep(1)} />
          </div>
        ) : (
          <div className="mb-4 h-5" aria-hidden />
        )}

        <div className="mb-6 flex justify-center">
          <RentVestLogo showIcon={false} />
        </div>

        <StepIndicator step={step} />

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center">
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Tell us about you</h1>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Are you signing up as an individual or a business?
                </p>
              </div>
              <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
                {entityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => chooseEntity(option.value)}
                    className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:p-6"
                  >
                    <option.icon className="h-8 w-8 text-emerald-600 transition group-hover:scale-105 sm:h-9 sm:w-9" />
                    <h2 className="mt-3 text-base font-semibold text-slate-900 sm:mt-4 sm:text-lg">{option.title}</h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-sm">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-600 sm:text-xs">
                  {entityType === "COMPANY" ? "Business account" : "Individual account"}
                </p>
                <h1 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  How do you want to sign up?
                </h1>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Choose your role to continue to account details.
                </p>
              </div>
              <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
                {roleOptions.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => chooseRole(role.value)}
                    className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:p-5"
                  >
                    <role.icon className="h-7 w-7 text-emerald-600 sm:h-8 sm:w-8" />
                    <h2 className="mt-2 text-sm font-semibold text-slate-900 sm:mt-3 sm:text-base">{role.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:mt-1.5 sm:text-sm">
                      {role.description}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}

export function RegisterStepIndicator({ step }: { step: 3 }) {
  return <StepIndicator step={step} />;
}
