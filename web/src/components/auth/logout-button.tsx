"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export function LogoutButton({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={className}>
      {children}
    </button>
  );
}
