"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitWaitlist, type WaitlistState } from "./waitlistAction";

const initialState: WaitlistState = { status: "idle" };

export default function WaitlistForm() {
  const [state, formAction] = useActionState(submitWaitlist, initialState);

  if (state.status === "success") {
    return (
      <div className="bg-white/5 border border-emerald-400/30 px-8 py-12 text-center">
        <div className="text-emerald-400 text-3xl mb-4">✓</div>
        <h2 className="font-display text-2xl text-white font-light mb-4">
          You&apos;re on the List
        </h2>
        <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
          {state.message}
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
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

      <input
        name="word"
        type="text"
        placeholder="Word or phrase (e.g. JOHNSON, LOVE, BRIDE)"
        className="bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors"
      />

      <div className="flex flex-col gap-1">
        <label className="text-white/40 text-xs tracking-widest uppercase px-1">
          Event Date (optional)
        </label>
        <input
          name="event_date"
          type="date"
          min={today}
          className="bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors [color-scheme:dark]"
        />
      </div>

      <textarea
        name="notes"
        placeholder="Anything else we should know? (optional)"
        rows={3}
        className="bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors resize-none"
      />

      {state.status === "error" && state.message && (
        <p className="text-rose-400 text-xs">{state.message}</p>
      )}

      <SubmitButton />

      <p className="text-white/30 text-xs text-center leading-relaxed">
        No commitment required. We&apos;ll contact you with availability and pricing when custom words launch.
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-[#C9A96E] text-[#C9A96E] text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#C9A96E] hover:text-white transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Submitting..." : "Join the Waitlist →"}
    </button>
  );
}
