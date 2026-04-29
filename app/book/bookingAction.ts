"use server";

import { Resend } from "resend";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export type BookingState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const TO_EMAIL = "mike@mrcwoodproducts.com";
const FROM_EMAIL = "Letterlight Co. <hello@letterlightco.com>";

export async function submitBookingRequest(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const event_date = String(formData.get("event_date") ?? "").trim();
  const set_name = String(formData.get("set_name") ?? "MR & MRS").trim();

  if (!name || !email) {
    return { status: "error", message: "Name and email are required." };
  }

  const displayDate = formatDate(event_date);

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { status: "error", message: "Email service not configured. Please email us directly." };
    }

    const resend = new Resend(apiKey);
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; line-height: 1.6;">
        <h2 style="color: #1C1C1E; border-bottom: 2px solid #C9A96E; padding-bottom: 8px;">
          ✦ New Booking Request
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px 0; color: #666; width: 140px;">Name</td><td style="padding: 8px 0;"><strong>${escapeHtml(name)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          ${phone ? `<tr><td style="padding: 8px 0; color: #666;">Phone</td><td style="padding: 8px 0;">${escapeHtml(phone)}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #666;">Set</td><td style="padding: 8px 0;"><strong>${escapeHtml(set_name)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Event Date</td><td style="padding: 8px 0;"><strong>${displayDate || "—"}</strong></td></tr>
          ${venue ? `<tr><td style="padding: 8px 0; color: #666;">Venue</td><td style="padding: 8px 0;">${escapeHtml(venue)}</td></tr>` : ""}
          ${notes ? `<tr><td style="padding: 8px 0; color: #666;">Notes</td><td style="padding: 8px 0;">${escapeHtml(notes)}</td></tr>` : ""}
        </table>
        <p style="margin-top: 24px; color: #666; font-size: 13px;">
          Reply to this email to respond directly to ${escapeHtml(name)}.
        </p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Booking Request — ${set_name} · ${displayDate || event_date}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return { status: "error", message: "Could not send your request. Please try again or email us directly." };
    }

    // Confirmation email to customer
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      replyTo: TO_EMAIL,
      subject: "Booking request received — Letterlight Co.",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; line-height: 1.6;">
          <h2 style="color: #1C1C1E; border-bottom: 2px solid #C9A96E; padding-bottom: 8px;">
            We've got your request, ${escapeHtml(name)}!
          </h2>
          <p style="color: #444; margin-top: 16px;">
            Your booking request for the <strong>${escapeHtml(set_name)}</strong> set
            ${displayDate ? `on <strong>${displayDate}</strong>` : ""} has been received.
            Your date is tentatively held while we prepare your contract.
          </p>
          <p style="color: #444;">
            We'll send over a contract and deposit invoice within a few hours.
            Once signed, your date is officially confirmed.
          </p>
          <p style="color: #444;">
            Questions in the meantime? Just reply to this email.
          </p>
          <p style="margin-top: 24px; color: #888; font-size: 13px;">— Letterlight Co.</p>
        </div>
      `,
    }).catch((err) => console.error("Confirmation email error:", err));
  } catch (err) {
    console.error("Booking action error:", err);
    return { status: "error", message: "Something went wrong. Please try again or email us directly." };
  }

  // Create a hold booking in Supabase
  if (event_date && /^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
    try {
      const { data: existing } = await supabaseAdmin
        .from("letterlight_bookings")
        .select("id")
        .eq("event_date", event_date)
        .in("status", ["booked", "hold"])
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from("letterlight_bookings").insert({
          event_date,
          status: "hold",
          customer_name: name,
          notes: [email, phone && `📞 ${phone}`, venue && `Venue: ${venue}`, notes]
            .filter(Boolean)
            .join(" · "),
        });
      }
    } catch (err) {
      console.error("Failed to create hold booking:", err);
    }
  }

  return {
    status: "success",
    message: `Thanks, ${name}! We've received your booking request for ${displayDate || "your event"}. Expect a contract and invoice within a few hours — your date is tentatively held in the meantime.`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
