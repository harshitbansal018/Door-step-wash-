import { Calendar, Car, Clock, MapPin, Plus, Star } from "lucide-react";
import { Avatar, Button, Card, StatusBadge } from "@/components/ui";
import { BOOKINGS, cityName, serviceName, workerById } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata = { title: "My bookings" };

// Until auth exists, show one demo customer's bookings.
const DEMO_CUSTOMER = "Aarav Mehta";

export default function MyBookingsPage() {
  const mine = BOOKINGS.filter((b) => b.customer === DEMO_CUSTOMER);
  const upcoming = mine.filter((b) => !["completed", "cancelled"].includes(b.status));
  const past = mine.filter((b) => ["completed", "cancelled"].includes(b.status));

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">My bookings</h1>
            <p className="mt-1 text-slate-500">Track upcoming washes and view your history.</p>
          </div>
          <Button href="/book">
            <Plus className="size-4" /> New booking
          </Button>
        </div>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-500">Upcoming</h2>
        <div className="mt-4 space-y-4">
          {upcoming.map((b) => {
            const worker = workerById(b.workerId);
            return (
              <Card key={b.id} className="overflow-hidden">
                <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">{serviceName(b.serviceId)}</h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p className="flex items-center gap-2">
                        <Calendar className="size-4 text-slate-400" /> {formatDate(b.date)}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="size-4 text-slate-400" /> {b.slot}
                      </p>
                      <p className="flex items-center gap-2">
                        <Car className="size-4 text-slate-400" /> {b.vehicle} · {b.plate}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="size-4 text-slate-400" /> {b.area}, {cityName(b.cityId)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-500">{b.id}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(b.amount)}</p>
                  </div>
                </div>
                {worker && (
                  <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={worker.name} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{worker.name}</p>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <Star className="size-3 fill-amber-400 text-amber-400" /> {worker.rating} · Your washer
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm">
                        Reschedule
                      </Button>
                      <Button size="sm">Track live</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-slate-500">Past</h2>
        <Card className="mt-4 divide-y divide-slate-100">
          {past.map((b) => (
            <div key={b.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {serviceName(b.serviceId)} <span className="font-normal text-slate-500">· {b.vehicle}</span>
                </p>
                <p className="text-sm text-slate-500">
                  {formatDate(b.date)} · {b.slot}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={b.status} />
                <span className="w-16 text-right font-semibold text-slate-900">{formatMoney(b.amount)}</span>
                <Button variant="secondary" size="sm" href={`/book?service=${b.serviceId}&vehicle=${b.vehicleType}`}>
                  Book again
                </Button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
