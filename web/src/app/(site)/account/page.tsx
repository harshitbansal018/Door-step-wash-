"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Lock, User } from "lucide-react";
import { api } from "@/lib/api";
import type { Role } from "@/lib/roles";
import { PasswordInput, PasswordRules, passwordIsValid } from "@/components/auth/fields";
import { ErrorState, LoadingState } from "@/components/data-state";
import { Badge, Button, Card, Label, PageHeader } from "@/components/ui";

interface Me { user: { id: string; email: string; fullName: string; role: Role } }
export default function AccountPage() {
  const [me, setMe] = useState<Me|null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { setMe(await api<Me>("/api/auth/me")); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load account."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function changePassword() { setSaving(true); setError(""); setSuccess(""); try { await api("/api/auth/change-password", { method: "POST", body: { password } }); setPassword(""); setConfirm(""); setSuccess("Password updated. Other signed-in devices were logged out."); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update password."); } finally { setSaving(false); } }
  if (loading) return <div className="mx-auto max-w-3xl px-4 py-10"><LoadingState /></div>; if (!me) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorState message={error} retry={load} /></div>;
  return <div className="mx-auto max-w-3xl px-4 py-10"><PageHeader title="Account" description="Profile and sign-in security." />{error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}{success && <div role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="size-4" />{success}</div>}<div className="grid gap-6 md:grid-cols-2"><Card className="p-6"><div className="flex items-center gap-3"><User className="size-6 text-brand-600" /><h2 className="font-semibold">Profile</h2></div><dl className="mt-5 divide-y text-sm"><div className="py-3"><dt className="text-slate-500">Name</dt><dd className="mt-1 font-medium">{me.user.fullName}</dd></div><div className="py-3"><dt className="text-slate-500">Email</dt><dd className="mt-1 font-medium">{me.user.email}</dd></div><div className="py-3"><dt className="text-slate-500">Role</dt><dd className="mt-1"><Badge tone="blue">{me.user.role}</Badge></dd></div></dl></Card><Card className="p-6"><div className="flex items-center gap-3"><Lock className="size-6 text-brand-600" /><h2 className="font-semibold">Change password</h2></div><div className="mt-5 space-y-4"><div><Label htmlFor="new-password">New password</Label><PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><PasswordRules password={password} /></div><div><Label htmlFor="confirm-password">Confirm password</Label><PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />{confirm && confirm !== password && <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>}</div><Button className="w-full" disabled={saving || !passwordIsValid(password) || password !== confirm} onClick={changePassword}>{saving && <Loader2 className="size-4 animate-spin" />}Update password</Button></div></Card></div></div>;
}
