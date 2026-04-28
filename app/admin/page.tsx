import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { isAuthenticated, login, logout, addBooking, deleteBooking } from "./actions";
import StatusSelect from "./StatusSelect";

export const dynamic = "force-dynamic";

type Booking = {
  id: string;
  event_date: string;
  status: "booked" | "hold" | "cancelled";
  customer_name: string | null;
  notes: string | null;
  created_at: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const authed = await isAuthenticated();
  const params = await searchParams;

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#1C1C1E] text-white flex items-center justify-center px-6">
        <form action={login} className="w-full max-w-sm flex flex-col gap-4">
          <h1 className="text-2xl font-display tracking-wide text-center mb-2">
            Letterlight Admin
          </h1>
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            autoFocus
            className="bg-white/5 border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-[#C9A96E]"
          />
          {params.error && (
            <p className="text-rose-400 text-xs text-center">
              Incorrect password.
            </p>
          )}
          <button
            type="submit"
            className="bg-[#C9A96E] text-white text-xs tracking-widest uppercase px-6 py-3 hover:bg-[#E8D5A3] hover:text-[#1C1C1E] transition-colors"
          >
            Sign In
          </button>
        </form>
      </main>
    );
  }

  const { data: bookings } = await supabaseAdmin
    .from("letterlight_bookings")
    .select("*")
    .order("event_date", { ascending: true });

  const list = (bookings ?? []) as Booking[];
  const today = new Date().toISOString().split("T")[0];
  const upcoming = list.filter((b) => b.event_date >= today);
  const past = list.filter((b) => b.event_date < today);

  return (
    <main className="min-h-screen bg-[#F7F3EE] text-[#1C1C1E] px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-display tracking-wide">
            Letterlight Bookings
          </h1>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs tracking-widest uppercase text-[#1C1C1E]/60 hover:text-[#1C1C1E] transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>

        {/* Add booking form */}
        <section className="bg-white border border-black/10 p-6 mb-10">
          <h2 className="text-sm tracking-widest uppercase text-[#1C1C1E]/60 mb-4">
            Add Booking
          </h2>
          <form
            action={addBooking}
            className="grid grid-cols-1 sm:grid-cols-[160px_130px_1fr_2fr_auto] gap-3"
          >
            <input
              type="date"
              name="event_date"
              required
              className="border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]"
            />
            <select
              name="status"
              defaultValue="booked"
              className="border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]"
            >
              <option value="booked">Booked</option>
              <option value="hold">Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="text"
              name="customer_name"
              placeholder="Customer name"
              className="border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]"
            />
            <input
              type="text"
              name="notes"
              placeholder="Notes (venue, word, contact, etc.)"
              className="border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-[#C9A96E]"
            />
            <button
              type="submit"
              className="bg-[#1C1C1E] text-white text-xs tracking-widest uppercase px-6 py-2 hover:bg-[#C9A96E] transition-colors"
            >
              Add
            </button>
          </form>
        </section>

        {/* Upcoming bookings */}
        <section className="mb-10">
          <h2 className="text-sm tracking-widest uppercase text-[#1C1C1E]/60 mb-4">
            Upcoming ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-[#1C1C1E]/40 italic">No upcoming bookings.</p>
          ) : (
            <BookingList bookings={upcoming} />
          )}
        </section>

        {/* Past bookings */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm tracking-widest uppercase text-[#1C1C1E]/60 mb-4">
              Past ({past.length})
            </h2>
            <BookingList bookings={past} />
          </section>
        )}
      </div>
    </main>
  );
}

function BookingList({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="bg-white border border-black/10 divide-y divide-black/10">
      {bookings.map((b) => (
        <div
          key={b.id}
          className="grid grid-cols-1 sm:grid-cols-[160px_130px_minmax(180px,1fr)_2fr_auto] gap-4 items-center px-5 py-4 text-sm"
        >
          <div className="font-medium">
            {new Date(b.event_date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <StatusSelect id={b.id} status={b.status} />
          <div className="font-medium text-[#1C1C1E] truncate">
            {b.customer_name || (
              <span className="text-[#1C1C1E]/30 italic font-normal">
                No name
              </span>
            )}
          </div>
          <div className="text-[#1C1C1E]/60 truncate">
            {b.notes || <span className="text-[#1C1C1E]/30">—</span>}
          </div>
          <form action={deleteBooking}>
            <input type="hidden" name="id" value={b.id} />
            <button
              type="submit"
              className="text-xs text-[#1C1C1E]/40 hover:text-rose-600 transition-colors"
            >
              Delete
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
