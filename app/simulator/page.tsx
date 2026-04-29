import type { Metadata } from "next";
import Link from "next/link";
import ControllerSimulator from "./ControllerSimulator";
import "./simulator.css";

export const metadata: Metadata = {
  title: "Live Controller Preview — Letterlight Co.",
  description:
    "Try the actual MRC Marquee controller our team uses at your event. Tap shows, pick colors, and adjust the sliders to design your wedding lighting in real time.",
  robots: { index: false },
};

export default function SimulatorPage() {
  return (
    <main className="min-h-screen" style={{ background: "#080812" }}>
      {/* Top nav (uses Letterlight site styling) */}
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

      {/* Intro */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-6 text-center">
        <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-3">
          Live Controller Preview
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-white font-light mb-4">
          Design Your Lighting
        </h1>
        <p className="text-white/50 text-sm leading-relaxed max-w-lg mx-auto">
          This is the actual controller we operate at your event — same shows, same
          colors, same sliders.  Tap around and design the look for your night.
        </p>
      </div>

      {/* The controller */}
      <ControllerSimulator />
    </main>
  );
}
