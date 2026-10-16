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
  serviceId?: string;
  vehicleType?: string;
  search?: string;
  ids?: string[];
  /** Only bookings created by a monthly plan, or only one-off bookings. */
  kind?: "plan" | "single";
  dateFrom?: string;
  dateTo?: string;
  /** Oldest first instead of newest first. */
  ascending?: boolean;
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
      .order("slot_date", { ascending: !!f.ascending })
      .order("slot_start", { ascending: !!f.ascending });
    if (f.ids) {
      if (!f.ids.length) return { rows: [] as BookingDetail[], total: 0 };
      q = q.in("id", f.ids);
    }
    if (f.status?.length) q = q.in("status", f.status);
    if (f.cityId) q = q.eq("city_id", f.cityId);
    if (f.customerId) q = q.eq("customer_id", f.customerId);
    if (f.workerId) q = q.eq("worker_id", f.workerId);
    if (f.date) q = q.eq("slot_date", f.date);
    if (f.dateFrom) q = q.gte("slot_date", f.dateFrom);
    if (f.dateTo) q = q.lte("slot_date", f.dateTo);
    if (f.kind === "plan") q = q.not("subscription_id", "is", null);
    if (f.kind === "single") q = q.is("subscription_id", null);
    if (f.serviceId) q = q.eq("service_id", f.serviceId);
    if (f.vehicleType) q = q.eq("vehicle_type", f.vehicleType);
    if (f.search) {
      q = q.or(`code.ilike.%${f.search}%,contact_name.ilike.%${f.search}%,vehicle_plate.ilike.%${f.search}%,contact_phone.ilike.%${f.search}%`);
    }
    const { data, count, error } = await q.range(f.from, f.to);
    if (error) throw error;
    return { rows: (data ?? []) as unknown as BookingDetail[], total: count ?? 0 };
  },

  async customerFilterOptions(db: Db, customerId: string) {
    const { data, error } = await db
      .from("bookings")
      .select("service_id, vehicle_type, service:services!inner(name)")
      .eq("customer_id", customerId);
    if (error) throw error;

    const services = new Map<string, string>();
    const vehicles = new Set<string>();
    for (const row of data ?? []) {
      const service = Array.isArray(row.service) ? row.service[0] : row.service;
      if (service?.name) services.set(row.service_id, service.name);
      if (row.vehicle_type) vehicles.add(row.vehicle_type);
    }
    return {
      services: [...services].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      vehicles: [...vehicles].sort(),
    };
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
