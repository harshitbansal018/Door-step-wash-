"use client";

import { Copy, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/components/popups";

export interface PopupOffer {
  id: string;
  code: string;
  /** Applied at checkout without entering the code. */
  autoApply: boolean;
  title: string;
  headline: string;
  terms: string | null;
  validTo: string;
  forPlans: boolean;
}

const SHOW_AFTER_MS = 2500;
// Once dismissed, the same offer stays hidden for this long.
const SNOOZE_MS = 24 * 60 * 60 * 1000;
const storageKey = (id: string) => `promo-popup:${id}`;

function snoozed(id: string) {
  try {
    return Date.now() - Number(localStorage.getItem(storageKey(id)) ?? 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

export function PromoPopup({ offer }: { offer: PopupOffer }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (snoozed(offer.id)) return;
    const timer = setTimeout(() => setOpen(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [offer.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(storageKey(offer.id), String(Date.now()));
    } catch {
      // Storage blocked; the popup may show again next visit.
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(offer.code);
      toast.success("Code copied", `Use ${offer.code} at checkout.`);
    } catch {
      toast.info(`Your code: ${offer.code}`, "Enter it at checkout.");
    }
  }

  if (!open) return null;

  const validTill = new Date(offer.validTo).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return createPortal(
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
      <button type="button" className="modal-backdrop absolute inset-0 cursor-default bg-slate-950/55 backdrop-blur-[2px]" onClick={close} aria-label="Close offer" />
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="modal-panel relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/25">
        <button type="button" onClick={close} className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30" aria-label="Close offer">
          <X className="size-4" />
        </button>
        <div className="bg-gradient-to-br from-brand-600 to-brand-900 px-6 pb-6 pt-8 text-center text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
            <Sparkles className="size-3.5" /> LIMITED OFFER
          </span>
          <p className="mt-3 text-4xl font-extrabold tracking-tight">{offer.headline}</p>
          <h2 id={titleId} className="mt-1 text-brand-100">{offer.title}</h2>
        </div>
        <div className="px-6 pb-6 pt-5 text-center">
          <p className="text-sm text-slate-500">{offer.autoApply ? "Your coupon code (applied automatically at checkout)" : "Use this coupon code at checkout"}</p>
          <button type="button" onClick={copyCode} className="mt-2 inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-brand-500 bg-brand-50 px-4 py-2 font-mono text-lg font-bold text-brand-700 hover:bg-brand-100" aria-label={`Copy code ${offer.code}`}>
            {offer.code} <Copy className="size-4" />
          </button>
          <Link href={offer.forPlans ? "/plans" : "/book"} onClick={close} className="mt-5 flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            {offer.forPlans ? "See monthly plans" : "Book now"}
          </Link>
          <p className="mt-3 text-xs text-slate-500">
            Valid till {validTill}
            {offer.terms && <> · {offer.terms}</>}
          </p>
          <button type="button" onClick={close} className="mt-1 text-xs font-medium text-brand-600 hover:underline">Maybe later</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
