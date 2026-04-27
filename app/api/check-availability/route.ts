import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("letterlight_bookings")
    .select("event_date, status")
    .eq("event_date", date)
    .in("status", ["booked", "hold"])
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 });
  }

  return NextResponse.json({ available: !data });
}
