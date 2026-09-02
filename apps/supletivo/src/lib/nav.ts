/** Build a path with a query string, omitting empty/nullish params. */
export function withParams(
  path: string,
  params: Record<string, string | number | null | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      qs.set(key, String(value));
    }
  }
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}
