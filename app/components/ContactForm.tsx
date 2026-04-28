"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitInquiry, type ContactState } from "@/app/lib/contactAction";

const initialState: ContactState = { status: "idle" };

export default function ContactForm() {
  const [state, formAction] = useActionState(submitInquiry, initialState);
  const dateRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleBookDate(e: Event) {
      const detail = (e as CustomEvent<{ date: string }>).detail;
      if (dateRef.current && detail?.date) {
        dateRef.current.value = detail.date;
      }
      // Focus the first empty field so the customer can start typing immediately
      setTimeout(() => nameRef.current?.focus(), 400);
    }
    window.addEventListener("letterlight:book-date", handleBookDate);
    return () =>
      window.removeEventListener("letterlight:book-date", handleBookDate);
  }, []);

  if (state.status === "success") {
    return (
      <div className="w-full bg-white/5 border border-emerald-400/30 px-6 py-8 text-center animate-in fade-in duration-500">
        <div className="text-emerald-400 text-2xl mb-3">✓</div>
        <p className="text-white text-sm font-light tracking-wide mb-2">
          {state.message}
        </p>
        <p className="text-white/40 text-xs">
          Or reach us directly at{" "}
          <a
            href="mailto:mike@mrcwoodproducts.com"
            className="text-[#C9A96E] hover:text-[#E8D5A3] transition-colors"
          >
            mike@mrcwoodproducts.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <form
      id="inquiry-form"
      action={formAction}
      className="flex flex-col gap-4 text-left w-full"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          ref={nameRef}
          name="name"
          type="text"
          required
          placeholder="Your Name"
          className="bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email Address"
          className="bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-white/40 text-xs tracking-widest uppercase px-1">
          Event Date
        </label>
        <input
          ref={dateRef}
          name="event_date"
          type="date"
          className="bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors [color-scheme:dark]"
        />
      </div>
      <input
        name="word"
        type="text"
        placeholder="Word or phrase (e.g. MR & MRS, LOVE, JOHNSON)"
        className="bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors"
      />
      <textarea
        name="venue"
        placeholder="Venue name and city"
        rows={3}
        className="bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors resize-none"
      />

      {state.status === "error" && state.message && (
        <p className="text-rose-400 text-xs">{state.message}</p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[#C9A96E] text-white text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#E8D5A3] hover:text-[#1C1C1E] transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Sending..." : "Send Inquiry"}
    </button>
  );
}
