import { ScrollProgress, ScrollToTop } from "@/components/motion";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { getSessionUser } from "@/server/session";
import { siteContentService } from "@/server/services/site-content.service";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [user, content] = await Promise.all([getSessionUser(), siteContentService.get()]);
  return (
    <>
      <ScrollProgress />
      <Navbar user={user ? { name: user.fullName || user.email, role: user.role } : null} content={content.general} />
      <main className="flex-1">{children}</main>
      <Footer content={content.general} />
      <ScrollToTop />
    </>
  );
}
