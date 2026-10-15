"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/data-state";
import { confirmDialog, toast } from "@/components/popups";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/cms";
import { cn } from "@/lib/utils";

type Section = keyof SiteContent;
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const SECTIONS: { key: Section; label: string; description: string }[] = [
  { key: "general", label: "Brand & navigation", description: "Brand, support details, navigation and footer links." },
  { key: "home", label: "Homepage", description: "Hero, benefits, homepage FAQs and calls to action." },
  { key: "howItWorks", label: "How it works", description: "Page hero, journey stages and preparation guidance." },
  { key: "pricing", label: "Pricing page", description: "Pricing-page headings and customer promises." },
  { key: "cities", label: "Cities page", description: "Coverage page headings, guidance and benefits." },
  { key: "faq", label: "FAQ page", description: "Searchable questions, categories and final call to action." },
  { key: "policies", label: "Legal policies", description: "Terms, privacy and refund policy sections." },
];

const words = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase());
const isLong = (key: string, value: string) => /body|description|answer/i.test(key) || value.length > 100;
const blankCopy = (value: JsonValue): JsonValue => {
  if (typeof value === "string") return "";
  if (Array.isArray(value)) return value.map(blankCopy);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, blankCopy(child)]));
  return value;
};

function ContentField({ name, value, path, onChange }: { name: string; value: JsonValue; path: (string | number)[]; onChange: (path: (string | number)[], value: JsonValue) => void }) {
  if (Array.isArray(value)) {
    return <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
      <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{words(name)}</h3><p className="text-xs text-slate-500">Drag-free repeatable content; use the buttons to add or remove items.</p></div><Button size="sm" variant="secondary" onClick={() => onChange(path, [...value, blankCopy(value.at(-1) ?? "")])}><Plus className="size-4" />Add</Button></div>
      {value.map((item, index) => <Card key={index} className="relative p-4 pr-12">
        <button type="button" aria-label={`Remove ${words(name)} ${index + 1}`} disabled={value.length === 1} onClick={() => onChange(path, value.filter((_, itemIndex) => itemIndex !== index))} className="absolute top-3 right-3 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="size-4" /></button>
        <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Item {index + 1}</p>
        <ContentField name={`${name} item`} value={item} path={[...path, index]} onChange={onChange} />
      </Card>)}
    </div>;
  }
  if (value && typeof value === "object") {
    return <div className="grid gap-4 sm:grid-cols-2">{Object.entries(value).map(([key, child]) => <ContentField key={key} name={key} value={child} path={[...path, key]} onChange={onChange} />)}</div>;
  }
  if (typeof value === "boolean") {
    return <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} />{words(name)}</label>;
  }
  const text = value === null ? "" : String(value);
  return <div className={cn(isLong(name, text) && "sm:col-span-2")}><Label htmlFor={path.join("-")}>{words(name)}</Label>{isLong(name, text) ? <textarea id={path.join("-")} rows={4} value={text} onChange={(event) => onChange(path, event.target.value)} className="block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:outline-none" /> : <Input id={path.join("-")} value={text} onChange={(event) => onChange(path, event.target.value)} />}</div>;
}

export default function AdminContentPage() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [section, setSection] = useState<Section>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const setSuccess = (text: string) => text && toast.success(text);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setContent(await api<SiteContent>("/api/admin/content")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load site content."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    api<SiteContent>("/api/admin/content")
      .then((value) => { if (active) setContent(value); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load site content."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function update(path: (string | number)[], value: JsonValue) {
    if (!content) return;
    const next = structuredClone(content) as unknown as JsonValue;
    let cursor = next as { [key: string]: JsonValue } | JsonValue[];
    path.forEach((key, index) => {
      if (index === path.length - 1) cursor[key as never] = value as never;
      else cursor = cursor[key as never] as { [key: string]: JsonValue } | JsonValue[];
    });
    setContent(next as unknown as SiteContent); setSuccess("");
  }

  async function save() {
    if (!content) return;
    setSaving(true); setError(""); setSuccess("");
    try { setContent(await api<SiteContent>("/api/admin/content", { method: "PUT", body: content })); setSuccess("Site content published successfully."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not publish site content."); }
    finally { setSaving(false); }
  }

  async function resetSection() {
    if (!content || !(await confirmDialog({ title: "Reset section?", message: `Reset ${SECTIONS.find((item) => item.key === section)?.label} to its original copy?`, confirmLabel: "Reset" }))) return;
    setContent({ ...content, [section]: structuredClone(DEFAULT_SITE_CONTENT[section]) }); setSuccess("");
  }

  return <>
    <PageHeader title="Site content" description="Edit and publish the public website without changing code." action={<div className="flex gap-2"><Button variant="secondary" onClick={resetSection} disabled={!content || saving}><RotateCcw className="size-4" />Reset section</Button><Button onClick={save} disabled={!content || saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Publish changes</Button></div>} />
    {error && <div role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading ? <LoadingState /> : !content ? <ErrorState message="Site content could not be loaded." retry={load} /> : <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
      <Card className="h-fit p-2">{SECTIONS.map((item) => <button key={item.key} type="button" onClick={() => setSection(item.key)} className={cn("w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition", section === item.key ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50")}>{item.label}</button>)}</Card>
      <Card className="p-5 sm:p-7"><div className="mb-6 border-b border-slate-200 pb-5"><h2 className="text-xl font-bold text-slate-950">{SECTIONS.find((item) => item.key === section)?.label}</h2><p className="mt-1 text-sm text-slate-500">{SECTIONS.find((item) => item.key === section)?.description}</p></div><ContentField name={section} value={content[section] as unknown as JsonValue} path={[section]} onChange={update} /></Card>
    </div>}
  </>;
}
