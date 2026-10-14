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
export type Tone = "slate" | "blue" | "green" | "amber" | "red" | "violet" | "sky";

export const VEHICLES: { id: VehicleType; label: string; hint: string }[] = [
  { id: "hatchback", label: "Hatchback", hint: "Small car" },
  { id: "sedan", label: "Sedan", hint: "Medium car" },
  { id: "suv", label: "SUV", hint: "Large car" },
  { id: "bike", label: "Bike", hint: "Two-wheeler" },
];

export const STATUS_META: Record<BookingStatus, { label: string; tone: Tone }> = {
  pending_payment: { label: "Payment pending", tone: "amber" },
  confirmed: { label: "Confirmed", tone: "blue" },
  assigned: { label: "Assigned", tone: "violet" },
  accepted: { label: "Accepted", tone: "sky" },
  on_the_way: { label: "On the way", tone: "sky" },
  in_progress: { label: "In progress", tone: "amber" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
  expired: { label: "Expired", tone: "slate" },
};

export interface Coverage {
  status: "served" | "area_not_served" | "city_inactive" | "unknown";
  city?: { id: string; name: string };
  area?: { id: string; name: string; extraCharge: number };
}

export interface CatalogService {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMin: number;
  features: string[];
  isPopular: boolean;
  prices: Partial<Record<VehicleType, number>>;
}

export interface StartingPrices {
  bike: number | null;
  car: number | null;
}

export interface Slot {
  id: string;
  start: string;
  end: string;
  available: number;
  bookable: boolean;
}

export interface Quote {
  basePrice: number;
  areaCharge: number;
  subtotal: number;
  discount: number;
  total: number;
  offer: { id: string; code: string; title: string } | null;
}

export interface Booking {
  id: string;
  code: string;
  status: BookingStatus;
  service: { id: string; name: string };
  cityId: string;
  areaId: string;
  city: string;
  area: string;
  slot: { date: string; start: string; end: string };
  vehicle: { type: VehicleType; makeModel: string; plate: string };
  address: {
    line: string;
    landmark: string | null;
    pincode: string;
    parkingType: string;
    parkingSpot: string | null;
    carAccess: string;
  };
  contact: { name: string; phone: string | null };
  price: { base: number; areaCharge: number; discount: number; total: number };
  worker: { name: string; rating: number; phone: string | null } | null;
  cancelledReason: string | null;
  createdAt: string;
  subscriptionId?: string | null;
  workerId?: string | null;
  customerId?: string;
}

export interface BookingDetails extends Booking {
  notes: string | null;
  timeline: { status: BookingStatus; at: string }[];
  photos: { kind: "before" | "after"; url: string | null }[];
  payment: { status: string; method: string | null; amount: number } | null;
}

export type SubscriptionStatus = "pending_payment" | "active" | "paused" | "cancelled" | "expired";

export const SUBSCRIPTION_META: Record<SubscriptionStatus, { label: string; tone: Tone }> = {
  pending_payment: { label: "Payment pending", tone: "amber" },
  active: { label: "Active", tone: "green" },
  paused: { label: "Paused", tone: "amber" },
  cancelled: { label: "Cancelled", tone: "red" },
  expired: { label: "Expired", tone: "slate" },
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** A monthly plan as shown in the public catalogue. Prices are per city; empty until an area is known. */
export interface CatalogPlan {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  washesPerMonth: number;
  bonusCount: number;
  visitsPerMonth: number;
  service: { id: string; name: string };
  bonusService: { id: string; name: string } | null;
  features: string[];
  isPopular: boolean;
  prices: Partial<Record<VehicleType, number>>;
  /** What the same visits would cost when booked one by one. */
  listPrices: Partial<Record<VehicleType, number>>;
}

export interface PlanQuote {
  planPrice: number;
  areaCharge: number;
  total: number;
  visits: number;
  perVisit: number;
  listPrice: number | null;
}

export interface PlanOptions {
  city: { id: string; name: string };
  area: { id: string; name: string; extraCharge: number };
  startTimes: string[];
  slotMinutes: number;
}

export interface Subscription {
  id: string;
  code: string;
  status: SubscriptionStatus;
  plan: {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    washesPerMonth: number;
    bonusCount: number;
    service: string;
    bonusService: string | null;
    features: string[];
  };
  city: string;
  area: string;
  weekday: number;
  startTime: string;
  vehicle: { type: VehicleType; makeModel: string; plate: string };
  address: { line: string; landmark: string | null; pincode: string };
  contact: { name: string; phone: string };
  price: { plan: number; areaCharge: number; total: number };
  period: { start: string | null; end: string | null };
  washes: { total: number; used: number; remaining: number };
  canRenew: boolean;
  cancelledReason: string | null;
  createdAt: string;
}

export interface SubscriptionVisit {
  id: string;
  code: string;
  status: BookingStatus;
  service: string;
  slot: { date: string; start: string; end: string };
  worker: { name: string; rating: number; phone: string | null } | null;
}

export interface SubscriptionSummary {
  subscription: Subscription;
  visits: SubscriptionVisit[];
  nextVisit: SubscriptionVisit | null;
  savings: number;
  lastPayment: { amount: number; status: string; paidAt: string; periodStart: string; periodEnd: string } | null;
}

export interface City {
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
  areas: Area[];
}

export interface Area {
  id: string;
  city_id: string;
  name: string;
  extra_charge: number;
  is_active: boolean;
  pincodes: string[];
}

export interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  cityId: string;
  area: string | null;
  areaId: string;
  status: WorkerStatus;
  isOnline: boolean;
  rating: number;
  jobsDone: number;
  commissionRate: number;
  hasKycDocument: boolean;
  bankLast4: string | null;
  joinedAt: string;
}

export interface WorkerMe {
  id: string;
  name: string;
  email: string;
  status: WorkerStatus;
  isOnline: boolean;
  rating: number;
  jobsDone: number;
  area: string | null;
  city: string | null;
  bankLast4: string | null;
  hasKycDocument: boolean;
}

export type JobIssueReason = "customer_unavailable" | "no_water" | "no_access" | "vehicle_not_found" | "unsafe_location" | "other";

export const JOB_ISSUE_OPTIONS: { id: JobIssueReason; label: string; hint: string }[] = [
  { id: "customer_unavailable", label: "Customer not available", hint: "Nobody to unlock the car or hand over keys" },
  { id: "no_water", label: "No water access", hint: "No tap or water source near the vehicle" },
  { id: "no_access", label: "Can't reach the vehicle", hint: "Gate, guard or parking blocked entry" },
  { id: "vehicle_not_found", label: "Vehicle not found", hint: "Car not at the given spot or plate doesn't match" },
  { id: "unsafe_location", label: "Unsafe location", hint: "Traffic, flooding or other safety risk" },
  { id: "other", label: "Other problem", hint: "Describe it in the note" },
];

export interface WorkerJob extends Booking {
  checklist: string[];
  earning: number;
  notes?: string | null;
  durationMin?: number;
  arrivedAt?: string | null;
  assignedAt?: string | null;
  hasOpenIssue?: boolean;
  photos?: { id: string; kind: "before" | "after"; url: string | null }[];
  issues?: { id: string; reason: JobIssueReason; label: string; note: string | null; resolved: boolean; createdAt: string }[];
  maxPhotosPerKind?: number;
}

export interface WorkerToday {
  stats: { earnedToday: number; completedToday: number; rating: number; jobsDone: number; isOnline: boolean; status: WorkerStatus };
  requests: WorkerJob[];
  upcoming: WorkerJob[];
  completedToday: WorkerJob[];
}
