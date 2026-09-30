import "server-only";
import { check } from "../lib/errors";
import type { Db } from "../lib/supabase";
import type { BookingRow, BookingStatus, PhotoKind, PhotoRow } from "../types/db";

export type BookingDetail = BookingRow & {
  service: { id: string; name: string; features: string[]; duration_min: number };
  city: { name: string };
  area: { name: string };
  worker: {
    id: string;
    rating: number;
    profile: { full_name: string; phone: string | null };
  } | null;
};

const DETAIL =
  "*, service:services!inner(id, name, features, duration_min), city:cities!inner(name), area:service_areas!inner(name), " +
  "worker:workers(id, rating, profile:profiles!inner(full_name, phone))";

export interface BookingListFilter {
  status?: BookingStatus[];
  cityId?: string;
  customerId?: string;
  workerId?: string;
  date?: string;
  search?: string;
  from: number;
  to: number;
}

export const bookingModel = {
  async create(db: Db, payload: Record<string, unknown>, holdMinutes: number): Promise<BookingRow> {
    return check(await db.rpc("create_pending_booking", { p: payload, p_hold_minutes: holdMinutes })) as BookingRow;
  },

  async findById(db: Db, id: string): Promise<BookingRow | null> {
    return check(await db.from("bookings").select("*").eq("id", id).maybeSingle()) as BookingRow | null;
  },

  async findDetail(db: Db, id: string): Promise<BookingDetail | null> {
    return check(await db.from("bookings").select(DETAIL).eq("id", id).maybeSingle()) as BookingDetail | null;
  },

  async list(db: Db, f: BookingListFilter) {
    let q = db
      .from("bookings")
      .select(DETAIL, { count: "exact" })
      .order("slot_date", { ascending: false })
      .order("slot_start", { ascending: false });
    if (f.status?.length) q = q.in("status", f.status);
    if (f.cityId) q = q.eq("city_id", f.cityId);
    if (f.customerId) q = q.eq("customer_id", f.customerId);
    if (f.workerId) q = q.eq("worker_id", f.workerId);
    if (f.date) q = q.eq("slot_date", f.date);
    if (f.search) {
      q = q.or(`code.ilike.%${f.search}%,contact_name.ilike.%${f.search}%,vehicle_plate.ilike.%${f.search}%,contact_phone.ilike.%${f.search}%`);
    }
    const { data, count, error } = await q.range(f.from, f.to);
    if (error) throw error;
    return { rows: (data ?? []) as unknown as BookingDetail[], total: count ?? 0 };
  },

  /**
   * Updates a booking only if it is still in one of the expected statuses.
   * Returns null when another request changed it first (optimistic locking).
   */
  async transition(
    db: Db,
    id: string,
    expected: BookingStatus[],
    patch: Partial<BookingRow> & { status_changed_by: string | null },
  ): Promise<BookingRow | null> {
    return check(
      await db.from("bookings").update(patch).eq("id", id).in("status", expected).select("*").maybeSingle(),
    ) as BookingRow | null;
  },

  async moveSlot(db: Db, bookingId: string, slotId: string, actorId: string) {
    return check(
      await db.rpc("move_booking_slot", { p_booking_id: bookingId, p_new_slot_id: slotId, p_actor: actorId }),
    ) as BookingRow;
  },

  async countByCustomer(db: Db, customerId: string, statuses: BookingStatus[]) {
    const { count, error } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .in("status", statuses);
    if (error) throw error;
    return count ?? 0;
  },

  async statusLog(db: Db, bookingId: string) {
    return check(
      await db
        .from("booking_status_log")
        .select("from_status, to_status, created_at")
        .eq("booking_id", bookingId)
        .order("created_at"),
    ) as { from_status: BookingStatus | null; to_status: BookingStatus; created_at: string }[];
  },

  async photos(db: Db, bookingId: string): Promise<PhotoRow[]> {
    return check(
      await db.from("booking_photos").select("*").eq("booking_id", bookingId).order("created_at"),
    ) as PhotoRow[];
  },

  async countPhotos(db: Db, bookingId: string, kind: PhotoKind) {
    const { count, error } = await db
      .from("booking_photos")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .eq("kind", kind);
    if (error) throw error;
    return count ?? 0;
  },

  async addPhoto(db: Db, data: { booking_id: string; kind: PhotoKind; storage_path: string; uploaded_by: string }) {
    return check(await db.from("booking_photos").insert(data).select("*").single()) as PhotoRow;
  },

  async addReview(
    db: Db,
    data: { booking_id: string; customer_id: string; worker_id: string | null; rating: number; comment?: string },
  ) {
    check(await db.from("reviews").insert(data));
  },

  async hasReview(db: Db, bookingId: string) {
    const { count, error } = await db
      .from("reviews")
      .select("booking_id", { count: "exact", head: true })
      .eq("booking_id", bookingId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};
