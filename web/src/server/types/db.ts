// Row shapes of the database tables (see supabase/migrations).
// Tip: once the project is linked, `npx supabase gen types typescript` can generate these.

export type UserRole = "customer" | "worker" | "admin";
export type VehicleType = "hatchback" | "sedan" | "suv" | "bike";
export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "assigned"
  | "accepted"
  | "on_the_way"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired";
export type WorkerStatus = "pending_kyc" | "active" | "suspended";
export type PaymentStatus = "created" | "captured" | "failed" | "refunded" | "partially_refunded";
export type DiscountType = "flat" | "percent";
export type OfferUserType = "all" | "new";
export type ParkingType = "basement" | "open" | "covered" | "street";
export type CarAccess = "customer_present" | "key_with_security" | "no_access";
export type PhotoKind = "before" | "after";

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CityRow {
  id: string;
  slug: string;
  name: string;
  state: string;
  timezone: string;
  is_active: boolean;
  launch_date: string | null;
  open_time: string;
  close_time: string;
  slot_minutes: number;
  cancellation_window_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AreaRow {
  id: string;
  city_id: string;
  name: string;
  extra_charge: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  duration_min: number;
  features: string[];
  is_popular: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface CityServiceRow {
  city_id: string;
  service_id: string;
  vehicle_type: VehicleType;
  price: number;
  is_active: boolean;
}

export interface SlotRow {
  id: string;
  area_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked: number;
  is_blocked: boolean;
}

export interface WorkerRow {
  id: string;
  city_id: string;
  area_id: string;
  status: WorkerStatus;
  is_online: boolean;
  rating: number;
  rating_count: number;
  jobs_done: number;
  commission_rate: number;
  kyc_document_path: string | null;
  bank_last4: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfferRow {
  id: string;
  code: string;
  title: string;
  discount_type: DiscountType;
  value: number;
  max_discount: number | null;
  min_order: number;
  city_ids: string[];
  service_ids: string[];
  user_type: OfferUserType;
  valid_from: string;
  valid_to: string;
  usage_limit: number | null;
  per_user_limit: number;
  used_count: number;
  auto_apply: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRow {
  id: string;
  code: string;
  customer_id: string;
  city_id: string;
  area_id: string;
  service_id: string;
  slot_id: string;
  worker_id: string | null;
  offer_id: string | null;
  status: BookingStatus;
  status_changed_by: string | null;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  vehicle_type: VehicleType;
  vehicle_make_model: string;
  vehicle_plate: string;
  address_line: string;
  landmark: string | null;
  pincode: string;
  parking_type: ParkingType;
  parking_spot: string | null;
  car_access: CarAccess;
  contact_name: string;
  contact_phone: string;
  notes: string | null;
  base_price: number;
  area_charge: number;
  discount: number;
  total: number;
  expires_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  booking_id: string;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  error_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefundRow {
  id: string;
  payment_id: string;
  booking_id: string;
  amount: number;
  reason: string;
  provider_refund_id: string | null;
  status: "pending" | "processed" | "failed";
  created_by: string | null;
  created_at: string;
}

export interface PayoutRow {
  id: string;
  worker_id: string;
  period_start: string;
  period_end: string;
  total: number;
  status: "pending" | "paid";
  reference: string | null;
  paid_at: string | null;
  paid_by: string | null;
  created_at: string;
}

export interface EarningRow {
  id: string;
  worker_id: string;
  booking_id: string;
  amount: number;
  status: "pending" | "in_payout" | "paid";
  payout_id: string | null;
  created_at: string;
}

export interface PhotoRow {
  id: string;
  booking_id: string;
  kind: PhotoKind;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}
