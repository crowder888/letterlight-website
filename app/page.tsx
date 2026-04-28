import Image from "next/image";
import Nav from "./components/Nav";
import AvailabilityChecker from "./components/AvailabilityChecker";
import ContactForm from "./components/ContactForm";

const steps = [
  {
    number: "01",
    title: "Pick Your Date",
    body: "Enter your event date and see real-time letter availability — no back-and-forth, no guessing.",
  },
  {
    number: "02",
    title: "Pick MR & MRS — or Join the Waitlist",
    body: "Right now we rent our MR & MRS letter set. We're actively building a full alphabet — if you want a name or custom phrase, tell us your word and event date and we'll add you to the waitlist with future pricing.",
  },
  {
    number: "03",
    title: "Design Your Look",
    body: "We work with you to choose your effects — warm glows, color washes, twinkles, and music-reactive animations that pulse with the beat. We'll talk through the options and lock them in before your event.",
  },
  {
    number: "04",
    title: "We Set Up — You Run the Show",
    body: "We deliver, set up, and walk you (or your DJ, planner, or anyone you choose) through the simple tablet that controls the letters. Saved presets fire with a single tap — no learning curve. Then we leave you to enjoy the night and return after to strike.",
  },
];

const faqs = [
  {
    q: "Can I rent letters to spell my name or a custom word?",
    a: "Not yet — at this time we rent the MR & MRS set only (M, R, &, S). We're actively building a full alphabet so we can spell names and custom phrases. If you have a specific word and event date in mind, contact us to join the waitlist and we'll reach out as soon as it's available with pricing.",
  },
  {
    q: "How far do you travel for delivery?",
    a: "We're based in Brownsburg, IN and serve the greater Indianapolis metro area. Contact us with your venue address and we'll confirm coverage and any travel fees.",
  },
  {
    q: "What's included in the rental price?",
    a: "Delivery, setup, the tablet that controls the letters, a quick walkthrough at setup, the full evening of the event, and teardown after. No hidden fees.",
  },
  {
    q: "Who operates the lights during the event?",
    a: "You do — or anyone you choose, like your DJ, planner, or a member of the wedding party. We don't stay at the event. At setup we hand you a tablet pre-loaded with the presets you designed in advance. Each is a one-tap button (e.g. \"First Dance,\" \"Cake Cut\"). We walk you through it and leave you with a printed cheat sheet. It's intentionally simple — anyone can run it.",
  },
  {
    q: "Can I choose my own light effects?",
    a: "Yes. We have a growing library of effects — warm constant glows, animated color washes, sparkles, music-reactive animations, and more. We'll walk you through the options and pick what fits your event, then load your favorites onto the tablet as one-tap buttons (\"First Dance,\" \"Send-Off,\" etc.) for the night of.",
  },
  {
    q: "How tall are the letters?",
    a: "Our marquee letters stand approximately 4 feet tall — visible across a venue floor and stunning in photos.",
  },
  {
    q: "Do you offer indoor and outdoor rentals?",
    a: "We specialize in indoor events. Outdoor placement may be available depending on conditions — ask us when you inquire.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-col">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center bg-[#1C1C1E] overflow-hidden">
        <Image
          src="/hero.png"
          alt="Illuminated marquee letters at a wedding reception"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#1C1C1E]/60" />

        <Nav />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-6">
            Marquee Letter Rentals · Indianapolis, IN
          </p>
          <h1 className="font-display text-6xl md:text-8xl font-light text-white leading-tight mb-6">
            Illuminate
            <br />
            Your Moment
          </h1>
          <p className="text-white/60 text-lg md:text-xl font-light max-w-xl mx-auto mb-10 leading-relaxed">
            Premium illuminated marquee letters for weddings and events.
            Real-time availability. Custom light effects. White glove delivery.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#contact"
              className="bg-[#C9A96E] text-white text-sm tracking-widest uppercase px-8 py-4 hover:bg-[#E8D5A3] hover:text-[#1C1C1E] transition-colors"
            >
              Check Availability
            </a>
            <a
              href="#how-it-works"
              className="border border-white/30 text-white/80 text-sm tracking-widest uppercase px-8 py-4 hover:border-white hover:text-white transition-colors"
            >
              How It Works
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-white/20" />
        </div>
      </section>

      {/* ── FEATURES STRIP ───────────────────────────────────── */}
      <section className="bg-[#F7F3EE] py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {[
            {
              icon: "✦",
              title: "Real-Time Availability",
              body: "Know instantly if your letters are available for your date — no waiting, no back-and-forth.",
            },
            {
              icon: "◈",
              title: "Custom Light Effects",
              body: "Dozens of animations — warm glow, color wash, twinkle, pulse. Preview your exact look before you book.",
            },
            {
              icon: "◇",
              title: "White Glove Delivery",
              body: "We deliver, set up, and tear down. You don't lift a finger on the most important night of your life.",
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-4">
              <span className="text-[#C9A96E] text-2xl">{icon}</span>
              <h3 className="font-display text-2xl text-[#1C1C1E] font-light tracking-wide">
                {title}
              </h3>
              <p className="text-[#1C1C1E]/60 text-sm leading-relaxed max-w-xs">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── GALLERY ──────────────────────────────────────────── */}
      <section id="gallery" className="bg-[#F7F3EE] pb-24">
        <div className="text-center py-20 px-6">
          <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-3">
            Real Events
          </p>
          <h2 className="font-display text-5xl text-[#1C1C1E] font-light">
            The Look
          </h2>
        </div>
        {/* Full-bleed asymmetric grid */}
        <div className="flex flex-col md:flex-row gap-2 px-2 h-auto md:h-[900px]">
          {/* Left — large featured image */}
          <div className="relative w-full md:w-1/2 aspect-[3/2] md:aspect-auto md:h-full overflow-hidden">
            <Image
              src="/gallery-1.png"
              alt="Illuminated MR & MRS marquee letters at a wedding reception"
              fill
              className="object-cover hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          {/* Right — two stacked */}
          <div className="flex flex-col gap-2 w-full md:w-1/2 md:h-full">
            <div className="relative w-full aspect-[3/2] md:aspect-auto md:flex-1 overflow-hidden">
              <Image
                src="/gallery-2.png"
                alt="LED marquee letters with colorful lighting at a reception"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="relative w-full aspect-[3/2] md:aspect-auto md:flex-1 overflow-hidden">
              <Image
                src="/gallery-3.png"
                alt="Marquee letter display at an elegant wedding venue"
                fill
                className="object-cover object-center hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="bg-white py-24 px-6 border-t border-[#1C1C1E]/5"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-3">
              Simple Process
            </p>
            <h2 className="font-display text-5xl text-[#1C1C1E] font-light">
              How It Works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {steps.map(({ number, title, body }) => (
              <div key={number} className="flex gap-6">
                <span className="font-display text-5xl text-[#C9A96E]/40 font-light leading-none mt-1 select-none">
                  {number}
                </span>
                <div>
                  <h3 className="font-display text-2xl text-[#1C1C1E] font-light mb-2">
                    {title}
                  </h3>
                  <p className="text-[#1C1C1E]/60 text-sm leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ───────────────────────────────────────── */}
      <section className="bg-[#1C1C1E] py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-8">
            Letterlight Co.
          </p>
          <blockquote className="font-display text-4xl md:text-5xl text-white font-light leading-tight">
            &ldquo;The most photographed detail of your wedding night.&rdquo;
          </blockquote>
          <div className="mt-10 w-12 h-px bg-[#C9A96E] mx-auto" />
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#F7F3EE] py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-3">
              Transparent Pricing
            </p>
            <h2 className="font-display text-5xl text-[#1C1C1E] font-light">
              Investment
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-white p-10 flex flex-col gap-4 border border-[#1C1C1E]/5">
              <h3 className="font-display text-3xl text-[#1C1C1E] font-light">
                MR &amp; MRS
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl text-[#1C1C1E] font-light">
                  $750
                </span>
              </div>
              <p className="text-[#1C1C1E]/50 text-xs tracking-widest uppercase">
                Per weekend
              </p>
              <div className="w-full h-px bg-[#1C1C1E]/5 my-2" />
              <ul className="flex flex-col gap-2 text-sm text-[#1C1C1E]/70">
                {[
                  "6 illuminated letters",
                  "Custom light effect",
                  "Delivery & setup",
                  "Evening rental",
                  "Teardown included",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-[#C9A96E] text-xs">✦</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className="mt-4 bg-[#C9A96E] text-white text-xs tracking-widest uppercase px-6 py-3 text-center hover:bg-[#1C1C1E] transition-colors"
              >
                Check Availability
              </a>
            </div>

            <div className="bg-[#1C1C1E] p-10 flex flex-col gap-4 relative">
              <span className="absolute top-6 right-6 text-[#C9A96E] text-[10px] tracking-[0.2em] uppercase border border-[#C9A96E]/40 px-2 py-1">
                Coming Soon
              </span>
              <h3 className="font-display text-3xl text-white font-light">
                Custom Words
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl text-white font-light">
                  Waitlist
                </span>
              </div>
              <p className="text-white/40 text-xs tracking-widest uppercase">
                Names · Phrases · Future Dates
              </p>
              <div className="w-full h-px bg-white/10 my-2" />
              <p className="text-sm text-white/70 leading-relaxed">
                We currently rent the <span className="text-white">MR &amp; MRS</span>
                {" "}set only. We&apos;re actively building out a full alphabet so we can
                spell names, phrases, and event-specific words. Tell us the word
                and date you have in mind and we&apos;ll let you know as soon as
                it&apos;s available — and quote you then.
              </p>
              <a
                href="#contact"
                className="mt-4 border border-[#C9A96E] text-[#C9A96E] text-xs tracking-widest uppercase px-6 py-3 text-center hover:bg-[#C9A96E] hover:text-white transition-colors"
              >
                Join the Waitlist
              </a>
            </div>
          </div>

          <p className="text-center text-[#1C1C1E]/30 text-xs mt-8 tracking-wide">
            Prices vary based on word length, travel distance, and event date.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section
        id="faq"
        className="bg-white py-24 px-6 border-t border-[#1C1C1E]/5"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-3">
              Questions
            </p>
            <h2 className="font-display text-5xl text-[#1C1C1E] font-light">
              FAQ
            </h2>
          </div>
          <div className="flex flex-col divide-y divide-[#1C1C1E]/5">
            {faqs.map(({ q, a }) => (
              <div key={q} className="py-6">
                <h4 className="font-display text-xl text-[#1C1C1E] font-light mb-2">
                  {q}
                </h4>
                <p className="text-[#1C1C1E]/60 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT / CTA ────────────────────────────────────── */}
      <section id="contact" className="bg-[#1C1C1E] py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-4">
            Ready to Book
          </p>
          <h2 className="font-display text-5xl text-white font-light mb-6">
            Let&apos;s Talk
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            Start by checking your date, then tell us about your event and
            we&apos;ll get back to you within a few hours.
          </p>
          <AvailabilityChecker />
          <div className="w-full h-px bg-white/10 my-6" />
          <ContactForm />
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-[#0f0f0f] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-display text-white text-lg font-light tracking-widest uppercase">
              Letterlight
            </span>
            <span className="font-sans text-[#C9A96E] text-xs tracking-[0.3em] uppercase ml-2">
              Co.
            </span>
          </div>
          <p className="text-white/20 text-xs tracking-wide">
            Brownsburg, IN · Indianapolis Metro
          </p>
          <p className="text-white/20 text-xs tracking-wide">
            © {new Date().getFullYear()} Letterlight Co. · A MRC Wood Products Company
          </p>
        </div>
      </footer>
    </main>
  );
}
