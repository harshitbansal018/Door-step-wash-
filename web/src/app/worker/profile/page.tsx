import { BadgeCheck, ChevronRight, FileText, Landmark, LogOut, MapPin, Star } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar, Badge, Card } from "@/components/ui";
import { cityName } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { DEMO_WORKER } from "@/lib/worker-demo";

export default function WorkerProfilePage() {
  const w = DEMO_WORKER;
  return (
    <div className="space-y-6">
      <Card className="p-5 text-center">
        <Avatar name={w.name} className="mx-auto size-16 text-lg" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">{w.name}</h1>
        <p className="text-sm text-slate-500">+91 {w.phone}</p>
        <div className="mt-3 flex justify-center gap-2">
          <Badge tone="green">
            <BadgeCheck className="size-3.5" /> Verified
          </Badge>
          <Badge tone="amber">
            <Star className="size-3.5 fill-current" /> {w.rating}
          </Badge>
        </div>
        <dl className="mt-5 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Washes</dt>
            <dd className="font-semibold text-slate-900">{w.jobsDone}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Rating</dt>
            <dd className="font-semibold text-slate-900">{w.rating}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Since</dt>
            <dd className="font-semibold text-slate-900">{formatDate(w.joined).replace(/^\d+ /, "")}</dd>
          </div>
        </dl>
      </Card>

      <Card className="divide-y divide-slate-100">
        {[
          { icon: MapPin, label: "Service area", value: `${w.area}, ${cityName(w.cityId)}` },
          { icon: Landmark, label: "Bank account", value: "HDFC •••• 4821" },
          { icon: FileText, label: "Documents", value: "Aadhaar, PAN, police verification" },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3 p-4">
            <row.icon className="size-5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">{row.label}</p>
              <p className="text-xs text-slate-500">{row.value}</p>
            </div>
            <ChevronRight className="size-4 text-slate-400" />
          </div>
        ))}
      </Card>

      <LogoutButton className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-red-600 ring-1 ring-slate-200 hover:bg-red-50">
        <LogOut className="size-4" /> Log out
      </LogoutButton>
    </div>
  );
}
