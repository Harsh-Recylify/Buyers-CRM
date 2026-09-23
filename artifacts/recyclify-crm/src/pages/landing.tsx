import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import logo from "@assets/images_1782449948308.png";
import {
  ArrowRight, KanbanSquare, Gavel, Users, BarChart3,
  ClipboardCheck, Recycle, ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: KanbanSquare,
    title: "Pipeline & Deal Tracking",
    description: "Move every company from first contact to Won on a visual pipeline built for IT asset deals, not generic sales.",
  },
  {
    icon: Gavel,
    title: "Live Bidding & Negotiation",
    description: "Open a bid, collect buyer quotes, negotiate, and award the winner — every step tracked, nothing in a spreadsheet.",
  },
  {
    icon: Users,
    title: "Verified Buyer & Recycler Network",
    description: "Manage your trusted buyers and CPCB-authorized recyclers with full contact history in one place.",
  },
  {
    icon: BarChart3,
    title: "Reports & Real-Time Insights",
    description: "Revenue, pipeline health, and team performance — live on a dashboard the whole team can trust.",
  },
];

const STEPS = [
  { icon: ClipboardCheck, label: "Add a Lead" },
  { icon: KanbanSquare, label: "Track the Pipeline" },
  { icon: Gavel, label: "Open for Bidding" },
  { icon: ShieldCheck, label: "Close & Collect" },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (isAuthenticated) setLocation("/dashboard");
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Recyclify" className="h-8" />
            <span className="font-medium text-gray-500">Bidder Market</span>
          </div>
          <Link href="/login">
            <Button className="bg-[#118847] hover:bg-[#0e7038] gap-1.5">
              Login <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(600px circle at 15% 10%, rgba(17,136,71,0.10), transparent 60%), radial-gradient(500px circle at 85% 25%, rgba(17,136,71,0.08), transparent 55%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center lg:px-6 lg:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#118847]/20 bg-[#118847]/5 px-3 py-1 text-xs font-medium text-[#0e7038]">
            <Recycle className="h-3.5 w-3.5" />
            IT Asset Disposal &amp; E-Waste CRM
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Built for Buyers.<br className="hidden sm:block" /> Built to <span className="text-[#118847]">Close</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            The CRM that takes every IT asset deal from first lead to final bid —
            verified buyers, live negotiations, one pipeline your whole team can see.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="bg-[#118847] hover:bg-[#0e7038] gap-2 px-6">
                Login to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="px-6">
                See how it works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-gray-50/70">
        <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.label} className="flex flex-col items-center text-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white border border-[#118847]/20 text-[#118847] shadow-sm">
                  <step.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-gray-800">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Everything your buyer team needs, in one place
          </h2>
          <p className="mt-3 text-gray-600">
            No spreadsheets, no lost quotes, no "let me check and get back to you."
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#118847]/10 text-[#118847]">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-[#0e7038]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center lg:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Your pipeline is waiting.
          </h2>
          <p className="max-w-xl text-[#d8f0e3]">
            Sign in to pick up where you left off — or check what's new since yesterday.
          </p>
          <Link href="/login">
            <Button size="lg" className="mt-2 gap-2 bg-white px-6 text-[#0e7038] hover:bg-gray-100">
              Login <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-gray-500 sm:flex-row lg:px-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Recyclify" className="h-5" />
            <span>© {new Date().getFullYear()} Recyclify. Built for the Buyers team.</span>
          </div>
          <Link href="/login" className="font-medium text-[#118847] hover:underline">
            Login →
          </Link>
        </div>
      </footer>
    </div>
  );
}
