export type QueryParameter = string | number | boolean | null | undefined;
export type QueryParameters = Readonly<Record<string, QueryParameter>>;

export function buildQueryString(parameters: QueryParameters): string {
  const query = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    query.set(key, String(value));
  });
  return query.toString();
}

export function appendQuery(path: string, parameters: QueryParameters): string {
  const query = buildQueryString(parameters);
  if (!query) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}
