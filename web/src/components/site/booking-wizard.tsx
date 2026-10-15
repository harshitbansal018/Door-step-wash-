"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bike, Car, CarFront, Check, CheckCircle2, Loader2, MapPin, Plus, Tag, Truck } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { type CatalogAddon, type CatalogService, type Coverage, type Quote, type Slot, VEHICLES, type VehicleType } from "@/lib/domain";
import { CheckoutDismissed, openCheckout, type Checkout } from "@/lib/razorpay-client";
import { cn, formatMoney } from "@/lib/utils";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { toast } from "@/components/popups";

type CreateResult = { booking: { id: string; code: string; total: number }; quote: Quote; checkout: Checkout | null; paymentSkipped: boolean };

const STEPS = ["Service area", "Vehicle & package", "Date & time", "Details & payment"];
const vehicleIcon = { hatchback: Car, sedan: CarFront, suv: Truck, bike: Bike } as const;
const parkingValues = [
  ["basement", "Basement"],
  ["open", "Open parking"],
  ["covered", "Covered garage"],
  ["street", "Street"],
] as const;
const accessValues = [
  ["customer_present", "I'll be there"],
  ["key_with_security", "Key with security"],
  ["no_access", "No access needed"],
] as const;

function nextDays(count = 14) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      iso: date.toLocaleDateString("en-CA"),
      label:
        index === 0
          ? "Today"
          : index === 1
            ? "Tomorrow"
            : date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
    };
  });
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
  const days = useMemo(() => nextDays(), []);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [pincode, setPincode] = useState(initialPincode ?? "");
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [vehicle, setVehicle] = useState<VehicleType>(initialVehicle ?? "hatchback");
  const [serviceId, setServiceId] = useState(initialService ?? "");
  const [addons, setAddons] = useState<CatalogAddon[]>([]);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [date, setDate] = useState(days[0].iso);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [parkingType, setParkingType] = useState("basement");
  const [parkingSpot, setParkingSpot] = useState("");
  const [carAccess, setCarAccess] = useState("customer_present");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{ id: string; code: string; paid: boolean } | null>(null);

  const service = services.find((item) => item.id === serviceId);
  const selectedSlot = slots.find((item) => item.id === slotId);
  const served = coverage?.status === "served" && coverage.area ? coverage : null;
  const vehicleAddons = addons.filter((item) => !item.vehicleTypes.length || item.vehicleTypes.includes(vehicle));
  const chosenAddons = vehicleAddons.filter((item) => addonIds.includes(item.id));
  const addonsTotal = chosenAddons.reduce((sum, item) => sum + item.price, 0);
  // Only add-ons that fit the current vehicle are sent.
  const selectedAddonIds = chosenAddons.map((item) => item.id);

  useEffect(() => {
    let live = true;
    api<CatalogAddon[]>("/api/addons")
      .then((data) => live && setAddons(data))
      .catch(() => live && setAddons([]));
    return () => {
      live = false;
    };
  }, []);

  function toggleAddon(id: string) {
    setAddonIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
    setQuote(null);
  }

  useEffect(() => {
    if (pincode.length !== 6) {
      setCoverage(null);
      setServices([]);
      return;
    }
    let live = true;
    setBusy(true);
    setError("");
    api<Coverage>(`/api/coverage?pincode=${pincode}`)
      .then(async (result) => {
        if (!live) return;
        setCoverage(result);
        if (result.status === "served" && result.area) {
          const catalog = await api<CatalogService[]>(`/api/catalog?areaId=${result.area.id}`);
          if (!live) return;
          setServices(catalog);
          setServiceId((current) =>
            catalog.some((item) => item.id === current) ? current : (catalog[0]?.id ?? ""),
          );
        } else {
          setServices([]);
        }
      })
      .catch((caught: ApiError) => live && setError(caught.message))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [pincode]);

  useEffect(() => {
    if (!served?.area) return;
    let live = true;
    setBusy(true);
    setSlotId("");
    api<Slot[]>(`/api/slots?areaId=${served.area.id}&date=${date}`)
      .then((data) => live && setSlots(data))
      .catch((caught: ApiError) => live && setError(caught.message))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [date, served?.area?.id]);

  useEffect(() => {
    if (step !== 3 || !service || !served || coupon) return;
    let live = true;
    api<Quote>("/api/offers/validate", { method: "POST", body: { pincode, serviceId: service.id, vehicleType: vehicle, slotId: slotId || undefined, addonIds: selectedAddonIds } })
      .then((data) => live && setQuote(data))
      .catch(() => live && setQuote(null));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedAddonIds is derived from addonIds
  }, [step, service, served, coupon, pincode, vehicle, slotId, addonIds.join(",")]);

  async function applyCoupon() {
    if (!service || !coupon) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<Quote>("/api/offers/validate", {
        method: "POST",
        body: { code: coupon, pincode, serviceId: service.id, vehicleType: vehicle, slotId: slotId || undefined, addonIds: selectedAddonIds },
      });
      setQuote(data);
      toast.success("Coupon applied", `${coupon} was added to your order.`);
    } catch (caught) {
      setQuote(null);
      setError(caught instanceof Error ? caught.message : "Could not apply this coupon.");
      toast.error("Coupon not applied", caught instanceof Error ? caught.message : "Could not apply this coupon.");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!service || !slotId) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<CreateResult>("/api/bookings", {
        method: "POST",
        body: {
          serviceId: service.id,
          vehicleType: vehicle,
          vehicleMakeModel: model,
          vehiclePlate: plate,
          slotId,
          pincode,
          addressLine: address,
          landmark: landmark || undefined,
          parkingType,
          parkingSpot: parkingSpot || undefined,
          carAccess,
          contactName: name,
          contactPhone: phone,
          notes: notes || undefined,
          addonIds: selectedAddonIds,
          offerCode: coupon && quote?.offers?.some((o) => o.code === coupon) ? coupon : undefined,
        },
      });
      if (!result.checkout) {
        setConfirmed({ id: result.booking.id, code: result.booking.code, paid: !result.paymentSkipped });
        toast.success("Booking confirmed", `Your booking code is ${result.booking.code}.`);
        setBusy(false);
        return;
      }
      let response;
      try {
        response = await openCheckout(result.checkout);
      } catch (caught) {
        setBusy(false);
        if (caught instanceof CheckoutDismissed) toast.warning("Payment not completed", "Your slot is held briefly. Complete payment to confirm.");
        setError(
          caught instanceof CheckoutDismissed
            ? "Payment was not completed. Your slot is held briefly; start a new booking if it expires."
            : caught instanceof Error
              ? caught.message
              : "Could not open the payment window.",
        );
        return;
      }
      try {
        await api("/api/payments/verify", {
          method: "POST",
          body: {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          },
        });
        setConfirmed({ id: result.booking.id, code: result.booking.code, paid: true });
        toast.success("Booking confirmed", `Payment received for booking ${result.booking.code}.`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Payment verification failed.");
        toast.error("Payment failed", caught instanceof Error ? caught.message : "Payment verification failed.");
      } finally {
        setBusy(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start payment.");
      setBusy(false);
    }
  }

  const canNext = [
    !!served,
    !!service && !!service.prices[vehicle],
    !!slotId,
    model.trim().length >= 2 &&
      plate.trim().length >= 4 &&
      address.trim().length >= 5 &&
      name.trim().length >= 2 &&
      /^\d{10}$/.test(phone),
  ][step];

  if (confirmed) {
    return (
      <Card className="page-enter relative mx-auto max-w-xl overflow-hidden p-10 text-center">
        <div aria-hidden className="absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
        <span className="relative mx-auto flex size-20 items-center justify-center">
          <span aria-hidden className="check-ring absolute inset-0 rounded-full bg-emerald-400/40" />
          <span className="check-pop relative flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <CheckCircle2 className="size-9" />
          </span>
        </span>
        <h1 className="hero-enter relative mt-5 text-2xl font-bold">Booking confirmed</h1>
        <p className="hero-enter-delayed relative mt-2 text-slate-600">
          Booking <strong className="text-slate-900">{confirmed.code}</strong> is {confirmed.paid ? "paid and confirmed" : "confirmed in development mode without payment"}.
        </p>
        <div className="hero-enter-delayed relative mt-6">
          <Button href="/bookings">View my bookings</Button>
        </div>
      </Card>
    );
  }

  const goTo = (next: number) => {
    setDirection(next > step ? "forward" : "back");
    setStep(next);
  };
  const stepClass = direction === "forward" ? "step-enter" : "step-enter-back";

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Book a doorstep wash</h1>
      <p className="mt-1 text-slate-500">Choose a live service, time slot and pay securely.</p>
      <ol className="my-8 grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label}>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full bg-brand-600 transition-transform duration-500 ease-out",
                    done || current ? "origin-left scale-x-100" : "origin-left scale-x-0",
                    current && "pulse-soft",
                  )}
                />
              </div>
              <p
                className={cn(
                  "mt-2 hidden text-xs transition-colors duration-300 sm:flex sm:items-center sm:gap-1.5",
                  current ? "font-semibold text-brand-700" : done ? "text-slate-700" : "text-slate-400",
                )}
              >
                {done ? (
                  <span className="check-pop flex size-4 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="size-2.5" />
                  </span>
                ) : (
                  <span>{index + 1}.</span>
                )}
                {label}
              </p>
            </li>
          );
        })}
      </ol>
      {error && (
        <div role="alert" className="step-enter mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}
      <Card className="overflow-hidden p-6 sm:p-8">
        {step === 0 && (
          <div key="step-0" className={cn("space-y-5", stepClass)}>
            <div>
              <Label htmlFor="pincode">Service pincode</Label>
              <Input id="pincode" inputMode="numeric" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit pincode" />
            </div>
            {busy && <p className="step-enter flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Checking coverage…</p>}
            {coverage && (
              <div className={cn("step-enter flex gap-2 rounded-lg p-4 text-sm ring-1", served ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : "bg-amber-50 text-amber-800 ring-amber-100")}>
                <MapPin className="check-pop size-4 shrink-0" />
                {served ? `We serve ${served.area?.name}, ${served.city?.name}.` : "This pincode is not currently serviceable."}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div key="step-1" className={cn("space-y-7", stepClass)}>
            <section>
              <h2 className="font-semibold">Vehicle type</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {VEHICLES.map((item) => {
                  const Icon = vehicleIcon[item.id];
                  const selected = vehicle === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={selected}
                      onClick={() => { setVehicle(item.id); setQuote(null); }}
                      className={cn(
                        "group rounded-xl p-4 text-left ring-1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-[.98]",
                        selected ? "bg-brand-50 ring-2 ring-brand-600 shadow-sm shadow-brand-600/10" : "ring-slate-200 hover:ring-slate-300",
                      )}
                    >
                      <Icon className={cn("size-5 transition-all duration-300 group-hover:scale-110", selected ? "text-brand-600" : "text-slate-500")} />
                      <p className="mt-2 font-semibold">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.hint}</p>
                    </button>
                  );
                })}
              </div>
            </section>
            <section>
              <h2 className="font-semibold">Package</h2>
              <div key={vehicle} className="mt-3 space-y-3">
                {services.filter((item) => item.prices[vehicle]).map((item, index) => {
                  const selected = serviceId === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={selected}
                      onClick={() => { setServiceId(item.id); setQuote(null); }}
                      style={{ animationDelay: `${index * 60}ms` }}
                      className={cn(
                        "step-enter flex w-full items-start gap-3 rounded-xl p-4 text-left ring-1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-[.99]",
                        selected ? "bg-brand-50 ring-2 ring-brand-600 shadow-sm shadow-brand-600/10" : "ring-slate-200 hover:ring-slate-300",
                      )}
                    >
                      <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300", selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white")}>
                        {selected && <Check className="check-pop size-3" />}
                      </span>
                      <span className="flex-1"><span className="font-semibold">{item.name}</span>{item.isPopular && <Badge className="ml-2" tone="blue">Popular</Badge>}<span className="block text-sm text-slate-500">{item.features.join(" · ")}</span></span>
                      <strong className="tabular-nums">{formatMoney(item.prices[vehicle] ?? 0)}</strong>
                    </button>
                  );
                })}
              </div>
            </section>
            {vehicleAddons.length > 0 && (
              <section>
                <h2 className="font-semibold">Add extras <span className="font-normal text-slate-500">(optional)</span></h2>
                <p className="mt-1 text-sm text-slate-500">Done during the same visit.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {vehicleAddons.map((item) => {
                    const selected = addonIds.includes(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        aria-pressed={selected}
                        onClick={() => toggleAddon(item.id)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl p-4 text-left ring-1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-[.99]",
                          selected ? "bg-brand-50 ring-2 ring-brand-600 shadow-sm shadow-brand-600/10" : "ring-slate-200 hover:ring-slate-300",
                        )}
                      >
                        <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all duration-300", selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-400")}>
                          {selected ? <Check className="check-pop size-3" /> : <Plus className="size-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">{item.name}</span>
                          {item.description && <span className="block text-sm text-slate-500">{item.description}</span>}
                        </span>
                        <strong className="shrink-0 tabular-nums">+{formatMoney(item.price)}</strong>
                      </button>
                    );
                  })}
                </div>
                {addonsTotal > 0 && <p className="step-enter mt-3 text-sm font-medium text-brand-700">Extras: +{formatMoney(addonsTotal)}</p>}
              </section>
            )}
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className={stepClass}>
            <h2 className="font-semibold">Choose date</h2>
            <div className="scroll-slim mt-3 flex gap-2 overflow-x-auto pb-2">
              {days.map((item) => (
                <button
                  type="button"
                  key={item.iso}
                  aria-pressed={date === item.iso}
                  onClick={() => setDate(item.iso)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-2 text-sm ring-1 transition-all duration-300 active:scale-95",
                    date === item.iso ? "bg-brand-600 text-white shadow-md shadow-brand-600/25 ring-brand-600" : "ring-slate-200 hover:bg-slate-50 hover:ring-slate-300",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <h2 className="mt-6 font-semibold">Available times</h2>
            {busy && slots.length === 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy>
                {Array.from({ length: 8 }).map((_, index) => <div key={index} className="skeleton h-16 rounded-lg" />)}
              </div>
            ) : (
              <div key={date} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {slots.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    disabled={!item.bookable}
                    aria-pressed={slotId === item.id}
                    onClick={() => setSlotId(item.id)}
                    style={{ animationDelay: `${index * 40}ms` }}
                    className={cn(
                      "step-enter rounded-lg p-3 text-sm ring-1 transition-all duration-300 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md enabled:active:scale-[.97] disabled:bg-slate-50 disabled:text-slate-400",
                      slotId === item.id ? "bg-brand-50 ring-2 ring-brand-600 shadow-sm shadow-brand-600/10" : "ring-slate-200 enabled:hover:ring-slate-300",
                    )}
                  >
                    <strong>{item.start}–{item.end}</strong>
                    <span className="block text-xs">{item.bookable ? `${item.available} available` : "Unavailable"}</span>
                  </button>
                ))}
              </div>
            )}
            {!busy && slots.length === 0 && <p className="step-enter mt-3 text-sm text-slate-500">No slots are available for this date.</p>}
          </div>
        )}

        {step === 3 && (
          <div key="step-3" className={cn("grid gap-5 sm:grid-cols-2", stepClass)}>
            <div><Label htmlFor="model">Make and model</Label><Input id="model" value={model} onChange={(event) => setModel(event.target.value)} /></div>
            <div><Label htmlFor="plate">Registration number</Label><Input id="plate" value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} /></div>
            <div className="sm:col-span-2"><Label htmlFor="address">Full address</Label><Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} /></div>
            <div><Label htmlFor="landmark">Landmark (optional)</Label><Input id="landmark" value={landmark} onChange={(event) => setLandmark(event.target.value)} /></div>
            <div><Label htmlFor="spot">Parking spot (optional)</Label><Input id="spot" value={parkingSpot} onChange={(event) => setParkingSpot(event.target.value)} /></div>
            <div><Label htmlFor="parking">Parking type</Label><Select id="parking" value={parkingType} onChange={(event) => setParkingType(event.target.value)}>{parkingValues.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
            <div><Label htmlFor="access">Car access</Label><Select id="access" value={carAccess} onChange={(event) => setCarAccess(event.target.value)}>{accessValues.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
            <div><Label htmlFor="name">Contact name</Label><Input id="name" value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div><Label htmlFor="phone">Mobile number</Label><Input id="phone" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
            <div className="sm:col-span-2"><Label htmlFor="notes">Notes (optional)</Label><Input id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
            <div className="sm:col-span-2 flex gap-2"><Input aria-label="Coupon code" value={coupon} onChange={(event) => { setCoupon(event.target.value.toUpperCase()); setQuote(null); }} placeholder="Coupon code" /><Button type="button" variant="secondary" onClick={applyCoupon} disabled={!coupon || busy}><Tag className="size-4" />Apply</Button></div>
            {service && (
              <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
                <div className="flex justify-between">
                  <span>{service.name} · {selectedSlot?.start}–{selectedSlot?.end}</span>
                  <strong key={quote?.total ?? "base"} className="step-enter tabular-nums">
                    {formatMoney(quote?.total ?? (service.prices[vehicle] ?? 0) + (served?.area?.extraCharge ?? 0) + addonsTotal)}
                  </strong>
                </div>
                {chosenAddons.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-slate-600">
                    {chosenAddons.map((item) => (
                      <p key={item.id} className="flex justify-between gap-3"><span className="flex items-center gap-1.5"><Plus className="size-3.5" />{item.name}</span><span className="tabular-nums">{formatMoney(item.price)}</span></p>
                    ))}
                  </div>
                )}
                {quote?.discount ? (
                  <div className="step-enter mt-2 space-y-1 border-t border-slate-200 pt-2">
                    <p className="flex justify-between text-slate-500"><span>Price</span><span className="tabular-nums line-through">{formatMoney(quote.subtotal)}</span></p>
                    {(quote.offers?.length ? quote.offers : quote.offer ? [{ ...quote.offer, label: "Offer", discount: quote.discount }] : []).map((o) => (
                      <p key={o.id} className="flex justify-between gap-3 font-medium text-emerald-700">
                        <span className="flex min-w-0 items-center gap-1.5"><Tag className="size-3.5 shrink-0" /><span className="truncate">{o.title} <span className="font-normal text-emerald-600">({o.code})</span></span></span>
                        <span className="shrink-0 tabular-nums">−{formatMoney(o.discount)}</span>
                      </p>
                    ))}
                    <p className="text-xs font-semibold text-emerald-700">You save {formatMoney(quote.discount)}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-between border-t border-slate-200 pt-5">
          <Button type="button" variant="secondary" disabled={step === 0 || busy} onClick={() => goTo(step - 1)}>Back</Button>
          {step < 3 ? (
            <Button type="button" className="group" disabled={!canNext || busy} onClick={() => goTo(step + 1)}>
              Continue <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          ) : (
            <Button type="button" disabled={!canNext || busy} onClick={pay}>
              {busy && <Loader2 className="size-4 animate-spin" />}Pay securely
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
