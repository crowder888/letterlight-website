"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const COOKIE_NAME = "letterlight_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return { error: "Admin password not configured." };
  }
  if (password !== expected) {
    return { error: "Incorrect password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  redirect("/admin");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin");
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return !!cookie && cookie.value === process.env.ADMIN_PASSWORD;
}

function requireAuthThrow(authed: boolean) {
  if (!authed) throw new Error("Not authenticated.");
}

export async function addBooking(formData: FormData) {
  requireAuthThrow(await isAuthenticated());

  const event_date = String(formData.get("event_date") ?? "");
  const status = String(formData.get("status") ?? "booked");
  const customer_name = String(formData.get("customer_name") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!event_date) return { error: "Date is required." };
  if (!["booked", "hold", "cancelled"].includes(status)) {
    return { error: "Invalid status." };
  }

  const { error } = await supabaseAdmin
    .from("letterlight_bookings")
    .insert({ event_date, status, customer_name, notes });

  if (error) {
    return { error: error.message };
  }
  revalidatePath("/admin");
}

export async function deleteBooking(formData: FormData) {
  requireAuthThrow(await isAuthenticated());

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };

  const { error } = await supabaseAdmin
    .from("letterlight_bookings")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin");
}

export async function updateStatus(formData: FormData) {
  requireAuthThrow(await isAuthenticated());

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["booked", "hold", "cancelled"].includes(status)) {
    return { error: "Invalid input." };
  }

  const { error } = await supabaseAdmin
    .from("letterlight_bookings")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin");
}
