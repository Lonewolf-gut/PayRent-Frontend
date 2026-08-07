import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPostLoginRoute } from "@/lib/auth/permissions";
import { shouldRedirectStaffFromMarketing } from "@/lib/auth/route-guards";
import { Navbar } from "@/components/rentvest/navbar";
import { MarketingSignedInExtras } from "@/components/marketing/marketing-signed-in-extras";
import { MarketingSubscriptionShell } from "@/components/marketing/marketing-subscription-shell";
import { MarketingThemeGuard } from "@/components/marketing/marketing-theme-guard";

export default async function MarketingLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role && shouldRedirectStaffFromMarketing(session.user.role)) {
    redirect(getPostLoginRoute(session.user.role));
  }

  return (
    <MarketingSubscriptionShell>
      <MarketingThemeGuard>
      <Navbar />
      <main className="bg-white text-slate-900">{children}</main>
      <MarketingSignedInExtras />
      <footer className="border-t border-emerald-100 bg-white py-8 sm:py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 text-xs text-emerald-800/80 sm:gap-10 sm:px-6 sm:text-sm md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-sm font-semibold text-emerald-950 sm:text-base">PayForMe</p>
            <p className="mt-3 max-w-md text-xs leading-relaxed sm:text-sm">
              Bridging buyers, sellers and lenders through flexible product financing
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-950 sm:text-base">Quick links</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/properties" className="hover:text-emerald-950">
                  Properties
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-950">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-emerald-950">
                  FAQ&apos;s
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-emerald-950">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-emerald-950">
                  Get started
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-950">
                  Contact us
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-950 sm:text-base">Legal &amp; support</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/terms" className="hover:text-emerald-950">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-950">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-950">
                  Contact us
                </Link>
              </li>
              <li>
                <a href="mailto:support@payforme.com" className="hover:text-emerald-950">
                  support@payforme.com
                </a>
              </li>
              <li>Accra, Ghana</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-emerald-100 px-4 pt-6 text-center text-xs text-emerald-800/70 sm:px-6 sm:text-left">
          &copy; {new Date().getFullYear()} PayForMe. All rights reserved.
        </div>
      </footer>
      </MarketingThemeGuard>
    </MarketingSubscriptionShell>
  );
}
