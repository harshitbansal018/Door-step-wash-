"use client";

import { AlertCircle, Loader2, RefreshCw, SearchX } from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui";

export function LoadingState({ label = "Loading…", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="page-enter space-y-4">
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin text-brand-600" />
        {label}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-7 w-32" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <Card className="page-enter p-8 text-center">
      <span className="check-pop mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100">
        <AlertCircle className="size-6" />
      </span>
      <p className="mt-4 text-sm text-slate-700">{message}</p>
      {retry && (
        <Button className="group mt-5" variant="secondary" onClick={retry}>
          <RefreshCw className="size-4 transition-transform duration-500 group-hover:rotate-180" />
          Try again
        </Button>
      )}
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="page-enter p-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <SearchX className="size-6" />
      </span>
      <p className="mt-4 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Card>
  );
}
