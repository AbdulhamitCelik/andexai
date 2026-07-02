import crypto from "crypto";
import type { DriftAlert } from "@/lib/types";

export function driftFingerprint(
  alert: Pick<DriftAlert, "projectId" | "source" | "description">
): string {
  return `${alert.projectId ?? ""}|${alert.source}|${alert.description}`;
}

export function stableDriftId(
  alert: Pick<DriftAlert, "projectId" | "source" | "description">
): string {
  return crypto.createHash("sha256").update(driftFingerprint(alert)).digest("hex").slice(0, 32);
}

/** Keep the latest alert per fingerprint. */
export function dedupeDriftAlerts(alerts: DriftAlert[]): DriftAlert[] {
  const byFp = new Map<string, DriftAlert>();
  for (const alert of alerts) {
    const fp = driftFingerprint(alert);
    const existing = byFp.get(fp);
    if (!existing || alert.detectedAt >= existing.detectedAt) {
      byFp.set(fp, alert);
    }
  }
  return [...byFp.values()].sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  );
}
