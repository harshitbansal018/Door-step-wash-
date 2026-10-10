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
  workerId?: string | null;
  customerId?: string;
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

export interface WorkerJob extends Booking {
  checklist: string[];
  earning: number;
  photos?: { id: string; kind: "before" | "after"; url: string | null }[];
}
