import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { getSessionUser } from "@/server/session";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  return (
    <>
      <Navbar user={user ? { name: user.fullName || user.email, role: user.role } : null} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
