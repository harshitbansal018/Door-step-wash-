import "server-only";

/** URL-safe slug from a name: lowercase letters, digits and single dashes. */
export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "item";
}

/** First of `base`, `base-2`, `base-3`… that is not already taken. */
export function uniqueSlug(name: string, taken: Iterable<string>) {
  const existing = new Set(taken);
  const base = slugify(name);
  if (!existing.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}
