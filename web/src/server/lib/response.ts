const NO_STORE = { "Cache-Control": "private, no-store" };

export const ok = <T>(data: T, status = 200) => Response.json({ data }, { status, headers: NO_STORE });
export const created = <T>(data: T) => ok(data, 201);
export const noContent = () => new Response(null, { status: 204, headers: NO_STORE });
export const fail = (status: number, code: string, message: string, details?: unknown) =>
  Response.json({ error: { code, message, ...(details ? { details } : {}) } }, { status, headers: NO_STORE });
