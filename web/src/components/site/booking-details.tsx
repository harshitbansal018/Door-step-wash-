/* eslint-disable @next/next/no-img-element -- wash photos use short-lived signed URLs */

import { CalendarDays, Car, CreditCard, MapPin, UserRound } from "lucide-react";
import type { BookingDetails } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/utils";
import { Avatar, Badge, StatusBadge } from "@/components/ui";

const titleCase = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function Row({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className={strong ? "text-right font-semibold text-slate-900" : "text-right text-slate-700"}>{value}</dd></div>;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{icon}</span>{title}</h3><dl className="mt-3 space-y-2 text-sm">{children}</dl></section>;
}

export function CustomerBookingDetails({ booking }: { booking: BookingDetails }) {
  const address = [booking.address.line, booking.address.landmark, booking.area, booking.city, booking.address.pincode].filter(Boolean).join(", ");
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-slate-950 p-5 text-white">
      <div><div className="flex flex-wrap items-center gap-2"><strong className="text-lg">{booking.code}</strong><StatusBadge status={booking.status} />{booking.subscriptionId && <Badge tone="violet">Plan visit</Badge>}</div><p className="mt-1 text-sm text-slate-300">Booked {new Date(booking.createdAt).toLocaleString("en-IN")}</p></div>
      <strong className="text-xl">{booking.subscriptionId ? "Prepaid" : formatMoney(booking.price.total)}</strong>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <Section title="Wash schedule" icon={<CalendarDays className="size-4" />}><Row label="Service" value={booking.service.name} strong /><Row label="Date" value={formatDate(booking.slot.date)} /><Row label="Time" value={`${booking.slot.start} – ${booking.slot.end}`} /></Section>
      <Section title="Vehicle" icon={<Car className="size-4" />}><Row label="Model" value={booking.vehicle.makeModel} strong /><Row label="Type" value={titleCase(booking.vehicle.type)} /><Row label="Registration" value={booking.vehicle.plate} /></Section>
      <Section title="Address & access" icon={<MapPin className="size-4" />}><div className="leading-6 text-slate-700">{address}</div><Row label="Parking" value={titleCase(booking.address.parkingType)} />{booking.address.parkingSpot && <Row label="Parking spot" value={booking.address.parkingSpot} />}<Row label="Car access" value={titleCase(booking.address.carAccess)} /></Section>
      <Section title="Payment" icon={<CreditCard className="size-4" />}><Row label="Service price" value={formatMoney(booking.price.base)} /><Row label="Area charge" value={formatMoney(booking.price.areaCharge)} /><Row label="Discount" value={booking.price.discount ? `−${formatMoney(booking.price.discount)}` : formatMoney(0)} /><div className="border-t border-slate-200 pt-2"><Row label="Total" value={formatMoney(booking.price.total)} strong /></div><Row label="Status" value={booking.payment ? titleCase(booking.payment.status) : booking.subscriptionId ? "Included in plan" : "No payment record"} />{booking.payment?.method && <Row label="Method" value={titleCase(booking.payment.method)} />}</Section>
    </div>

    <Section title="Service partner" icon={<UserRound className="size-4" />}>
      {booking.worker ? <div className="flex items-center gap-3"><Avatar name={booking.worker.name} /><div><p className="font-semibold text-slate-900">{booking.worker.name}</p><p className="text-xs text-slate-500">Rating {booking.worker.rating || "New"}{booking.worker.phone ? ` · ${booking.worker.phone}` : ""}</p></div></div> : <p className="text-slate-500">A service partner will be assigned before your wash.</p>}
    </Section>

    {(booking.notes || booking.cancelledReason) && <div className="grid gap-3 sm:grid-cols-2">{booking.notes && <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold text-slate-900">Your instructions</p><p className="mt-1 leading-6 text-slate-600">{booking.notes}</p></div>}{booking.cancelledReason && <div className="rounded-xl bg-red-50 p-4 text-sm"><p className="font-semibold text-red-800">Cancellation reason</p><p className="mt-1 leading-6 text-red-700">{booking.cancelledReason}</p></div>}</div>}

    <section><h3 className="text-sm font-semibold text-slate-900">Booking progress</h3><ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{booking.timeline.map((item, index) => <li key={`${item.status}-${item.at}-${index}`} className="flex gap-3 rounded-xl border border-slate-200 p-3"><span className="mt-1 size-2 shrink-0 rounded-full bg-brand-600" /><div><p className="text-sm font-medium text-slate-800">{titleCase(item.status)}</p><p className="text-xs text-slate-500">{new Date(item.at).toLocaleString("en-IN")}</p></div></li>)}{!booking.timeline.length && <li className="text-sm text-slate-500">Your booking updates will appear here.</li>}</ol></section>

    {!!booking.photos.length && <section><h3 className="text-sm font-semibold text-slate-900">Before & after photos</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{booking.photos.map((photo, index) => photo.url && <a key={`${photo.kind}-${index}`} href={photo.url} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-xl bg-slate-100"><img src={photo.url} alt={`${titleCase(photo.kind)} wash`} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105" /><span className="absolute inset-x-2 bottom-2 rounded-md bg-slate-950/75 px-2 py-1 text-center text-xs font-medium text-white">{titleCase(photo.kind)}</span></a>)}</div></section>}
  </div>;
}
