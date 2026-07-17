import type { Metadata } from "next";
import Link from "next/link";
import BookingForm from "./BookingForm";

export const metadata: Metadata = {
  title: "Book Your Date — Letterlight Co.",
  description: "Reserve your wedding or event date for the MR & MRS illuminated marquee letter set. Delivery, setup, and live-controlled LED lighting included.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const SETS: Record<string, {
  name: string;
  price: number;
  includes: string[];
}> = {
  "mr-and-mrs": {
    name: "MR & MRS",
    price: 600,
    includes: [
      "6 illuminated letters",
      "Live-controlled LED lighting",
      "Delivery & setup within 25 mi of Brownsburg",
      "Evening rental",
      "Teardown included",
    ],
  },
};

function formatDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; set?: string }>;
}) {
  const params = await searchParams;
  const date = params.date ?? "";
  const setSlug = params.set ?? "mr-and-mrs";
  const set = SETS[setSlug] ?? SETS["mr-and-mrs"];
  const displayDate = formatDate(date);

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

        {/* Left — booking summary */}
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-3">
              Your Booking
            </p>
            <h1 className="font-display text-5xl md:text-6xl text-white font-light">
              {set.name}
            </h1>
          </div>

          {displayDate && (
            <div className="border-l-2 border-[#C9A96E] pl-5">
              <p className="text-white/40 text-xs tracking-widest uppercase mb-1">
                Event Date
              </p>
              <p className="text-white text-lg font-light">{displayDate}</p>
            </div>
          )}

          <div>
            <p className="text-white/40 text-xs tracking-widest uppercase mb-1">
              Investment
            </p>
            <p className="font-display text-5xl text-white font-light">
              ${set.price.toLocaleString()}
            </p>
            <p className="text-white/40 text-xs tracking-widest uppercase mt-1">
              Per day
            </p>
          </div>

          <div className="w-full h-px bg-white/10" />

          <div>
            <p className="text-white/40 text-xs tracking-widest uppercase mb-4">
              What&apos;s Included
            </p>
            <ul className="flex flex-col gap-3">
              {set.includes.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                  <span className="text-[#C9A96E] text-xs flex-shrink-0">✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/5 border border-white/10 p-5">
            <p className="text-white/40 text-xs leading-relaxed">
              Your date is tentatively held once we receive your request. We&apos;ll
              send a contract and deposit invoice within a few hours — the booking
              is confirmed upon signing.
            </p>
          </div>

          <p className="text-white/20 text-xs">
            Events more than 25 miles from Brownsburg, IN incur an additional
            travel fee — quoted with your contract.
          </p>
        </div>

        {/* Right — booking form */}
        <div>
          <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-6">
            Complete Your Request
          </p>
          <BookingForm date={date} setSlug={setSlug} setName={set.name} />
        </div>
      </div>
    </main>
  );
}
