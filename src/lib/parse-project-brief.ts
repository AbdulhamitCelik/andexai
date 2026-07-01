export interface ParsedProjectBrief {
  name?: string;
  vision?: string;
  goals?: string[];
  functionalRequirements?: string[];
  nonFunctionalRequirements?: string[];
}

function linesUnderSection(text: string, headers: string[]): string[] {
  const lower = text.toLowerCase();
  for (const header of headers) {
    const idx = lower.indexOf(header.toLowerCase());
    if (idx === -1) continue;
    const after = text.slice(idx + header.length).replace(/^[\s:#-]+/, "");
    const nextHeader = after.search(/\n#{1,3}\s|\n[A-Z][a-z]+ Requirements|\nFunctional|\nNon-Functional/i);
    const block = nextHeader > 0 ? after.slice(0, nextHeader) : after;
    return block
      .split("\n")
      .map((l) => l.replace(/^[-*•\d.)]+\s*/, "").trim())
      .filter((l) => l.length > 2 && !l.startsWith("#"));
  }
  return [];
}

function firstParagraph(text: string): string {
  return text.split(/\n\n+/)[0]?.trim() ?? text.trim();
}

export function parseProjectBrief(raw: string): ParsedProjectBrief {
  const text = raw.trim();
  if (!text) return {};

  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    return {
      name: String(json.name ?? json.projectName ?? json.title ?? ""),
      vision: String(json.vision ?? json.brief ?? json.description ?? ""),
      goals: Array.isArray(json.goals) ? json.goals.map(String) : undefined,
      functionalRequirements: Array.isArray(json.functionalRequirements)
        ? json.functionalRequirements.map(String)
        : Array.isArray(json.functional)
          ? json.functional.map(String)
          : undefined,
      nonFunctionalRequirements: Array.isArray(json.nonFunctionalRequirements)
        ? json.nonFunctionalRequirements.map(String)
        : Array.isArray(json.nonFunctional)
          ? json.nonFunctional.map(String)
          : undefined,
    };
  } catch {
    // plain text / markdown
  }

  const name =
    linesUnderSection(text, ["project name", "name:", "title:", "# "])[0] ||
    text.split("\n")[0]?.replace(/^#+\s*/, "").trim();

  const visionBlock = linesUnderSection(text, ["vision", "brief", "overview", "description"]).join(" ");
  const vision = visionBlock || firstParagraph(text);

  const goals = linesUnderSection(text, ["goals", "objectives", "## goals"]);
  const functionalRequirements = linesUnderSection(text, [
    "functional requirements",
    "functional reqs",
    "## functional",
    "fr:",
  ]);
  const nonFunctionalRequirements = linesUnderSection(text, [
    "non-functional requirements",
    "non functional requirements",
    "non-functional reqs",
    "## non-functional",
    "nfr:",
  ]);

  // Bullet lines tagged FR- / NFR-
  const frTagged = text.match(/^FR[-\d]*:\s*.+$/gim)?.map((l) => l.replace(/^FR[-\d]*:\s*/i, "").trim()) ?? [];
  const nfrTagged = text.match(/^NFR[-\d]*:\s*.+$/gim)?.map((l) => l.replace(/^NFR[-\d]*:\s*/i, "").trim()) ?? [];

  return {
    name: name && name.length < 120 ? name : undefined,
    vision: vision.length > 20 ? vision : undefined,
    goals: goals.length ? goals : undefined,
    functionalRequirements: [...functionalRequirements, ...frTagged].filter(Boolean).length
      ? [...new Set([...functionalRequirements, ...frTagged])]
      : undefined,
    nonFunctionalRequirements: [...nonFunctionalRequirements, ...nfrTagged].filter(Boolean).length
      ? [...new Set([...nonFunctionalRequirements, ...nfrTagged])]
      : undefined,
  };
}
