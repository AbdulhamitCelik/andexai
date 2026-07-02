export interface ParsedProjectBrief {
  name?: string;
  vision?: string;
  goals?: string[];
  functionalRequirements?: string[];
  nonFunctionalRequirements?: string[];
}

/** Normalise a heading title for comparison: lowercase, punctuation → spaces. */
function normalTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Markdown-aware section extraction: find a heading whose title matches one of
 * `names` and return its body up to the next heading of the same or shallower
 * depth. Returns null when no such heading exists (caller falls back to loose
 * text matching for plain-text briefs).
 */
function sectionByHeading(text: string, names: string[]): string | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) continue;
    const title = normalTitle(m[2]);
    if (!names.some((n) => title === n || title.startsWith(`${n} `))) continue;
    const depth = m[1].length;
    const body: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const h = lines[j].match(/^(#{1,6})\s+/);
      if (h && h[1].length <= depth) break;
      body.push(lines[j]);
    }
    return body.join("\n").trim();
  }
  return null;
}

/** Strip list markers and markdown emphasis from a line. */
function cleanLine(line: string): string {
  return line
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/\*\*/g, "")
    .replace(/(^|\s)\*([^*]+)\*/g, "$1$2")
    .trim();
}

/**
 * Extract requirement statements from a section. Prefers SRS-style
 * "### FR-001 · Title" sub-headings (using the `**Description:**` bullet as the
 * statement when present); otherwise falls back to bullet/numbered lines.
 */
function requirementItems(section: string): string[] {
  const lines = section.split("\n");
  const items: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#{2,6}\s*(N?FR)[-_ ]?(\d+)\s*[·:—–-]\s*(.+?)\s*$/i);
    if (!m) continue;
    let statement = m[3];
    for (let j = i + 1; j < lines.length && !/^#{1,6}\s/.test(lines[j]); j++) {
      const d = lines[j].match(/^\s*[-*]\s*\*\*Description:?\*\*\s*(.+)$/i);
      if (d) {
        statement = d[1].trim();
        break;
      }
    }
    items.push(`${m[1].toUpperCase()}-${m[2]}: ${statement}`);
  }
  if (items.length) return items;

  return lines
    .map(cleanLine)
    .filter((l) => l.length > 2 && !l.startsWith("#"));
}

/**
 * Loose plain-text section search (legacy briefs like "Goals:\n- a\n- b").
 * Skips matches embedded in "non-functional" when looking for "functional".
 */
function linesUnderSection(text: string, headers: string[]): string[] {
  const lower = text.toLowerCase();
  for (const header of headers) {
    const h = header.toLowerCase();
    let idx = lower.indexOf(h);
    while (idx !== -1 && /non[- ]?$/.test(lower.slice(Math.max(0, idx - 4), idx))) {
      idx = lower.indexOf(h, idx + 1);
    }
    if (idx === -1) continue;
    const after = text.slice(idx + header.length).replace(/^[\s:#-]+/, "");
    const nextHeader = after.search(
      /\n#{1,3}\s|\n[A-Z][a-z]+ Requirements|\nFunctional|\nNon-Functional|\n(?:Goals|Objectives)\b/i
    );
    const block = nextHeader > 0 ? after.slice(0, nextHeader) : after;
    return block
      .split("\n")
      .map(cleanLine)
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

  // Name: first markdown H1, else legacy heuristics. Drop an SRS-style suffix.
  const name = (
    text.match(/^#\s+(.+)$/m)?.[1] ||
    linesUnderSection(text, ["project name", "name:", "title:"])[0] ||
    text.split("\n")[0]?.replace(/^#+\s*/, "") ||
    ""
  )
    .replace(/\s*[—–-]\s*software requirements specification.*$/i, "")
    .trim();

  // Vision: a "Vision" heading, else a summary-style heading (preferring a
  // "Purpose:" labelled line inside it), else legacy loose match / first paragraph.
  let vision = "";
  const visionSection = sectionByHeading(text, ["vision"]);
  const summarySection =
    visionSection ?? sectionByHeading(text, ["project summary", "summary", "overview", "brief", "description"]);
  if (summarySection) {
    const purpose = summarySection.match(/^\s*(?:[-*]\s*)?\*{0,2}purpose:?\*{0,2}\s*(.+)$/im)?.[1];
    vision = (purpose ?? cleanLine(firstParagraph(summarySection).replace(/\n/g, " "))).trim();
  } else {
    vision = linesUnderSection(text, ["vision", "brief", "overview", "description"]).join(" ") || firstParagraph(text);
  }

  // Goals — in markdown documents, only trust an actual Goals/Objectives
  // heading (the loose match would grab prose around any mid-sentence "goals").
  const isMarkdown = /^#{1,6}\s/m.test(text);
  const goalsSection = sectionByHeading(text, ["goals", "objectives"]);
  const goals = goalsSection
    ? goalsSection.split("\n").map(cleanLine).filter((l) => l.length > 2 && !l.startsWith("#"))
    : isMarkdown
      ? []
      : linesUnderSection(text, ["goals", "objectives"]);

  // Requirements: markdown sections first, then loose sections + tagged lines.
  const frSection = sectionByHeading(text, ["functional requirements", "functional reqs"]);
  const nfrSection = sectionByHeading(text, ["non functional requirements", "non functional reqs"]);

  let functionalRequirements: string[];
  let nonFunctionalRequirements: string[];

  if (frSection !== null || nfrSection !== null) {
    functionalRequirements = frSection ? requirementItems(frSection) : [];
    nonFunctionalRequirements = nfrSection ? requirementItems(nfrSection) : [];
  } else {
    const frLoose = linesUnderSection(text, ["functional requirements", "functional reqs", "fr:"]);
    const nfrLoose = linesUnderSection(text, [
      "non-functional requirements",
      "non functional requirements",
      "non-functional reqs",
      "nfr:",
    ]);
    // Lines tagged FR-001 / NFR-001 anywhere ("FR-001: x", "FR-001 · x").
    // The leading char class has no letters, so "NFR-…" never matches the FR pattern.
    const frTagged = [...text.matchAll(/^[#\s\-*>•]*(FR)[-_ ]?(\d+)\s*[·:—–-]\s*(.+?)\s*$/gim)].map(
      (m) => `FR-${m[2]}: ${cleanLine(m[3])}`
    );
    const nfrTagged = [...text.matchAll(/^[#\s\-*>•]*(NFR)[-_ ]?(\d+)\s*[·:—–-]\s*(.+?)\s*$/gim)].map(
      (m) => `NFR-${m[2]}: ${cleanLine(m[3])}`
    );
    functionalRequirements = frLoose.length ? frLoose : frTagged;
    nonFunctionalRequirements = nfrLoose.length ? nfrLoose : nfrTagged;
  }

  return {
    name: name && name.length < 120 ? name : undefined,
    vision: vision.length > 20 ? vision : undefined,
    goals: goals.length ? goals : undefined,
    functionalRequirements: functionalRequirements.length ? [...new Set(functionalRequirements)] : undefined,
    nonFunctionalRequirements: nonFunctionalRequirements.length ? [...new Set(nonFunctionalRequirements)] : undefined,
  };
}
