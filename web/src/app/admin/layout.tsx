import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getSessionUser } from "@/server/session";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // The proxy already guards /admin; this is a second check at render time.
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/login?next=/admin");
  return <AdminShell user={{ name: user.fullName || user.email, email: user.email }}>{children}</AdminShell>;
}
