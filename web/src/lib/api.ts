// Small typed wrapper around fetch for calling our own /api routes from the browser.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown };

export async function api<T = unknown>(path: string, { method = "GET", body }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body instanceof FormData || body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "UNKNOWN",
      err?.message ?? "Something went wrong. Please try again.",
      err?.details?.fields ?? {},
    );
  }
  return json?.data as T;
}
