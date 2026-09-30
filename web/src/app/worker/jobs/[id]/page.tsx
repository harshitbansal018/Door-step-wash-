import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { JobDetail } from "@/components/worker/job-detail";
import { SERVICES } from "@/lib/data";
import { COMMISSION_RATE, findWorkerJob } from "@/lib/worker-demo";

export default async function WorkerJobPage({ params }: PageProps<"/worker/jobs/[id]">) {
  const { id } = await params;
  const job = findWorkerJob(id);
  if (!job) notFound();
  const service = SERVICES.find((s) => s.id === job.serviceId)!;

  return (
    <div>
      <Link href="/worker" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ChevronLeft className="size-4" /> All jobs
      </Link>
      <JobDetail job={job} service={service} earning={Math.round(job.amount * COMMISSION_RATE)} />
    </div>
  );
}
