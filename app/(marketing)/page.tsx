"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Shield,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "@/constants/platform";
import { ROLE_HOW_IT_WORKS } from "@/constants/roles";
import { LandlordAgentPricingCta } from "@/components/marketing/landlord-agent-pricing-cta";
import { StatsBar } from "@/components/marketing/stats-bar";
import { showMerchantAgentPricing } from "@/lib/subscription/pricing-visibility";

const whoItsFor = [
  {
    number: "01",
    title: "Customers",
    description:
      "Browse homes, cars, and appliances. Apply for listings and request rent financing from verified lenders.",
  },
  {
    number: "02",
    title: "Merchants",
    description:
      "List properties, cars, and appliances. Review applications and track settlements from one dashboard.",
  },
  {
    number: "03",
    title: "Affiliates",
    description:
      "Advocate listings, support Customers and merchants, and close deals with transparent workflows.",
  },
  {
    number: "04",
    title: "Lenders",
    description:
      "Review financing requests, fund deals, and monitor repayment performance across the marketplace.",
  },
];

const heroImages = [
  { url: "/images/property-1.jpg" },
  { url: "/images/property-2.jpg" },
  { url: "/images/property-3.jpg" },
  { url: "/images/property-5.jpg" },
];

const heroColumns = [heroImages.slice(0, 2), heroImages.slice(2)];

const testimonials = [
  {
    quote:
      "PayForme made finding and financing my apartment smooth. I felt supported at every step.",
    name: "Ama Boateng",
    role: "Customer",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    quote:
      "Our listings now reach more verified Customers, and the admin tools keep everything under control.",
    name: "Kwame Mensah",
    role: "Merchant",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    quote:
      "As a lender, I love how clear the repayment tracking is — it saves so much time.",
    name: "Nana Yaa Asantewaa",
    role: "Lender",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    quote:
      "Managing applications for multiple merchants is so much easier. The dashboard keeps every deal transparent.",
    name: "Efua Koranteng",
    role: "Affiliate",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    quote:
      "The subscription model is fair — I started free and upgraded when my portfolio grew. No surprises.",
    name: "Kofi Adom",
    role: "Merchant",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&h=400&q=80",
  },
];

