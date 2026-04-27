"use client";

import { updateStatus } from "./actions";

type Props = {
  id: string;
  status: "booked" | "hold" | "cancelled";
};

export default function StatusSelect({ id, status }: Props) {
  const styles =
    status === "booked"
      ? "border-emerald-300 text-emerald-700 bg-emerald-50"
      : status === "hold"
      ? "border-amber-300 text-amber-700 bg-amber-50"
      : "border-rose-300 text-rose-700 bg-rose-50";

  return (
    <form action={updateStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`border px-2 py-1 text-xs uppercase tracking-wider ${styles}`}
      >
        <option value="booked">Booked</option>
        <option value="hold">Hold</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </form>
  );
}
