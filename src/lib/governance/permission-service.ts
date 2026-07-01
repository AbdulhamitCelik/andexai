import type {
  AccessDecision,
  GovernedMemoryRecord,
  MemoryRole,
  MemoryVisibility,
  PermissionAction,
  PermissionAuditLog,
  PermissionMetadata,
  TeamMember,
} from "@/lib/types";

const VISIBILITY_RANK: Record<MemoryVisibility, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  leadership: 3,
};

function mostRestrictive(a: MemoryVisibility, b: MemoryVisibility): MemoryVisibility {
  return VISIBILITY_RANK[a] >= VISIBILITY_RANK[b] ? a : b;
}

function isUnlocked(permissions: PermissionMetadata, now = Date.now()): boolean {
  if (!permissions.unlockAt) return true;
  return new Date(permissions.unlockAt).getTime() <= now;
}

/** Resolve effective permissions via lineage — derived inherits source restrictions */
export function resolveEffectivePermissions(
  record: GovernedMemoryRecord,
  registry: Map<string, GovernedMemoryRecord>
): PermissionMetadata {
  const effective = { ...record.permissions };
  const visited = new Set<string>();

  const walk = (r: GovernedMemoryRecord) => {
    if (visited.has(r.id)) return;
    visited.add(r.id);

    if (r.lineage.parentResourceId) {
      const parent = [...registry.values()].find(
        (x) => x.resourceId === r.lineage.parentResourceId && x.resourceType === r.lineage.parentResourceType
      );
      if (parent) {
        walk(parent);
        const parentEffective = resolveEffectivePermissions(parent, registry);
        effective.visibility = mostRestrictive(effective.visibility, parentEffective.visibility);
        effective.allowedRoles = effective.allowedRoles.filter((role) =>
          parentEffective.allowedRoles.includes(role)
        );
        if (parentEffective.unlockAt) {
          effective.unlockAt = effective.unlockAt
            ? new Date(
                Math.max(new Date(effective.unlockAt).getTime(), new Date(parentEffective.unlockAt).getTime())
              ).toISOString()
            : parentEffective.unlockAt;
        }
      }
    }
  };

  walk(record);
  return effective;
}

function roleCanReadVisibility(role: MemoryRole, visibility: MemoryVisibility, unlocked: boolean): boolean {
  if (role === "manager") return true;

  if (role === "developer") {
    if (visibility === "public" || visibility === "internal") return true;
    if (visibility === "leadership" && unlocked) return true;
    if (visibility === "confidential" && unlocked) return true;
    return false;
  }

  // intern — public only
  return visibility === "public";
}

export interface CanAccessResult {
  granted: boolean;
  reason: string;
  effectiveVisibility: MemoryVisibility;
}

/** Deterministic access check — NO AI involvement */
export function canAccess(
  user: TeamMember,
  record: GovernedMemoryRecord,
  action: PermissionAction,
  registry: Map<string, GovernedMemoryRecord>
): CanAccessResult {
  const effective = resolveEffectivePermissions(record, registry);
  const unlocked = isUnlocked(effective);

  if (effective.allowedUserIds?.includes(user.id)) {
    return { granted: true, reason: "Explicit user allow-list", effectiveVisibility: effective.visibility };
  }

  if (!effective.allowedRoles.includes(user.memoryRole)) {
    return {
      granted: false,
      reason: `Role '${user.memoryRole}' not in allowed roles [${effective.allowedRoles.join(", ")}]`,
      effectiveVisibility: effective.visibility,
    };
  }

  if (!unlocked && effective.visibility !== "public") {
    const unlockLabel = effective.unlockAt
      ? ` until ${new Date(effective.unlockAt).toLocaleDateString()}`
      : "";
    return {
      granted: false,
      reason: `Temporal lock${unlockLabel} — ${effective.visibility} content not yet unlocked`,
      effectiveVisibility: effective.visibility,
    };
  }

  if (action === "read" || action === "query") {
    const ok = roleCanReadVisibility(user.memoryRole, effective.visibility, unlocked);
    return {
      granted: ok,
      reason: ok
        ? `Read allowed for ${user.memoryRole} on ${effective.visibility}`
        : `Access denied — ${effective.visibility} exceeds ${user.memoryRole} clearance`,
      effectiveVisibility: effective.visibility,
    };
  }

  if (action === "write" || action === "promote") {
    if (user.memoryRole === "manager") {
      return { granted: true, reason: "Manager write access", effectiveVisibility: effective.visibility };
    }
    if (user.memoryRole === "developer" && effective.visibility !== "leadership") {
      return { granted: true, reason: "Developer write on non-leadership resource", effectiveVisibility: effective.visibility };
    }
    return {
      granted: false,
      reason: `${user.memoryRole} cannot ${action} ${effective.visibility} resources`,
      effectiveVisibility: effective.visibility,
    };
  }

  return { granted: false, reason: "Unknown action", effectiveVisibility: effective.visibility };
}

export function filterAccessibleMemory(
  user: TeamMember,
  records: GovernedMemoryRecord[],
  action: PermissionAction = "read"
): { accessible: GovernedMemoryRecord[]; decisions: AccessDecision[] } {
  const registry = new Map(records.map((r) => [r.id, r]));
  const accessible: GovernedMemoryRecord[] = [];
  const decisions: AccessDecision[] = [];

  for (const record of records) {
    const result = canAccess(user, record, action, registry);
    decisions.push({
      resourceId: record.resourceId,
      resourceType: record.resourceType,
      title: record.title,
      granted: result.granted,
      reason: result.reason,
      effectiveVisibility: result.effectiveVisibility,
    });
    if (result.granted) accessible.push(record);
  }

  return { accessible, decisions };
}

export function assertAccess(
  user: TeamMember,
  record: GovernedMemoryRecord,
  action: PermissionAction,
  registry: Map<string, GovernedMemoryRecord>
): void {
  const result = canAccess(user, record, action, registry);
  if (!result.granted) {
    const err = new Error("Access Denied");
    (err as Error & { code: string; reason: string }).code = "ACCESS_DENIED";
    (err as Error & { reason: string }).reason = result.reason;
    throw err;
  }
}

export function buildAuditLog(
  user: TeamMember,
  record: GovernedMemoryRecord,
  action: PermissionAction,
  result: CanAccessResult
): Omit<PermissionAuditLog, "id" | "timestamp"> {
  return {
    userId: user.id,
    userName: user.name,
    memoryRole: user.memoryRole,
    resourceId: record.resourceId,
    resourceType: record.resourceType,
    resourceTitle: record.title,
    action,
    granted: result.granted,
    reason: result.reason,
    organisationId: record.permissions.organisationId,
    projectId: record.permissions.projectId,
  };
}
