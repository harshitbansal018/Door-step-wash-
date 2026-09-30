"use client";

import { useMemo, useState } from "react";
import {
  Bike,
  Car,
  CarFront,
  Check,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  Smartphone,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import {
  applyOffer,
  checkCoverage,
  SERVICES,
  TIME_SLOTS,
  VEHICLE_TYPES,
  type Offer,
  type VehicleType,
} from "@/lib/data";
import { cn, formatMoney } from "@/lib/utils";

const STEPS = ["Vehicle & package", "Date & time", "Address", "Review & pay"];

const vehicleIcon = { hatchback: Car, sedan: CarFront, suv: Truck, bike: Bike } as const;

function nextDays(count: number) {
  const days: { iso: string; weekday: string; day: string; month: string }[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({
      iso: d.toISOString().slice(0, 10),
      weekday: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short" }),
      day: String(d.getDate()),
      month: d.toLocaleDateString("en-IN", { month: "short" }),
    });
  }
  return days;
}

export function BookingWizard({
  initialService,
  initialVehicle,
  initialPincode,
}: {
  initialService?: string;
  initialVehicle?: VehicleType;
  initialPincode?: string;
}) {
  const [step, setStep] = useState(0);
  const [vehicle, setVehicle] = useState<VehicleType>(
    VEHICLE_TYPES.some((v) => v.id === initialVehicle) ? initialVehicle! : "hatchback",
  );
  const [serviceId, setServiceId] = useState(
    SERVICES.some((s) => s.id === initialService) ? initialService! : "premium",
  );
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const days = useMemo(() => nextDays(7), []);
  const [date, setDate] = useState(days[0].iso);
  const [slot, setSlot] = useState<string | null>(null);
  const [pincode, setPincode] = useState(initialPincode ?? "");
  const [house, setHouse] = useState("");
  const [landmark, setLandmark] = useState("");
  const [parking, setParking] = useState("");
  const [parkingType, setParkingType] = useState("Basement");
  const [access, setAccess] = useState("I'll be there");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ offer: Offer; discount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [payMethod, setPayMethod] = useState<"upi" | "card">("upi");
  const [paying, setPaying] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const service = SERVICES.find((s) => s.id === serviceId)!;
  const coverage = pincode.length === 6 ? checkCoverage(pincode) : null;
  const served = coverage?.status === "served" ? coverage : null;
  const basePrice = service.prices[vehicle];
  const areaCharge = served?.area.extraCharge ?? 0;
  const subtotal = basePrice + areaCharge;
  const discount = coupon?.discount ?? 0;
  const total = subtotal - discount;

  const canContinue = [
    model.trim().length > 1 && plate.trim().length > 3,
    !!slot,
    !!served && house.trim().length > 2,
    name.trim().length > 1 && /^\d{10}$/.test(phone.replace(/\s/g, "")),
  ][step];

  function tryCoupon() {
    setCouponError("");
    if (!served) return setCouponError("Add a serviceable address first.");
    const res = applyOffer(couponInput, { subtotal, cityId: served.city.id, serviceId });
    if (res.ok) {
      setCoupon({ offer: res.offer, discount: res.discount });
      setCouponInput("");
    } else setCouponError(res.reason);
  }

  function pay() {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setBookingId(`BK-${10483 + Math.floor(Math.random() * 400)}`);
    }, 1600);
  }

  if (bookingId) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center sm:p-12">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-9" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Booking confirmed!</h1>
        <p className="mt-2 text-slate-600">
          We&apos;ve sent the details to your phone. You&apos;ll get another message when your washer is assigned.
        </p>
        <dl className="mt-8 divide-y divide-slate-100 rounded-xl bg-slate-50 px-5 text-left text-sm">
          {[
            ["Booking ID", bookingId],
            ["Package", `${service.name} · ${VEHICLE_TYPES.find((v) => v.id === vehicle)?.label}`],
            ["When", `${days.find((d) => d.iso === date)?.weekday}, ${TIME_SLOTS.find((s) => s.id === slot)?.label}`],
            ["Where", `${house}, ${served?.area.name}, ${served?.city.name}`],
            ["Car parked in", `${parkingType}${parking ? ` · ${parking}` : ""}`],
            ["Access", access],
            ["Paid", formatMoney(total)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button href="/bookings">View my bookings</Button>
          <Button href="/" variant="secondary">
            Back to home
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Book a doorstep wash</h1>
        <p className="mt-1 text-slate-500">Takes about a minute. You won&apos;t be charged until the last step.</p>
      </div>

      {/* Stepper */}
      <ol className="mb-8 grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-brand-600" : "bg-slate-200")} />
            <p
              className={cn(
                "mt-2 hidden text-xs font-medium sm:block",
                i === step ? "text-brand-700" : i < step ? "text-slate-700" : "text-slate-400",
              )}
            >
              <span className="mr-1">{i + 1}.</span>
              {label}
            </p>
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="p-6 sm:p-8 lg:col-span-2">
          {step === 0 && (
            <div className="space-y-8">
              <section>
                <h2 className="text-lg font-semibold text-slate-900">What are we washing?</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {VEHICLE_TYPES.map((v) => {
                    const Icon = vehicleIcon[v.id];
                    return (
                      <button
                        key={v.id}
                        onClick={() => setVehicle(v.id)}
                        className={cn(
                          "rounded-xl p-4 text-left ring-1 transition",
                          vehicle === v.id
                            ? "bg-brand-50 ring-2 ring-brand-600"
                            : "bg-white ring-slate-200 hover:ring-slate-300",
                        )}
                      >
                        <Icon className={cn("size-6", vehicle === v.id ? "text-brand-600" : "text-slate-400")} />
                        <p className="mt-3 text-sm font-semibold text-slate-900">{v.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{v.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-900">Choose a package</h2>
                <div className="mt-4 space-y-3">
                  {SERVICES.filter((s) => s.isActive).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setServiceId(s.id)}
                      className={cn(
                        "flex w-full items-start gap-4 rounded-xl p-4 text-left ring-1 transition",
                        serviceId === s.id ? "bg-brand-50 ring-2 ring-brand-600" : "ring-slate-200 hover:ring-slate-300",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ring-1",
                          serviceId === s.id ? "bg-brand-600 ring-brand-600" : "ring-slate-300",
                        )}
                      >
                        {serviceId === s.id && <Check className="size-3.5 text-white" />}
                      </span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          {s.popular && <Badge tone="blue">Popular</Badge>}
                          <span className="text-xs text-slate-500">· {s.durationMin} min</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{s.features.slice(0, 3).join(" · ")}</p>
                      </div>
                      <p className="font-semibold text-slate-900">{formatMoney(s.prices[vehicle])}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="model">Make &amp; model</Label>
                  <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Hyundai Creta" />
                </div>
                <div>
                  <Label htmlFor="plate">Registration number</Label>
                  <Input
                    id="plate"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. HR 26 DK 4521"
                  />
                </div>
              </section>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <section>
                <h2 className="text-lg font-semibold text-slate-900">Pick a date</h2>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {days.map((d) => (
                    <button
                      key={d.iso}
                      onClick={() => {
                        setDate(d.iso);
                        setSlot(null);
                      }}
                      className={cn(
                        "flex w-20 shrink-0 flex-col items-center rounded-xl py-3 ring-1 transition",
                        date === d.iso ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-200 hover:ring-slate-300",
                      )}
                    >
                      <span className={cn("text-xs font-medium", date === d.iso ? "text-brand-100" : "text-slate-500")}>
                        {d.weekday}
                      </span>
                      <span className="mt-1 text-xl font-bold">{d.day}</span>
                      <span className={cn("text-xs", date === d.iso ? "text-brand-100" : "text-slate-500")}>{d.month}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-slate-900">Pick a time slot</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TIME_SLOTS.map((s) => {
                    const full = s.left === 0;
                    return (
                      <button
                        key={s.id}
                        disabled={full}
                        onClick={() => setSlot(s.id)}
                        className={cn(
                          "rounded-xl px-3 py-3 text-center ring-1 transition",
                          full && "cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-200",
                          !full && slot === s.id && "bg-brand-50 ring-2 ring-brand-600",
                          !full && slot !== s.id && "bg-white ring-slate-200 hover:ring-slate-300",
                        )}
                      >
                        <p className={cn("text-sm font-semibold", !full && "text-slate-900", full && "line-through")}>
                          {s.label}
                        </p>
                        <p className={cn("mt-0.5 text-xs", full ? "text-slate-400" : s.left <= 2 ? "text-amber-600" : "text-slate-500")}>
                          {full ? "Fully booked" : `${s.left} left`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Where is your car parked?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Our washer comes to this address and washes the car right where it&apos;s parked. We bring water, power
                  and all supplies.
                </p>
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit pincode"
                  className="max-w-xs"
                />
                {coverage && (
                  <div
                    className={cn(
                      "mt-3 flex items-start gap-2 rounded-lg p-3 text-sm",
                      served ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800",
                    )}
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    {served ? (
                      <span>
                        Great, we serve <strong>{served.area.name}</strong>, {served.city.name}.
                        {served.area.extraCharge > 0 && ` A ${formatMoney(served.area.extraCharge)} travel charge applies.`}
                      </span>
                    ) : coverage.status === "city_inactive" ? (
                      <span>We&apos;re launching in {coverage.city.name} soon. Bookings aren&apos;t open yet.</span>
                    ) : (
                      <span>Sorry, we don&apos;t serve this pincode yet. Try 122002, 122018 or 201301.</span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="house">House / flat, building, street</Label>
                <Input id="house" value={house} onChange={(e) => setHouse(e.target.value)} placeholder="Tower B-1204, DLF Park Place" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="landmark">Landmark (optional)</Label>
                  <Input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near Gate 2" />
                </div>
                <div>
                  <Label htmlFor="parking">Parking spot (optional)</Label>
                  <Input id="parking" value={parking} onChange={(e) => setParking(e.target.value)} placeholder="Basement 2, slot 118" />
                </div>
              </div>
              <div>
                <Label>Type of parking</Label>
                <div className="flex flex-wrap gap-2">
                  {["Basement", "Open parking", "Covered garage", "Street"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setParkingType(t)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition",
                        parkingType === t ? "bg-brand-50 text-brand-700 ring-2 ring-brand-600" : "text-slate-600 ring-slate-300 hover:bg-slate-50",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Car access during the wash</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {["I'll be there", "Key with security", "No access needed"].map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAccess(a)}
                      className={cn(
                        "rounded-lg px-3 py-2.5 text-sm font-medium ring-1 transition",
                        access === a ? "bg-brand-50 text-brand-700 ring-2 ring-brand-600" : "text-slate-600 ring-slate-300 hover:bg-slate-50",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                {access === "No access needed" && serviceId !== "basic" && (
                  <p className="mt-2 text-xs text-amber-700">
                    {service.name} includes interior cleaning, so the washer will need the car unlocked.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <section>
                <h2 className="text-lg font-semibold text-slate-900">Contact details</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Mobile number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                      placeholder="10-digit mobile"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-900">Payment method</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { id: "upi" as const, label: "UPI", hint: "GPay, PhonePe, Paytm", icon: Smartphone },
                    { id: "card" as const, label: "Card", hint: "Debit or credit card", icon: CreditCard },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPayMethod(m.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl p-4 text-left ring-1 transition",
                        payMethod === m.id ? "bg-brand-50 ring-2 ring-brand-600" : "ring-slate-200 hover:ring-slate-300",
                      )}
                    >
                      <m.icon className={cn("size-6", payMethod === m.id ? "text-brand-600" : "text-slate-400")} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{m.label}</p>
                        <p className="text-xs text-slate-500">{m.hint}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                  <Lock className="size-3.5" /> Payments are processed securely by our payment partner.
                </p>
              </section>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="size-4" /> Back
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>
                Continue
              </Button>
            ) : (
              <Button onClick={pay} disabled={!canContinue || paying} size="lg">
                {paying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Processing…
                  </>
                ) : (
                  <>Pay {formatMoney(total)}</>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Order summary</h2>
            </div>
            <div className="space-y-4 px-6 py-5 text-sm">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{service.name}</p>
                  <p className="text-slate-500">
                    {VEHICLE_TYPES.find((v) => v.id === vehicle)?.label}
                    {model && ` · ${model}`}
                  </p>
                </div>
                <p className="font-medium text-slate-900">{formatMoney(basePrice)}</p>
              </div>
              {slot && (
                <div className="flex justify-between text-slate-600">
                  <span>When</span>
                  <span className="text-right">
                    {days.find((d) => d.iso === date)?.weekday}, {TIME_SLOTS.find((s) => s.id === slot)?.label}
                  </span>
                </div>
              )}
              {served && (
                <div className="flex justify-between text-slate-600">
                  <span>Area</span>
                  <span className="text-right">
                    {served.area.name}, {served.city.name}
                  </span>
                </div>
              )}
              {areaCharge > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Travel charge</span>
                  <span>{formatMoney(areaCharge)}</span>
                </div>
              )}

              {/* Coupon */}
              <div className="border-t border-slate-100 pt-4">
                {coupon ? (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                    <span className="flex items-center gap-2 font-medium">
                      <Tag className="size-4" /> {coupon.offer.code}
                    </span>
                    <span className="flex items-center gap-2">
                      −{formatMoney(coupon.discount)}
                      <button onClick={() => setCoupon(null)} aria-label="Remove coupon" className="rounded p-0.5 hover:bg-emerald-100">
                        <X className="size-4" />
                      </button>
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        className="h-9"
                      />
                      <Button size="sm" variant="secondary" className="h-9" onClick={tryCoupon} disabled={!couponInput}>
                        Apply
                      </Button>
                    </div>
                    {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
                    <p className="mt-2 text-xs text-slate-400">Try WASH50 or FIRST30</p>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="text-xl font-bold text-slate-900">{formatMoney(total)}</span>
              </div>
            </div>
          </Card>
          <p className="mt-4 px-2 text-xs leading-5 text-slate-500">
            Free rescheduling up to 2 hours before your slot. Full refund on cancellations made 2+ hours in advance.
          </p>
        </aside>
      </div>
    </div>
  );
}
