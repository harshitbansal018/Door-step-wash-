import { BookingWizard } from "@/components/site/booking-wizard";
import type { VehicleType } from "@/lib/data";

export const metadata = { title: "Book a wash" };

export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <BookingWizard
          initialService={first(params.service)}
          initialVehicle={first(params.vehicle) as VehicleType | undefined}
          initialPincode={first(params.pincode)}
        />
      </div>
    </div>
  );
}
