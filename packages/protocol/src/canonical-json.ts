export const CANONICALIZATION_VERSION = 'aav-canonical-json-v1' as const;
export function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>; const ordered: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) ordered[key] = canonicalizeJson(source[key]);
    return ordered;
  }
  return value;
}
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalizeJson(value)) ?? 'null';
}
