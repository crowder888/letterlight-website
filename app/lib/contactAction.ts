"use server";

import { Resend } from "resend";
import { supabaseAdmin } from "./supabaseAdmin";

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const TO_EMAIL = "mike@mrcwoodproducts.com";
const FROM_EMAIL = "Letterlight Co. <hello@letterlightco.com>";

export async function submitInquiry(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const event_date = String(formData.get("event_date") ?? "").trim();
  const word = String(formData.get("word") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();

  if (!name || !email) {
    return { status: "error", message: "Name and email are required." };
  }

  // Send email via Resend
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY not set");
      return {
        status: "error",
        message: "Email service not configured. Please email us directly.",
      };
    }

    const resend = new Resend(apiKey);
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; line-height: 1.6;">
        <h2 style="color: #1C1C1E; border-bottom: 2px solid #C9A96E; padding-bottom: 8px;">
          New Letterlight Inquiry
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px 0; color: #666; width: 140px;">Name</td><td style="padding: 8px 0;"><strong>${escapeHtml(name)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Event Date</td><td style="padding: 8px 0;">${formatDate(event_date) || "—"}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Word / Phrase</td><td style="padding: 8px 0;">${escapeHtml(word) || "—"}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Venue</td><td style="padding: 8px 0;">${escapeHtml(venue) || "—"}</td></tr>
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
      subject: `New inquiry from ${name}${event_date ? ` — ${formatDate(event_date)}` : ""}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return {
        status: "error",
        message: "Could not send your message. Please try again or email us directly.",
      };
    }
  } catch (err) {
    console.error("Contact form error:", err);
    return {
      status: "error",
      message: "Something went wrong. Please try again or email us directly.",
    };
  }

  // Best-effort: also create a hold booking if a valid date was provided
  // and that date isn't already taken. Don't fail the form if this errors.
  if (event_date && /^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
    try {
      const { data: existing } = await supabaseAdmin
        .from("letterlight_bookings")
        .select("id")
        .eq("event_date", event_date)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from("letterlight_bookings").insert({
          event_date,
          status: "hold",
          customer_name: name,
          notes: [email, word && `Word: ${word}`, venue && `Venue: ${venue}`]
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
    message: "Thank you — we'll get back to you within a few hours.",
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
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
