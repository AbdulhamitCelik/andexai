/** Coerce unknown values to plain text — prevents toLowerCase crashes on arrays/objects. */
export function asPlainText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => asPlainText(item)).filter(Boolean).join(" ").trim() || fallback;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.title === "string") return obj.title;
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function plainTextLower(value: unknown): string {
  return asPlainText(value).toLowerCase();
}

export function slugifyText(value: unknown, maxLen = 28): string {
  return plainTextLower(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen) || "item";
}
