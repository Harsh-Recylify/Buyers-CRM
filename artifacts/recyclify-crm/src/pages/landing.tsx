import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import logo from "@assets/images_1782449948308.png";
import {
  ArrowRight, KanbanSquare, Gavel, Users, BarChart3,
  ClipboardCheck, Recycle, ShieldCheck, CheckCircle2, TrendingUp,
} from "lucide-react";

const FEATURES = [
  {
    icon: KanbanSquare,
    accent: "bg-[#118847]/10 text-[#118847]",
    title: "Pipeline & Deal Tracking",
    description: "Move every company from first contact to Won on a visual pipeline built for IT asset deals, not generic sales.",
  },
  {
    icon: Gavel,
    accent: "bg-amber-500/10 text-amber-600",
    title: "Live Bidding & Negotiation",
    description: "Open a bid, collect buyer quotes, negotiate, and award the winner — every step tracked, nothing in a spreadsheet.",
  },
  {
    icon: Users,
    accent: "bg-sky-500/10 text-sky-600",
    title: "Verified Buyer Network",
    description: "Manage your trusted buyers with full contact history, ratings, and bid performance in one place.",
  },
  {
    icon: BarChart3,
    accent: "bg-violet-500/10 text-violet-600",
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

function PipelinePreview() {
  const columns = [
    {
      name: "New Lead",
      dot: "bg-purple-400",
      cards: [{ company: "Orion Technologies", value: "₹3,20,000" }],
    },
    {
      name: "Negotiation",
      dot: "bg-amber-400",
      cards: [
        { company: "Meridian Systems", value: "₹5,10,000" },
        { company: "Vantage Corp", value: "₹2,75,000" },
      ],
    },
    {
      name: "Won",
      dot: "bg-emerald-400",
      cards: [{ company: "Atlas Enterprises", value: "₹4,85,000" }],
    },
  ];

  return (
    <div className="relative">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center gap-1.5 rounded-t-2xl border-b bg-gray-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-xs font-medium text-gray-400">Pipeline</span>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
          {columns.map((col) => (
            <div key={col.name} className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 px-1">
                <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                <span className="text-[11px] font-semibold text-gray-500">{col.name}</span>
              </div>
              {col.cards.map((card) => (
                <div key={card.company} className="rounded-lg border border-gray-100 bg-gray-50/70 p-2.5">
                  <p className="text-[11px] font-medium text-gray-800 leading-tight">{card.company}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#118847]">{card.value}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Floating "bid awarded" card */}
      <div className="absolute -bottom-6 -left-6 hidden items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-lg sm:flex">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">Bid awarded</p>
          <p className="text-[11px] text-gray-500">Atlas Enterprises · ₹4,85,000</p>
        </div>
      </div>

      {/* Floating revenue chip */}
      <div className="absolute -top-5 -right-4 hidden items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1.5 shadow-lg sm:flex">
        <TrendingUp className="h-3.5 w-3.5 text-[#118847]" />
        <span className="text-[11px] font-semibold text-gray-800">+18% this month</span>
      </div>
    </div>
  );
}

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
              "radial-gradient(700px circle at 10% 0%, rgba(17,136,71,0.10), transparent 55%), radial-gradient(600px circle at 90% 15%, rgba(17,136,71,0.08), transparent 55%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:px-6 lg:py-24">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#118847]/20 bg-[#118847]/5 px-3 py-1 text-xs font-medium text-[#0e7038]">
              <Recycle className="h-3.5 w-3.5" />
              IT Asset Disposal &amp; E-Waste CRM
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              Built for Buyers.<br /> Built to <span className="text-[#118847]">Close</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600 lg:mx-0">
              One pipeline from first lead to final bid. Verified buyers, live negotiations,
              and a dashboard your whole team actually checks — no spreadsheets, no lost quotes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/login">
                <Button size="lg" className="w-full bg-[#118847] hover:bg-[#0e7038] gap-2 px-6 sm:w-auto">
                  Login to Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full px-6 sm:w-auto">
                  See how it works
                </Button>
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md pt-4 lg:mx-0 lg:max-w-none lg:pt-0">
            <PipelinePreview />
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
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${f.accent}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 px-4 py-8 text-sm text-gray-500 lg:px-6">
          <img src={logo} alt="Recyclify" className="h-5" />
          <span>© {new Date().getFullYear()} Recyclify. Built for the Buyers team.</span>
        </div>
      </footer>
    </div>
  );
}
