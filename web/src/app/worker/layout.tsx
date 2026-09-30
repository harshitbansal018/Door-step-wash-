import { WorkerShell } from "@/components/worker/worker-shell";
import { DEMO_WORKER } from "@/lib/worker-demo";

export const metadata = { title: "Partner app" };

export default function WorkerLayout({ children }: LayoutProps<"/worker">) {
  return <WorkerShell name={DEMO_WORKER.name}>{children}</WorkerShell>;
}
