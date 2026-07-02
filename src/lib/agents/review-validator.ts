export function asPlainText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => asPlainText(item)).filter(Boolean).join(" ").trim() || fallback;
  }
  return fallback;
}

export function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => asPlainText(item)).filter(Boolean);
  return items.length ? items : fallback;
}
