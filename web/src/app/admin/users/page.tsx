"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { api } from "@/lib/api";
import type { Role } from "@/lib/roles";
import { Badge, Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { EmptyState, LoadingState } from "@/components/data-state";

interface UserRow { id: string; email: string; fullName: string; role: Role; isBlocked: boolean; createdAt: string }
type Users = { items: UserRow[]; total: number };
export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]); const [role, setRole] = useState(""); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [blocked, setBlocked] = useState("");
  const filterKey = `${role}|${search.trim()}|${blocked}`; const [lastFilter, setLastFilter] = useState(filterKey);
  if (lastFilter !== filterKey) { setLastFilter(filterKey); setPage(1); }
  const load = useCallback(async () => { setLoading(true); const params = new URLSearchParams({ page: String(page), pageSize: "25" }); if (role) params.set("role", role); if (blocked) params.set("blocked", blocked); if (search.trim()) params.set("search", search.trim()); try { const result = await api<Users>(`/api/admin/users?${params}`); setUsers(result.items); setTotal(result.total); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load users."); } finally { setLoading(false); } }, [role, search, blocked, page]);
  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
  async function toggle(user: UserRow) { try { await api(`/api/admin/users/${user.id}`, { method: "PATCH", body: { isBlocked: !user.isBlocked } }); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update user."); } }
  return <><PageHeader title="Users" description="Search accounts and block compromised or abusive users." />{error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}<Card className="overflow-hidden"><div className="flex gap-2 border-b p-4"><div className="relative flex-1"><Search className="absolute top-3 left-3 size-4 text-slate-400" /><Input aria-label="Search users" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></div><Select aria-label="Role" value={role} onChange={(event) => setRole(event.target.value)}><option value="">All roles</option><option value="customer">Customers</option><option value="worker">Workers</option><option value="admin">Admins</option></Select><Select aria-label="Account status" value={blocked} onChange={(event) => setBlocked(event.target.value)}><option value="">All accounts</option><option value="false">Active</option><option value="true">Blocked</option></Select></div>{loading ? <LoadingState /> : users.length ? <div className="scroll-slim overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{users.map((user) => <tr key={user.id}><td className="px-5 py-4"><strong>{user.fullName}</strong><span className="block text-xs text-slate-500">{user.email}</span></td><td className="px-5 py-4"><Badge tone="blue">{user.role}</Badge></td><td className="px-5 py-4">{new Date(user.createdAt).toLocaleDateString("en-IN")}</td><td className="px-5 py-4"><Badge tone={user.isBlocked ? "red" : "green"}>{user.isBlocked ? "Blocked" : "Active"}</Badge></td><td className="px-5 py-4 text-right"><Button size="sm" variant={user.isBlocked ? "secondary" : "danger"} onClick={() => toggle(user)}>{user.isBlocked ? "Unblock" : "Block"}</Button></td></tr>)}</tbody></table><Pagination page={page} pageSize={25} total={total} onChange={setPage} disabled={loading} className="border-t border-slate-200" /></div> : <div className="p-5"><EmptyState title="No users" description="No accounts match these filters." /></div>}</Card></>;
}
