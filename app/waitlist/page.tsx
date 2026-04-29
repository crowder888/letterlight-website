import type { Metadata } from "next";
import Link from "next/link";
import WaitlistForm from "./WaitlistForm";

export const metadata: Metadata = {
  title: "Custom Words Waitlist — Letterlight Co.",
  description: "Join the waitlist for custom illuminated marquee letters. Tell us your word or phrase and event date — we'll reach out as soon as custom words are available.",
};

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-[#1C1C1E]">
      {/* Simple header */}
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
      <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">

        {/* Left — summary */}
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-3">
              Coming Soon
            </p>
            <h1 className="font-display text-5xl md:text-6xl text-white font-light">
              Custom Words
            </h1>
          </div>

          <p className="text-white/60 text-base font-light leading-relaxed">
            We&apos;re actively building a full alphabet so you can spell names,
            phrases, and words that are personal to your event — not just MR &amp; MRS.
          </p>

          <div className="w-full h-px bg-white/10" />

          <div className="flex flex-col gap-5">
            {[
              {
                label: "What you can spell",
                value: "Last names, first names, LOVE, phrases — anything you can imagine",
              },
              {
                label: "How it works",
                value: "Tell us your word and event date. We'll reach out with availability and pricing as soon as it launches.",
              },
              {
                label: "No commitment",
                value: "Joining the waitlist is free and doesn't lock you in. We'll contact you first when your word becomes available.",
              },
            ].map(({ label, value }) => (
              <div key={label} className="border-l-2 border-[#C9A96E]/40 pl-5">
                <p className="text-white/40 text-xs tracking-widest uppercase mb-1">{label}</p>
                <p className="text-white/70 text-sm leading-relaxed">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 p-5">
            <p className="text-white/40 text-xs leading-relaxed">
              In the meantime, our <Link href="/#pricing" className="text-[#C9A96E] hover:text-[#E8D5A3] transition-colors">MR &amp; MRS set</Link> is
              available to book now — 6 illuminated letters, live-controlled LED
              lighting, delivery and setup included.
            </p>
          </div>
        </div>

        {/* Right — waitlist form */}
        <div>
          <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-6">
            Reserve Your Spot
          </p>
          <WaitlistForm />
        </div>
      </div>
    </main>
  );
}
