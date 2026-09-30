import { redirect } from "next/navigation";
import { WorkerShell } from "@/components/worker/worker-shell";
import { getSessionUser } from "@/server/session";

export const metadata = { title: "Partner app" };

export default async function WorkerLayout({ children }: LayoutProps<"/worker">) {
  // The proxy already guards /worker; this is a second check at render time.
  const user = await getSessionUser();
  if (!user || user.role !== "worker") redirect("/login?next=/worker");
  return <WorkerShell name={user.fullName || user.email}>{children}</WorkerShell>;
}
