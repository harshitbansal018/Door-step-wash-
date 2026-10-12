import type { ReactNode } from "react";

/** Remounts on every navigation so each page fades and lifts into view. */
export default function SiteTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
