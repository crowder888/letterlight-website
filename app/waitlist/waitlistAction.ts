"use server";

import { Resend } from "resend";

export type WaitlistState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const TO_EMAIL = "mike@mrcwoodproducts.com";
const FROM_EMAIL = "Letterlight Co. <hello@letterlightco.com>";

export async function submitWaitlist(
  _prev: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const word = String(formData.get("word") ?? "").trim();
  const event_date = String(formData.get("event_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

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
          ✦ New Custom Words Waitlist Entry
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px 0; color: #666; width: 140px;">Name</td><td style="padding: 8px 0;"><strong>${escapeHtml(name)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          ${word ? `<tr><td style="padding: 8px 0; color: #666;">Word / Phrase</td><td style="padding: 8px 0;"><strong>${escapeHtml(word)}</strong></td></tr>` : ""}
          ${displayDate ? `<tr><td style="padding: 8px 0; color: #666;">Event Date</td><td style="padding: 8px 0;">${displayDate}</td></tr>` : ""}
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
      subject: `Waitlist — ${word || "Custom Word"}${displayDate ? ` · ${displayDate}` : ""}`,
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
      subject: "You're on the waitlist — Letterlight Co.",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; line-height: 1.6;">
          <h2 style="color: #1C1C1E; border-bottom: 2px solid #C9A96E; padding-bottom: 8px;">
            You&apos;re on the list, ${escapeHtml(name)}!
          </h2>
          <p style="color: #444; margin-top: 16px;">
            We've added you to the waitlist for custom words${word ? ` — we've noted <strong>${escapeHtml(word)}</strong> as your word` : ""}.
          </p>
          <p style="color: #444;">
            We're actively building out a full alphabet and will reach out as soon as
            custom words are available${displayDate ? `, with your event date of ${displayDate} in mind` : ""}.
          </p>
          <p style="color: #444;">
            In the meantime, our <strong>MR &amp; MRS</strong> set is available to book now
            at <a href="https://letterlightco.com/#pricing" style="color: #C9A96E;">letterlightco.com</a>.
          </p>
          <p style="margin-top: 24px; color: #888; font-size: 13px;">— Letterlight Co.</p>
        </div>
      `,
    }).catch((err) => console.error("Confirmation email error:", err));
  } catch (err) {
    console.error("Waitlist action error:", err);
    return { status: "error", message: "Something went wrong. Please try again or email us directly." };
  }

  return {
    status: "success",
    message: `You're on the list, ${name}! We'll reach out as soon as custom words are available — and we'll have your word and date in mind when we do.`,
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
