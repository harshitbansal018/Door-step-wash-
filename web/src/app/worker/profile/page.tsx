"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, Loader2, Star, Upload, User } from "lucide-react";
import { api } from "@/lib/api";
import type { WorkerMe } from "@/lib/domain";
import { ErrorState, LoadingState } from "@/components/data-state";
import { Badge, Button, Card, Input, Label, PageHeader } from "@/components/ui";

export default function WorkerProfilePage() {
  const [data, setData] = useState<WorkerMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<WorkerMe>("/api/worker/me"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let current = true;
    void api<WorkerMe>("/api/worker/me")
      .then((profile) => { if (current) setData(profile); })
      .catch((caught) => { if (current) setError(caught instanceof Error ? caught.message : "Could not load profile."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  async function uploadKyc() {
    if (!file) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      await api("/api/worker/kyc", { method: "POST", body });
      setFile(null);
      setMessage("KYC document uploaded. An administrator can now review it.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload the KYC document.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!data) return <ErrorState message={error} retry={load} />;

  const kycText = data.status === "active"
    ? "Verified"
    : data.hasKycDocument
      ? "Submitted for review"
      : "Not submitted";

  return (
    <>
      <PageHeader title="Partner profile" description="Manage your service account and verification document." />
      {error && <div role="alert" className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="size-4" />{message}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700"><User className="size-7" /></span>
            <div><h2 className="text-lg font-semibold">{data.name}</h2><p className="text-sm text-slate-500">{data.email}</p></div>
            <Badge className="ml-auto" tone={data.status === "active" ? "green" : data.status === "suspended" ? "red" : "amber"}>{data.status.replaceAll("_", " ")}</Badge>
          </div>
          <dl className="mt-6 divide-y text-sm">
            {[
              ["Service area", `${data.area ?? "Not assigned"}, ${data.city ?? ""}`],
              ["Rating", data.rating ? `${data.rating} / 5` : "No ratings yet"],
              ["Completed jobs", String(data.jobsDone)],
              ["Bank account", data.bankLast4 ? `•••• ${data.bankLast4}` : "Ask an administrator to add bank details"],
              ["Availability", data.isOnline ? "Online" : "Offline"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium">{label === "Rating" && data.rating ? <span className="flex items-center gap-1"><Star className="size-4 fill-amber-400 text-amber-400" />{value}</span> : value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><FileCheck2 className="size-5" /></span>
            <div>
              <h2 className="font-semibold text-slate-900">KYC document</h2>
              <p className="mt-1 text-sm text-slate-500">Status: <span className="font-medium text-slate-700">{kycText}</span></p>
            </div>
          </div>
          <div className="mt-6">
            <Label htmlFor="worker-kyc">Upload a PDF, JPG, PNG or WebP file</Label>
            <Input id="worker-kyc" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <p className="mt-2 text-xs text-slate-500">Maximum file size: 5 MB. Uploading another document replaces the previous one.</p>
            <Button className="mt-4" disabled={!file || uploading} onClick={uploadKyc}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {data.hasKycDocument ? "Replace document" : "Upload document"}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
