import { PlanWizard } from "@/components/site/plan-wizard";
import type { VehicleType } from "@/lib/domain";

export const metadata = { title: "Start a monthly plan" };

export default async function StartPlanPage({ searchParams }: PageProps<"/plans/start">) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <PlanWizard
          initialPlan={first(params.plan)}
          initialVehicle={first(params.vehicle) as VehicleType | undefined}
          initialPincode={first(params.pincode)}
        />
      </div>
    </div>
  );
}
