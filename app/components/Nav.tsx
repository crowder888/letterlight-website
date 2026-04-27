"use client";

import { useState } from "react";
import Link from "next/link";

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-5 flex items-center justify-between">
      <Link href="/" className="text-white">
        <span className="font-display text-2xl font-light tracking-widest uppercase">
          Letterlight
        </span>
        <span className="font-sans text-xs tracking-[0.3em] uppercase text-[#C9A96E] ml-2">
          Co.
        </span>
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-8">
        <Link
          href="#how-it-works"
          className="text-white/80 hover:text-white text-sm tracking-widest uppercase transition-colors"
        >
          How It Works
        </Link>
        <Link
          href="#gallery"
          className="text-white/80 hover:text-white text-sm tracking-widest uppercase transition-colors"
        >
          Gallery
        </Link>
        <Link
          href="#pricing"
          className="text-white/80 hover:text-white text-sm tracking-widest uppercase transition-colors"
        >
          Pricing
        </Link>
        <Link
          href="#faq"
          className="text-white/80 hover:text-white text-sm tracking-widest uppercase transition-colors"
        >
          FAQ
        </Link>
        <Link
          href="#contact"
          className="bg-[#C9A96E] text-white text-sm tracking-widest uppercase px-5 py-2 hover:bg-[#E8D5A3] hover:text-[#1C1C1E] transition-colors"
        >
          Check Availability
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden text-white"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <div className="w-6 flex flex-col gap-1.5">
          <span
            className={`block h-px bg-white transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
          />
          <span
            className={`block h-px bg-white transition-all ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-px bg-white transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
          />
        </div>
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#1C1C1E]/95 backdrop-blur-sm flex flex-col items-center gap-6 py-8 md:hidden">
          {[
            ["How It Works", "#how-it-works"],
            ["Gallery", "#gallery"],
            ["Pricing", "#pricing"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-white/80 hover:text-white text-sm tracking-widest uppercase"
            >
              {label}
            </Link>
          ))}
          <Link
            href="#contact"
            onClick={() => setMenuOpen(false)}
            className="bg-[#C9A96E] text-white text-sm tracking-widest uppercase px-6 py-3"
          >
            Check Availability
          </Link>
        </div>
      )}
    </nav>
  );
}
