"use client";

import Link from "next/link";
import { RentVestLogo } from "@/components/rentvest/logo";
import { AuthSplitLayout } from "@/components/rentvest/auth-split-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRound, Building2, HandCoins, UserCog } from "lucide-react";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/constants/platform";

const roles = [
  {
    key: "BUYER",
    title: ROLE_LABELS.BUYER,
    icon: UserRound,
    description: ROLE_DESCRIPTIONS.BUYER,
  },
  {
    key: "MERCHANT",
    title: ROLE_LABELS.MERCHANT,
    icon: Building2,
    description: ROLE_DESCRIPTIONS.MERCHANT,
  },
  {
    key: "MARKETER",
    title: ROLE_LABELS.MARKETER,
    icon: UserCog,
    description: ROLE_DESCRIPTIONS.MARKETER,
  },
  {
    key: "LENDER",
    title: ROLE_LABELS.LENDER,
    icon: HandCoins,
    description: ROLE_DESCRIPTIONS.LENDER,
  },
];

export default function LoginPage() {
  return (
    <AuthSplitLayout
      hero={
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center" />
      }
    >
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex justify-center">
          <RentVestLogo showIcon={false} />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">I am a...</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Select your role to continue to sign in.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
          {roles.map((role) => (
            <Link key={role.key} href={`/login/access?role=${role.key}`}>
              <Card className="h-full gap-0 border border-slate-200 bg-white py-0 text-slate-900 shadow-sm ring-0 transition hover:border-emerald-500 hover:shadow-md">
                <CardHeader className="space-y-1.5 p-4 pb-2 sm:p-6 sm:pb-2">
                  <role.icon className="h-7 w-7 text-emerald-600 sm:h-8 sm:w-8" />
                  <CardTitle className="text-sm text-emerald-950 sm:text-base">{role.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">{role.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-slate-600 sm:mt-6 sm:text-sm">
          New here?{" "}
          <Link href="/register" className="font-medium text-emerald-600 hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
