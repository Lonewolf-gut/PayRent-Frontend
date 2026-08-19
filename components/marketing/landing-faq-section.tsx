import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PLATFORM_NAME } from "@/constants/platform";

const landingFaqs = [
  {
    q: `What is ${PLATFORM_NAME}?`,
    a: `${PLATFORM_NAME} is a rental finance marketplace in Ghana that connects Customers, merchants, Affiliates, and lenders. Browse and list properties, vehicles, and appliances; apply for listings; request pay-for-me financing; and manage payments in one place.`,
  },
  {
    q: "How does pay-for-me financing work?",
    a: "After your application is approved, you can request financing for a rental or purchase. Lenders review eligible requests, and once approved, repayments are tracked through mandates and your dashboard.",
  },
  {
    q: "How do I get started?",
    a: 'Click "Get started", choose your role, and complete registration. Verify your email, finish your profile, and access your role-specific dashboard in minutes.',
  },
] as const;

export function LandingFaqSection() {
  return (
    <section id="faq" className="bg-white py-12 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 sm:text-sm">
            FAQ
          </p>
          <h2 className="mt-3 text-xl font-bold text-emerald-950 sm:text-3xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Quick answers before you get started.
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-8 rounded-xl border border-emerald-100 px-4 sm:mt-10">
          {landingFaqs.map((item, index) => (
            <AccordionItem key={item.q} value={`landing-faq-${index}`}>
              <AccordionTrigger className="text-left text-sm text-emerald-950 hover:no-underline sm:text-base">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" size="sm" className="sm:size-default">
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
