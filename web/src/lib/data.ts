// Mock data used until the backend API exists. Shapes mirror the planned database tables.

export type VehicleType = "hatchback" | "sedan" | "suv" | "bike";

export const VEHICLE_TYPES: { id: VehicleType; label: string; hint: string }[] = [
  { id: "hatchback", label: "Hatchback", hint: "Swift, i20, Baleno" },
  { id: "sedan", label: "Sedan", hint: "City, Verna, Dzire" },
  { id: "suv", label: "SUV", hint: "Creta, XUV700, Fortuner" },
  { id: "bike", label: "Bike", hint: "Any two-wheeler" },
];

export type Service = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  features: string[];
  popular?: boolean;
  isActive: boolean;
  prices: Record<VehicleType, number>;
};

export const SERVICES: Service[] = [
  {
    id: "basic",
    name: "Express Wash",
    description: "Quick exterior foam wash for a clean everyday look.",
    durationMin: 30,
    features: ["Foam wash & rinse", "Tyre & rim cleaning", "Microfibre dry", "Glass cleaning"],
    isActive: true,
    prices: { hatchback: 349, sedan: 399, suv: 499, bike: 149 },
  },
  {
    id: "premium",
    name: "Premium Wash",
    description: "Exterior wash plus a thorough interior clean.",
    durationMin: 60,
    features: [
      "Everything in Express",
      "Interior vacuuming",
      "Dashboard polish",
      "Door panel wipe-down",
      "Tyre shine",
    ],
    popular: true,
    isActive: true,
    prices: { hatchback: 649, sedan: 749, suv: 899, bike: 249 },
  },
  {
    id: "deluxe",
    name: "Deluxe Detailing",
    description: "Showroom finish with wax protection and deep interior care.",
    durationMin: 120,
    features: [
      "Everything in Premium",
      "Carnauba wax coat",
      "Seat shampoo",
      "Engine bay dressing",
      "AC vent sanitisation",
    ],
    isActive: true,
    prices: { hatchback: 1499, sedan: 1699, suv: 1999, bike: 499 },
  },
];

export type Area = {
  id: string;
  name: string;
  pincodes: string[];
  isActive: boolean;
  extraCharge: number;
};

export type City = {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
  launchDate: string;
  areas: Area[];
};

export const CITIES: City[] = [
  {
    id: "gurugram",
    name: "Gurugram",
    state: "Haryana",
    isActive: true,
    launchDate: "2026-06-01",
    areas: [
      { id: "gg-dlf", name: "DLF Phase 1–5", pincodes: ["122002", "122009"], isActive: true, extraCharge: 0 },
      { id: "gg-sohna", name: "Sohna Road", pincodes: ["122018"], isActive: true, extraCharge: 0 },
      { id: "gg-new", name: "New Gurugram", pincodes: ["122004", "122005"], isActive: true, extraCharge: 50 },
    ],
  },
  {
    id: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    isActive: true,
    launchDate: "2026-08-15",
    areas: [
      { id: "nd-18", name: "Sector 18–50", pincodes: ["201301", "201303"], isActive: true, extraCharge: 0 },
      { id: "nd-ext", name: "Noida Extension", pincodes: ["201306"], isActive: false, extraCharge: 50 },
    ],
  },
  {
    id: "pune",
    name: "Pune",
    state: "Maharashtra",
    isActive: false,
    launchDate: "2026-11-01",
    areas: [{ id: "pn-baner", name: "Baner & Aundh", pincodes: ["411045", "411007"], isActive: true, extraCharge: 0 }],
  },
];

export type CoverageResult =
  | { status: "served"; city: City; area: Area }
  | { status: "area_not_served"; city: City }
  | { status: "city_inactive"; city: City }
  | { status: "unknown" };

export function checkCoverage(pincode: string): CoverageResult {
  for (const city of CITIES) {
    const area = city.areas.find((a) => a.pincodes.includes(pincode));
    if (!area) continue;
    if (!city.isActive) return { status: "city_inactive", city };
    if (!area.isActive) return { status: "area_not_served", city };
    return { status: "served", city, area };
  }
  return { status: "unknown" };
}

