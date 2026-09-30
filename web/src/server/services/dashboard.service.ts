import "server-only";
import { createAdminClient } from "../lib/supabase";
import { addDays, todayIn } from "../lib/time";

const TZ = "Asia/Kolkata";

export const dashboardService = {
  async summary() {
    const db = createAdminClient();
    const today = todayIn(TZ);
    const weekStart = addDays(today, -6);

    const [todayBookings, unassigned, workers, payments, ratings] = await Promise.all([
      db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("slot_date", today)
        .not("status", "in", "(pending_payment,expired,cancelled)"),
      db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      db.from("workers").select("is_online, status"),
      db
        .from("payments")
        .select("amount, created_at, booking:bookings!inner(city_id, city:cities!inner(name))")
        .in("status", ["captured", "partially_refunded"])
        .gte("created_at", `${weekStart}T00:00:00+05:30`),
      db.from("reviews").select("rating").gte("created_at", `${addDays(today, -29)}T00:00:00+05:30`),
    ]);

    for (const r of [todayBookings, unassigned, workers, payments, ratings]) if (r.error) throw r.error;

    const revenueByDay = new Map<string, number>();
    for (let i = 0; i < 7; i++) revenueByDay.set(addDays(weekStart, i), 0);
    const revenueByCity = new Map<string, number>();

    type PaymentAgg = { amount: number; created_at: string; booking: { city: { name: string } } };
    for (const p of (payments.data ?? []) as unknown as PaymentAgg[]) {
      const day = todayIn(TZ, new Date(p.created_at));
      revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + p.amount);
      revenueByCity.set(p.booking.city.name, (revenueByCity.get(p.booking.city.name) ?? 0) + p.amount);
    }

    const workerRows = (workers.data ?? []) as { is_online: boolean; status: string }[];
    const ratingRows = (ratings.data ?? []) as { rating: number }[];

    return {
      bookingsToday: todayBookings.count ?? 0,
      unassigned: unassigned.count ?? 0,
      workersActive: workerRows.filter((w) => w.status === "active").length,
      workersOnline: workerRows.filter((w) => w.status === "active" && w.is_online).length,
      averageRating: ratingRows.length
        ? Math.round((ratingRows.reduce((s, r) => s + r.rating, 0) / ratingRows.length) * 10) / 10
        : null,
      revenue7d: [...revenueByDay.values()].reduce((a, b) => a + b, 0),
      revenueByDay: [...revenueByDay].map(([date, amount]) => ({ date, amount })),
      revenueByCity: [...revenueByCity].map(([city, amount]) => ({ city, amount })),
    };
  },
};
