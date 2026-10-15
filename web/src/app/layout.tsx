import type { Metadata } from "next";
import { Popups } from "@/components/popups";
import { siteContentService } from "@/server/services/site-content.service";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { general, home } = await siteContentService.get();
  return { title: { default: `${general.brandName} — ${general.tagline}`, template: `%s | ${general.brandName}` }, description: home.seoDescription };
}

/**
 * Marks the document as motion-capable before first paint. Scroll-reveal
 * elements start hidden only when this attribute is present, so users with
 * reduced-motion preferences (or without JavaScript) see content immediately.
 */
const motionGate = `try{if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.setAttribute("data-motion","")}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionGate }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Popups />
      </body>
    </html>
  );
}