export const TIME_SLOTS = [
  { id: "s1", label: "08:00 – 09:00", left: 3 },
  { id: "s2", label: "09:00 – 10:00", left: 1 },
  { id: "s3", label: "10:00 – 11:00", left: 0 },
  { id: "s4", label: "11:00 – 12:00", left: 4 },
  { id: "s5", label: "14:00 – 15:00", left: 2 },
  { id: "s6", label: "15:00 – 16:00", left: 5 },
  { id: "s7", label: "16:00 – 17:00", left: 2 },
  { id: "s8", label: "17:00 – 18:00", left: 0 },
];

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "assigned"
  | "accepted"
  | "on_the_way"
  | "in_progress"
  | "completed"
  | "cancelled";

export const STATUS_META: Record<BookingStatus, { label: string; tone: Tone }> = {
  pending_payment: { label: "Pending payment", tone: "amber" },
  confirmed: { label: "Confirmed", tone: "blue" },
  assigned: { label: "Assigned", tone: "violet" },
  accepted: { label: "Accepted", tone: "violet" },
  on_the_way: { label: "On the way", tone: "sky" },
  in_progress: { label: "In progress", tone: "sky" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
};

export type Tone = "slate" | "blue" | "green" | "amber" | "red" | "violet" | "sky";

export type Booking = {
  id: string;
  customer: string;
  phone: string;
  cityId: string;
  area: string;
  address: string;
  vehicleType: VehicleType;
  vehicle: string;
  plate: string;
  serviceId: string;
  date: string;
  slot: string;
  status: BookingStatus;
  amount: number;
  discount: number;
  offerCode?: string;
  workerId?: string;
  payment: "UPI" | "Card" | "Cash";
};

export const BOOKINGS: Booking[] = [
  { id: "BK-10482", customer: "Aarav Mehta", phone: "98110 23456", cityId: "gurugram", area: "DLF Phase 1–5", address: "Tower B-1204, DLF Park Place", vehicleType: "suv", vehicle: "Hyundai Creta", plate: "HR 26 DK 4521", serviceId: "premium", date: "2026-10-01", slot: "09:00 – 10:00", status: "on_the_way", amount: 899, discount: 0, workerId: "w1", payment: "UPI" },
  { id: "BK-10481", customer: "Priya Sharma", phone: "98722 11890", cityId: "gurugram", area: "Sohna Road", address: "Flat 802, Central Park II", vehicleType: "hatchback", vehicle: "Maruti Swift", plate: "HR 26 CB 9087", serviceId: "basic", date: "2026-10-01", slot: "10:00 – 11:00", status: "accepted", amount: 299, discount: 50, offerCode: "WASH50", workerId: "w2", payment: "Card" },
  { id: "BK-10480", customer: "Rohan Gupta", phone: "99530 77812", cityId: "noida", area: "Sector 18–50", address: "C-44, Sector 50", vehicleType: "sedan", vehicle: "Honda City", plate: "UP 16 BT 3310", serviceId: "deluxe", date: "2026-10-01", slot: "11:00 – 12:00", status: "confirmed", amount: 1699, discount: 0, payment: "UPI" },
  { id: "BK-10479", customer: "Neha Kapoor", phone: "98100 45671", cityId: "gurugram", area: "New Gurugram", address: "Villa 17, Sector 82", vehicleType: "suv", vehicle: "Mahindra XUV700", plate: "HR 26 EF 1188", serviceId: "deluxe", date: "2026-10-01", slot: "14:00 – 15:00", status: "assigned", amount: 1839, discount: 210, offerCode: "FESTIVE15", workerId: "w3", payment: "UPI" },
  { id: "BK-10478", customer: "Vikram Singh", phone: "97170 99001", cityId: "noida", area: "Sector 18–50", address: "B-12, Sector 27", vehicleType: "bike", vehicle: "Royal Enfield Classic", plate: "UP 16 AZ 7765", serviceId: "basic", date: "2026-09-30", slot: "16:00 – 17:00", status: "completed", amount: 149, discount: 0, workerId: "w4", payment: "Cash" },
  { id: "BK-10477", customer: "Ananya Rao", phone: "98991 22334", cityId: "gurugram", area: "DLF Phase 1–5", address: "House 211, DLF Phase 3", vehicleType: "sedan", vehicle: "Skoda Slavia", plate: "HR 26 DL 5541", serviceId: "premium", date: "2026-09-30", slot: "15:00 – 16:00", status: "completed", amount: 749, discount: 0, workerId: "w1", payment: "Card" },
  { id: "BK-10476", customer: "Karan Malhotra", phone: "98183 66420", cityId: "gurugram", area: "Sohna Road", address: "Tower 4-1502, Nirvana Country", vehicleType: "hatchback", vehicle: "Hyundai i20", plate: "HR 26 CX 2290", serviceId: "premium", date: "2026-09-30", slot: "11:00 – 12:00", status: "cancelled", amount: 649, discount: 0, payment: "UPI" },
  { id: "BK-10475", customer: "Ishita Verma", phone: "99100 87123", cityId: "noida", area: "Sector 18–50", address: "A-301, Sector 44", vehicleType: "suv", vehicle: "Toyota Fortuner", plate: "UP 16 CK 0099", serviceId: "premium", date: "2026-09-29", slot: "09:00 – 10:00", status: "completed", amount: 899, discount: 0, workerId: "w4", payment: "UPI" },
  { id: "BK-10474", customer: "Aarav Mehta", phone: "98110 23456", cityId: "gurugram", area: "DLF Phase 1–5", address: "Tower B-1204, DLF Park Place", vehicleType: "suv", vehicle: "Hyundai Creta", plate: "HR 26 DK 4521", serviceId: "basic", date: "2026-09-14", slot: "08:00 – 09:00", status: "completed", amount: 499, discount: 0, workerId: "w2", payment: "UPI" },
];

export type Worker = {
  id: string;
  name: string;
  phone: string;
  cityId: string;
  area: string;
  online: boolean;
  rating: number;
  jobsDone: number;
  status: "active" | "pending_kyc" | "suspended";
  pendingEarnings: number;
  joined: string;
};

export const WORKERS: Worker[] = [
  { id: "w1", name: "Ramesh Kumar", phone: "98990 11223", cityId: "gurugram", area: "DLF Phase 1–5", online: true, rating: 4.9, jobsDone: 412, status: "active", pendingEarnings: 3840, joined: "2026-06-01" },
  { id: "w2", name: "Sunil Yadav", phone: "98112 45566", cityId: "gurugram", area: "Sohna Road", online: true, rating: 4.7, jobsDone: 356, status: "active", pendingEarnings: 2910, joined: "2026-06-03" },
  { id: "w3", name: "Deepak Chauhan", phone: "97111 88990", cityId: "gurugram", area: "New Gurugram", online: false, rating: 4.8, jobsDone: 198, status: "active", pendingEarnings: 2250, joined: "2026-07-10" },
  { id: "w4", name: "Manoj Tiwari", phone: "99582 33447", cityId: "noida", area: "Sector 18–50", online: true, rating: 4.6, jobsDone: 87, status: "active", pendingEarnings: 1620, joined: "2026-08-15" },
  { id: "w5", name: "Arjun Pal", phone: "98734 11009", cityId: "noida", area: "Sector 18–50", online: false, rating: 0, jobsDone: 0, status: "pending_kyc", pendingEarnings: 0, joined: "2026-09-26" },
];

export type Offer = {
  id: string;
  code: string;
  title: string;
  type: "flat" | "percent";
  value: number;
  maxDiscount?: number;
  minOrder: number;
  cityIds: string[]; // empty = all cities
  serviceIds: string[]; // empty = all services
  userType: "all" | "new";
  validFrom: string;
  validTo: string;
  used: number;
  usageLimit?: number;
  perUserLimit: number;
  autoApply: boolean;
  isActive: boolean;
};

export const OFFERS: Offer[] = [
  { id: "o1", code: "WASH50", title: "₹50 off any wash", type: "flat", value: 50, minOrder: 299, cityIds: [], serviceIds: [], userType: "all", validFrom: "2026-09-01", validTo: "2026-10-31", used: 120, usageLimit: 500, perUserLimit: 1, autoApply: false, isActive: true },
  { id: "o2", code: "FESTIVE15", title: "Festive 15% off detailing", type: "percent", value: 15, maxDiscount: 300, minOrder: 999, cityIds: ["gurugram"], serviceIds: ["deluxe"], userType: "all", validFrom: "2026-09-20", validTo: "2026-11-15", used: 43, usageLimit: 200, perUserLimit: 1, autoApply: false, isActive: true },
  { id: "o3", code: "FIRST30", title: "30% off your first wash", type: "percent", value: 30, maxDiscount: 250, minOrder: 0, cityIds: [], serviceIds: [], userType: "new", validFrom: "2026-06-01", validTo: "2026-12-31", used: 890, perUserLimit: 1, autoApply: false, isActive: true },
  { id: "o4", code: "NOIDA100", title: "Noida launch ₹100 off", type: "flat", value: 100, minOrder: 499, cityIds: ["noida"], serviceIds: [], userType: "all", validFrom: "2026-08-15", validTo: "2026-09-15", used: 212, usageLimit: 300, perUserLimit: 1, autoApply: false, isActive: false },
];

// Client-side preview only; the real check runs on the server.
export function applyOffer(
  code: string,
  ctx: { subtotal: number; cityId: string; serviceId: string },
): { ok: true; offer: Offer; discount: number } | { ok: false; reason: string } {
  const offer = OFFERS.find((o) => o.code.toLowerCase() === code.trim().toLowerCase());
  if (!offer || !offer.isActive) return { ok: false, reason: "This code is not valid." };
  if (offer.cityIds.length && !offer.cityIds.includes(ctx.cityId))
    return { ok: false, reason: "This offer is not available in your city." };
  if (offer.serviceIds.length && !offer.serviceIds.includes(ctx.serviceId))
    return { ok: false, reason: "This offer does not apply to the selected package." };
  if (ctx.subtotal < offer.minOrder)
    return { ok: false, reason: `Minimum order for this offer is ₹${offer.minOrder}.` };
  let discount = offer.type === "flat" ? offer.value : Math.round((ctx.subtotal * offer.value) / 100);
  if (offer.maxDiscount) discount = Math.min(discount, offer.maxDiscount);
  return { ok: true, offer, discount: Math.min(discount, ctx.subtotal) };
}

export const cityName = (id: string) => CITIES.find((c) => c.id === id)?.name ?? id;
export const serviceName = (id: string) => SERVICES.find((s) => s.id === id)?.name ?? id;
export const workerById = (id?: string) => WORKERS.find((w) => w.id === id);

export const PAYOUTS = [
  { id: "PO-0031", workerId: "w1", period: "15–21 Sep 2026", total: 5120, status: "paid" as const, reference: "UTR 2026092218831" },
  { id: "PO-0030", workerId: "w2", period: "15–21 Sep 2026", total: 4380, status: "paid" as const, reference: "UTR 2026092218830" },
  { id: "PO-0029", workerId: "w3", period: "15–21 Sep 2026", total: 2960, status: "paid" as const, reference: "UTR 2026092218829" },
  { id: "PO-0028", workerId: "w4", period: "15–21 Sep 2026", total: 1840, status: "paid" as const, reference: "UTR 2026092218828" },
];

export const REVENUE_7D = [
  { day: "Thu", amount: 18450 },
  { day: "Fri", amount: 22100 },
  { day: "Sat", amount: 34800 },
  { day: "Sun", amount: 41250 },
  { day: "Mon", amount: 19900 },
  { day: "Tue", amount: 21480 },
  { day: "Wed", amount: 26730 },
];