export default function HomePage() {
  const { data: session } = useSession();
  const [activeRole, setActiveRole] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const selectedRole = ROLE_HOW_IT_WORKS[activeRole];
  const isSignedIn = !!session?.user;
  const showPricingSection = showMerchantAgentPricing(session?.user?.role);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  const goToTestimonial = (index: number) => {
    setCurrentTestimonial((index + testimonials.length) % testimonials.length);
  };

  return (
    <div className="overflow-hidden bg-white">
      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <h1 className="mt-2 text-4xl font-bold leading-[1.1] tracking-tight text-emerald-950 sm:text-5xl lg:text-[3.25rem]">
              The trusted marketplace for
              <span className="text-emerald-600"> rental finance in Ghana</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Bridging buyers, sellers and lenders through flexible product financing.
            </p>
            <div className="mt-10 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <Button size="lg" asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/register">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/properties">Browse properties</Link>
              </Button>
            </div>
          </div>
          <div className="relative grid h-[520px] w-full grid-cols-2 gap-4 overflow-hidden">
            {heroColumns.map((column, columnIndex) => (
              <div key={columnIndex} className="overflow-hidden">
                <div
                  className={`space-y-4 ${columnIndex === 0 ? "hero-marquee-up" : "hero-marquee-down"}`}
                >
                  {[...column, ...column].map((image, imageIndex) => {
                    const isLcp = columnIndex === 0 && imageIndex === 0;
                    return (
                    <div
                      key={`${image.url}-${imageIndex}`}
                      className="relative h-[250px] w-full bg-transparent shadow-none"
                    >
                      <Image
                        src={image.url}
                        alt="Hero property showcase"
                        fill
                        sizes="(max-width: 1024px) 45vw, 320px"
                        priority={isLcp}
                        loading={isLcp ? "eager" : "lazy"}
                        className="object-cover"
                      />
                    </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <StatsBar />

      <section className="bg-emerald-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">
              Who it&apos;s for
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-emerald-800/70">
              One platform for every participant in the rental and asset financing chain.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_20px_50px_rgba(6,78,59,0.08)]">
            <div className="grid divide-y divide-emerald-100 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
              {whoItsFor.map((role, index) => (
                <div key={role.title} className="relative px-6 py-10 sm:px-8 lg:py-12">
                  <p
                    className="pointer-events-none select-none font-serif text-5xl leading-none text-emerald-600/15 sm:text-6xl"
                    aria-hidden
                  >
                    {role.number}
                  </p>
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-emerald-950">
                    {role.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-emerald-800/70 sm:text-[15px]">
                    {role.description}
                  </p>

                  {index < whoItsFor.length - 1 ? (
                    <div
                      className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 lg:flex"
                      aria-hidden
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                        <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              {PLATFORM_TAGLINE}
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {ROLE_HOW_IT_WORKS.map((role, index) => (
              <button
                key={role.slug}
                type="button"
                onClick={() => setActiveRole(index)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  activeRole === index
                    ? "bg-emerald-600 text-white shadow"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                {role.title.replace("For ", "")}
              </button>
            ))}
          </div>

          <div
            key={selectedRole.slug}
            className="mt-12 grid animate-in fade-in slide-in-from-bottom-4 duration-300 fill-mode-both items-center gap-10 lg:grid-cols-2"
          >
            <div className="relative h-[420px] overflow-hidden shadow-lg">
              <Image
                src={selectedRole.image}
                alt={selectedRole.title}
                fill
                sizes="(max-width: 1024px) 100vw, 640px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Step-by-step
              </p>
              <h3 className="mt-2 text-3xl font-bold text-emerald-950">{selectedRole.title}</h3>
              <p className="mt-2 text-lg text-emerald-700">{selectedRole.tagline}</p>
              <ol className="mt-8 space-y-4">
                {selectedRole.benefits.map((step, stepIndex) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {stepIndex + 1}
                    </span>
                    <span className="pt-1 text-slate-700">{step}</span>
                  </li>
                ))}
              </ol>
              <Button size="lg" className="mt-8 bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {showPricingSection ? <LandlordAgentPricingCta /> : null}

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <FileText className="h-10 w-10 text-emerald-600" />
              <h2 className="mt-4 text-3xl font-bold text-emerald-950">
                Compliance & trust by design
              </h2>
              <p className="mt-4 text-slate-600">
                Ghana Card verification, bank account validation, mandate lifecycle tracking,
                repayment schedules, settlement records, reconciliation exceptions, and audit logs
                are built into every sensitive workflow.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Shield,
                  title: "KYC & verification",
                  text: "Identity and bank validation with admin exception review.",
                },
                {
                  icon: Wallet,
                  title: "Payments & mandates",
                  text: "Direct debit mandates, deductions, retries, and settlement.",
                },
                {
                  icon: Building2,
                  title: "Listings & applications",
                  text: "Publication workflow with merchant and Affiliate review queues.",
                },
                {
                  icon: Users,
                  title: "Role-based access",
                  text: "Dedicated dashboards for every participant in the rental chain.",
                },
              ].map((item) => (
                <Card
                  key={item.title}
                  className="border border-slate-200 bg-white text-slate-900 shadow-sm ring-0"
                >
                  <CardHeader>
                    <item.icon className="h-6 w-6 text-emerald-600" />
                    <CardTitle className="text-base text-emerald-950">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-slate-100 py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(226,232,240,0.7),transparent_70%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              What our users say
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-800 sm:text-4xl">
              Trusted across Ghana
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-500">
              Hear from Customers, merchants, Affiliates, and lenders using {PLATFORM_NAME} every day.
            </p>
          </div>

          <div className="relative mx-auto mt-14 max-w-4xl">
            <button
              type="button"
              onClick={() => goToTestimonial(currentTestimonial - 1)}
              aria-label="Previous testimonial"
              className="absolute left-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:-left-16"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="overflow-hidden px-2 sm:px-12">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
              >
                {testimonials.map((item) => (
                  <div key={item.name} className="w-full flex-shrink-0 px-2">
                    <div className="flex flex-col items-center px-4 py-6 text-center sm:px-10 sm:py-8">
                      <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-200 bg-white shadow-sm">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                      <p className="mt-6 text-lg font-semibold text-slate-800">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.role}</p>
                      <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
                        &ldquo;{item.quote}&rdquo;
                      </p>
                      <div className="mt-8 flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, index) => (
                          <Star key={index} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => goToTestimonial(currentTestimonial + 1)}
              aria-label="Next testimonial"
              className="absolute right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:-right-16"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="mt-10 flex items-center justify-center gap-2">
              {testimonials.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setCurrentTestimonial(index)}
                  aria-label={`Go to testimonial ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    index === currentTestimonial
                      ? "w-8 bg-slate-400"
                      : "w-2.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-emerald-50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-emerald-950">
            {isSignedIn ? "Ready to explore?" : "Ready to get started?"}
          </h2>
          <p className="mt-3 text-emerald-800/80">
            {isSignedIn
              ? "Browse verified listings for homes, vehicles, and appliances across Ghana."
              : "Create your account as a Customer, merchant, Affiliate, or lender and access your role-specific dashboard."}
          </p>
          <Button asChild size="lg" className="mt-6 bg-emerald-600 hover:bg-emerald-700">
            <Link href={isSignedIn ? "/properties" : "/register"}>
              {isSignedIn ? "Browse listings" : "Get started"}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
