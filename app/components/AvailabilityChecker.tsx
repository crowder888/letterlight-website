"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "available" | "unavailable" | "error";

export default function AvailabilityChecker({ theme = "dark" }: { theme?: "dark" | "light" }) {
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const today = new Date().toISOString().split("T")[0];

  const inputClass = theme === "light"
    ? "w-full sm:flex-1 bg-[#F7F3EE] border border-[#1C1C1E]/20 text-[#1C1C1E] px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors"
    : "w-full sm:flex-1 bg-white/5 border border-white/20 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors [color-scheme:dark]";

  const subtextClass = theme === "light" ? "text-[#1C1C1E]/40 text-xs" : "text-white/40 text-xs";

  async function checkAvailability() {
    if (!date) return;
    setStatus("loading");

    try {
      const res = await fetch(`/api/check-availability?date=${date}`);
      const data = await res.json();
      setStatus(data.available ? "available" : "unavailable");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => {
            setDate(e.target.value);
            setStatus("idle");
          }}
          className={inputClass}
        />
        <button
          onClick={checkAvailability}
          disabled={!date || status === "loading"}
          className="w-full sm:w-auto bg-[#C9A96E] text-white text-xs tracking-widest uppercase px-6 py-3 hover:bg-[#E8D5A3] hover:text-[#1C1C1E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {status === "loading" ? "Checking..." : "Check Date"}
        </button>
      </div>

      {/* Result */}
      {status === "available" && (
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-emerald-500">
            <span className="text-xl">✓</span>
            <span className="text-sm font-light tracking-wide">
              Great news — the MR &amp; MRS set is available on that date!
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("letterlight:book-date", { detail: { date } })
              );
              const form = document.getElementById("inquiry-form");
              form?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="bg-[#C9A96E] text-white text-xs tracking-widest uppercase px-8 py-3 hover:bg-[#E8D5A3] hover:text-[#1C1C1E] transition-colors"
          >
            Book This Date
          </button>
          <p className={subtextClass}>
            We&apos;ll secure your date and send a contract within a few hours.
          </p>
        </div>
      )}

      {status === "unavailable" && (
        <div className="flex flex-col items-center gap-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-rose-500">
            <span className="text-xl">✕</span>
            <span className="text-sm font-light tracking-wide">
              The MR &amp; MRS set is already booked for that date.
            </span>
          </div>
          <p className={subtextClass}>
            Try a nearby date or contact us — we may be able to help.
          </p>
        </div>
      )}

      {status === "error" && (
        <p className={subtextClass}>
          Something went wrong. Please try again or contact us directly.
        </p>
      )}
    </div>
  );
}
