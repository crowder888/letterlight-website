"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitBookingRequest, type BookingState } from "./bookingAction";

const initialState: BookingState = { status: "idle" };

export default function BookingForm({
  date,
  setSlug,
  setName,
}: {
  date: string;
  setSlug: string;
  setName: string;
}) {
  const [state, formAction] = useActionState(submitBookingRequest, initialState);

  if (state.status === "success") {
    return (
      <div className="bg-white/5 border border-emerald-400/30 px-8 py-12 text-center">
        <div className="text-emerald-400 text-3xl mb-4">✓</div>
        <h2 className="font-display text-2xl text-white font-light mb-4">
          Request Received
        </h2>
        <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="event_date" value={date} />
      <input type="hidden" name="set_slug" value={setSlug} />
      <input type="hidden" name="set_name" value={setName} />

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
        name="phone"
        type="tel"
        placeholder="Phone Number (optional)"
        className="bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors"
      />

      <input
        name="venue"
        type="text"
        required
        placeholder="Venue name and city"
        className="bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors"
      />

      <textarea
        name="notes"
        placeholder="Any questions or special requests? (optional)"
        rows={3}
        className="bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E] transition-colors resize-none"
      />

      {state.status === "error" && state.message && (
        <p className="text-rose-400 text-xs">{state.message}</p>
      )}

      <SubmitButton />

      <p className="text-white/30 text-xs text-center leading-relaxed">
        No payment required now. Mike will send a contract and deposit invoice within a few hours.
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
      className="bg-[#C9A96E] text-white text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#E8D5A3] hover:text-[#1C1C1E] transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Sending..." : "Request This Date →"}
    </button>
  );
}
