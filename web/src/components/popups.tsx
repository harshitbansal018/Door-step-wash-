"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/*
 * App-wide popups: toast alerts and a styled confirm dialog.
 * Call `toast.success(...)` or `await confirmDialog(...)` from any client
 * component; <Popups /> in the root layout renders them.
 */

type ToastKind = "success" | "error" | "info" | "warning";
interface ToastItem { id: number; kind: ToastKind; title: string; message?: string }
interface ConfirmOptions { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
interface ConfirmItem extends ConfirmOptions { resolve: (ok: boolean) => void }

const TOAST_MS = 4000;
let nextId = 1;
let pushToast: ((toast: ToastItem) => void) | null = null;
let openConfirm: ((item: ConfirmItem) => void) | null = null;

function show(kind: ToastKind, title: string, message?: string) {
  pushToast?.({ id: nextId++, kind, title, message });
}

export const toast = {
  success: (title: string, message?: string) => show("success", title, message),
  error: (title: string, message?: string) => show("error", title, message),
  info: (title: string, message?: string) => show("info", title, message),
  warning: (title: string, message?: string) => show("warning", title, message),
};

/** Styled replacement for window.confirm(). Resolves true when confirmed. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (!openConfirm) return Promise.resolve(window.confirm(options.message ?? options.title));
  return new Promise((resolve) => openConfirm?.({ ...options, resolve }));
}

const toastStyle: Record<ToastKind, { icon: typeof Info; accent: string; bar: string }> = {
  success: { icon: CheckCircle2, accent: "border-l-emerald-500 text-emerald-600", bar: "bg-emerald-500" },
  error: { icon: XCircle, accent: "border-l-red-500 text-red-600", bar: "bg-red-500" },
  info: { icon: Info, accent: "border-l-brand-600 text-brand-600", bar: "bg-brand-600" },
  warning: { icon: AlertTriangle, accent: "border-l-amber-500 text-amber-600", bar: "bg-amber-500" },
};

export function Popups() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmItem | null>(null);

  useEffect(() => {
    pushToast = (item) => {
      setToasts((list) => [...list.slice(-3), item]);
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== item.id)), TOAST_MS);
    };
    openConfirm = setConfirm;
    return () => {
      pushToast = null;
      openConfirm = null;
    };
  }, []);

  // Nothing to show also keeps the server and first client render identical.
  if (!toasts.length && !confirm) return null;

  const dismiss = (id: number) => setToasts((list) => list.filter((t) => t.id !== id));
  const settle = (ok: boolean) => {
    confirm?.resolve(ok);
    setConfirm(null);
  };

  return createPortal(
    <>
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[120] flex flex-col items-end gap-2.5 sm:left-auto sm:right-5 sm:top-5" aria-live="polite">
        {toasts.map((item) => {
          const style = toastStyle[item.kind];
          const Icon = style.icon;
          return (
            <div key={item.id} role={item.kind === "error" ? "alert" : "status"} className={cn("toast-in pointer-events-auto relative flex w-full max-w-sm gap-3 overflow-hidden rounded-xl border border-l-4 border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10", style.accent)}>
              <Icon className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1 text-slate-900">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.message && <p className="mt-0.5 text-sm text-slate-500">{item.message}</p>}
              </div>
              <button type="button" onClick={() => dismiss(item.id)} className="-mr-1 self-start rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Dismiss">
                <X className="size-4" />
              </button>
              <span className={cn("toast-bar absolute bottom-0 left-0 h-[3px] opacity-40", style.bar)} style={{ animationDuration: `${TOAST_MS}ms` }} />
            </div>
          );
        })}
      </div>
      {confirm && <ConfirmPanel item={confirm} onSettle={settle} />}
    </>,
    document.body,
  );
}

function ConfirmPanel({ item, onSettle }: { item: ConfirmItem; onSettle: (ok: boolean) => void }) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = item.danger ?? true;

  useEffect(() => {
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onSettle(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSettle]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button type="button" className="modal-backdrop absolute inset-0 cursor-default bg-slate-950/55 backdrop-blur-[2px]" onClick={() => onSettle(false)} aria-label="Cancel" />
      <section role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="modal-panel relative w-full max-w-md rounded-2xl bg-white shadow-2xl shadow-slate-950/25 ring-1 ring-slate-900/10">
        <div className="flex gap-4 px-6 pb-2 pt-6">
          <div className={cn("grid size-11 shrink-0 place-items-center rounded-full", danger ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-600")}>
            {danger ? <AlertTriangle className="size-5" /> : <Info className="size-5" />}
          </div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900">{item.title}</h2>
            {item.message && <p className="mt-1.5 text-sm leading-6 text-slate-500">{item.message}</p>}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 px-6 pb-6 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onSettle(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {item.cancelLabel ?? "Cancel"}
          </button>
          <button ref={confirmRef} type="button" onClick={() => onSettle(true)} className={cn("rounded-lg px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2", danger ? "bg-red-600 hover:bg-red-700 focus-visible:outline-red-600" : "bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-600")}>
            {item.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}
