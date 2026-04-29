import type { Metadata } from "next";
import Link from "next/link";
import LetterSimulator from "@/app/components/simulator/LetterSimulator";

export const metadata: Metadata = {
  title: "LED Simulator — Letterlight Co.",
  description: "Preview live LED lighting effects for the MR & MRS marquee letter set.",
  robots: { index: false },
};

export default function SimulatorPage() {
  return (
    <main className="min-h-screen bg-[#1C1C1E]">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="text-white">
          <span className="font-display text-2xl font-light tracking-widest uppercase">
            Letterlight
          </span>
          <span className="font-sans text-xs tracking-[0.3em] uppercase text-[#C9A96E] ml-2">
            Co.
          </span>
        </Link>
        <Link
          href="/"
          className="text-white/40 hover:text-white text-xs tracking-widest uppercase transition-colors"
        >
          ← Back
        </Link>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-3">
            Live Preview
          </p>
          <h1 className="font-display text-5xl text-white font-light">
            LED Effects
          </h1>
          <p className="text-white/50 text-sm mt-4 max-w-xl leading-relaxed">
            Our letters run live-controlled LED lighting — choose your colors and
            effects for the night. Here&apos;s what it actually looks like.
          </p>
        </div>

        <LetterSimulator />

        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-white/30 text-xs leading-relaxed max-w-lg">
            Every effect is controlled live at your event — we can switch colors
            and patterns on the fly from our controller. The effects above are a
            selection of what&apos;s available.
          </p>
        </div>
      </div>
    </main>
  );
}
