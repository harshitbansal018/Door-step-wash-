"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button, Card } from "@/components/ui";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />{label}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <Card className="p-6 text-center"><AlertCircle className="mx-auto size-7 text-red-500" /><p className="mt-2 text-sm text-slate-700">{message}</p>{retry && <Button className="mt-4" variant="secondary" onClick={retry}><RefreshCw className="size-4" />Try again</Button>}</Card>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <Card className="p-10 text-center"><p className="font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{description}</p></Card>;
}
