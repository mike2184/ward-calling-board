import type { ParsedCalling, ParsedMember } from "@/types/models";

/**
 * Parses the LCR "Organizations and Callings" PDF that also embeds member
 * rosters (the combined report, downloaded with "Include member list" enabled).
 *
 * This parser is deliberately generic: it treats the PDF as the source of
 * truth rather than mapping calling names onto a hardcoded ward taxonomy.
 *
 *   - Top-level ORGANIZATIONS are read from the PDF's large section headers
 *     (rendered at font height ~12): "Bishopric", "Elders Quorum",
 *     "Aaronic Priesthood Quorums", "Young Women", etc. Whatever the PDF calls
 *     an organization is what we use — so class/name changes (e.g. the Young
 *     Women class rename to "Gatherers of Light") flow through automatically.
 *   - POSITIONS are the calling names verbatim. When a calling sits under a
 *     class/room sub-header (e.g. Primary/Sunday School classes), the class
 *     name qualifies the position so classes stay distinct.
 *   - MEMBERS come from the per-organization rosters embedded in the report.
 *     Gender is taken from the roster's Gender column when present, otherwise
 *     inferred from the owning organization.
 */

const MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const DATE_PATTERN = new RegExp(`(\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4})`);

/** Font height (in PDF units) at or above which a line is a top-level org header. */
const ORG_HEADER_MIN_HEIGHT = 11;

/**
 * Infers the gender associated with an organization for rosters/positions that
 * don't state it explicitly (e.g. quorum and class rosters have no Gender
 * column). Returns undefined for mixed-gender organizations.
 */
export function inferGenderFromOrg(org: string): "M" | "F" | undefined {
  const o = org.toLowerCase();
  if (/relief society|young women|\bwomen\b/.test(o)) return "F";
  if (/bishopric|elders|priest|teacher|deacon|aaronic|young men|\bmen\b/.test(o))
    return "M";
  return undefined;
}

// Header/footer/footnote lines that carry no data.
const SKIP_PATTERNS = [
  /^Organizations and Callings/,
  /Canyon View \d/,
  /Orem Utah/,
  /For Church Use Only/,
  /Intellectual Reserve/,
  /^Count:/,
  /^\d+$/, // bare page numbers
  /^\*+\s*(Unbaptized|out of default|custom calling)/i, // roster/calling footnotes
];

const isSkip = (t: string) => SKIP_PATTERNS.some((r) => r.test(t));
const isCallingHeader = (t: string) => /^Calling\s+Name\s+Sustained/.test(t);
const isMemberHeader = (t: string) => /^Name\s+(Gender\s+)?Age\s+Birth Date/.test(t);
const memberHeaderHasGender = (t: string) => /^Name\s+Gender\s+Age/.test(t);

function parseDateStr(dateStr: string): string {
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 3) return dateStr;
  const [day, mon, year] = parts;
  const monthNum = months[mon];
  if (!monthNum) return dateStr;
  return `${year}-${monthNum}-${day.padStart(2, "0")}`;
}

export interface StyledLine {
  text: string;
  height: number;
}

export interface CombinedPdfParseResult {
  callings: ParsedCalling[];
  members: ParsedMember[];
  errors: string[];
}

type Mode = "none" | "calling" | "roster";

/**
 * Parses the styled lines (text + font height) of a combined callings/members
 * PDF into callings and members.
 */
export function parseCombinedPdf(lines: StyledLine[]): CombinedPdfParseResult {
  const callings: ParsedCalling[] = [];
  const membersByKey = new Map<string, ParsedMember>();
  const errors: string[] = [];

  let org: string | null = null;
  let klass: string | null = null;
  let mode: Mode = "none";
  let rosterHasGender = false;
  // The ✓ (set-apart) mark sometimes reflows onto its own line just before or
  // after the calling row it belongs to; carry it to the next calling row.
  let pendingSetApart = false;

  for (const { text, height } of lines) {
    const t = text.trim();
    if (!t) continue;
    if (/^✓+$/.test(t)) {
      pendingSetApart = true;
      continue;
    }
    if (isSkip(t)) continue;

    // Top-level organization header, or an "X Members" roster header, both
    // rendered at the large header font size.
    if (height >= ORG_HEADER_MIN_HEIGHT) {
      if (/\bMembers$/.test(t)) {
        mode = "roster"; // roster for the current organization
        klass = null;
      } else {
        org = t;
        klass = null;
        mode = "none";
      }
      continue;
    }

    // Table column headers.
    if (isCallingHeader(t)) {
      mode = "calling";
      continue;
    }
    if (isMemberHeader(t)) {
      // Every roster is preceded by this column header, so clearing the class
      // context here reliably prevents it leaking past a roster into the next
      // section, regardless of the roster header's exact wording.
      mode = "roster";
      klass = null;
      rosterHasGender = memberHeaderHasGender(t);
      continue;
    }

    // Class/room sub-header (e.g. "Course 14   Room: 13", "Valiant 8   Room: 7",
    // "Adult Sunday School   Room: Cultural Hall"). Sets the class qualifier for
    // the callings that follow. Roster headers ("... Members   Room: ...") are
    // excluded — they're handled below.
    const roomMatch = t.match(/^(.+?)\s+Room:/);
    if (roomMatch && !/\bMembers\b/.test(t)) {
      klass = roomMatch[1].trim();
      mode = "none";
      continue;
    }

    // Sub-roster header that carries a "Members" label but isn't a data row
    // (e.g. "Priests Quorum Members   Room: Bishop's Office"). Entering a roster
    // ends the current class context so it can't leak onto a later section
    // (e.g. "Unassigned Teachers", "Resource Center").
    if (/\bMembers\b/.test(t) && !DATE_PATTERN.test(t) && !t.includes(",")) {
      mode = "roster";
      klass = null;
      continue;
    }

    // Any other non-data structural line (committee/sub-org header like
    // "Presidency", "Ministering", "Unassigned Teachers", "Resource Center")
    // ends the current class context so it doesn't leak onto later callings.
    // These are recognised by being neither a calling row nor a roster row.

    if (mode === "roster") {
      const member = parseMemberRow(t, rosterHasGender, org);
      if (member) {
        const key = member.fullName.toLowerCase();
        const prev = membersByKey.get(key);
        if (!prev) {
          membersByKey.set(key, member);
        } else {
          // Merge: prefer an explicit gender / age from any roster.
          if (!prev.gender && member.gender) prev.gender = member.gender;
          if (prev.age == null && member.age != null) prev.age = member.age;
          if (!prev.phone && member.phone) prev.phone = member.phone;
          if (!prev.email && member.email) prev.email = member.email;
        }
      }
      continue;
    }

    if (mode === "calling") {
      if (!org) {
        pendingSetApart = false;
        continue;
      }
      const calling = parseCallingRow(t, org, klass, pendingSetApart);
      pendingSetApart = false;
      if (calling) callings.push(calling);
      continue;
    }

    // A non-data line outside a table resets the class context so a stale class
    // (e.g. the last Sunday School course) doesn't qualify a later section.
    klass = null;
  }

  return { callings, members: [...membersByKey.values()], errors };
}

const PHONE_PATTERN = /(?:\((\d{3})\)\s*(\d{3})-(\d{4})|([\d+][\d+-]{6,}))/;
const EMAIL_PATTERN = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/;

function parseMemberRow(
  line: string,
  hasGender: boolean,
  org: string | null
): ParsedMember | null {
  // Strip a leading "*"/"**" marker (out-of-default / unbaptized member of record).
  const clean = line.replace(/^\*+\s+/, "");
  const commaIdx = clean.indexOf(",");
  if (commaIdx === -1) return null;
  const lastName = clean.slice(0, commaIdx).trim();
  if (!/^[A-Za-z][A-Za-z'.\- ]*$/.test(lastName)) return null;

  const rest = clean.slice(commaIdx + 1).trim();
  const re = hasGender
    ? new RegExp(`^(.+?)\\s+(M|F)\\s+(\\d+)\\s+\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4}`)
    : new RegExp(`^(.+?)\\s+(\\d+)\\s+\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4}`);
  const m = rest.match(re);
  if (!m) return null;

  const firstName = m[1].trim();
  const gender = hasGender ? (m[2] as "M" | "F") : inferGenderFromOrg(org ?? "");
  const age = hasGender ? parseInt(m[3], 10) : parseInt(m[2], 10);

  let phone: string | undefined;
  const phoneMatch = clean.match(PHONE_PATTERN);
  if (phoneMatch) {
    if (phoneMatch[1]) {
      phone = `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
    } else if (phoneMatch[4]) {
      const raw = phoneMatch[4].replace(/[^\d]/g, "");
      if (raw.length === 10) phone = `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6)}`;
      else if (raw.length === 11 && raw.startsWith("1")) phone = `(${raw.slice(1, 4)}) ${raw.slice(4, 7)}-${raw.slice(7)}`;
      else phone = phoneMatch[4];
    }
  }

  const emailMatch = clean.match(EMAIL_PATTERN);
  const email = emailMatch ? emailMatch[1] : undefined;

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    gender,
    age: isNaN(age) ? undefined : age,
    phone,
    email,
  };
}

function parseCallingRow(
  line: string,
  org: string,
  klass: string | null,
  pendingSetApart: boolean
): ParsedCalling | null {
  let callingName: string;
  let memberFirstName: string | undefined;
  let memberLastName: string | undefined;
  let memberFullName: string | undefined;
  let activeDate: string | undefined;
  let setApart = false;

  const vacantMatch = line.match(/^(.+?)\s+Calling Vacant\s*$/);
  if (vacantMatch) {
    callingName = vacantMatch[1].replace(/^\*+\s+/, "").trim();
  } else {
    const dateMatch = line.match(DATE_PATTERN);
    if (!dateMatch || dateMatch.index === undefined) return null;

    const beforeDate = line.slice(0, dateMatch.index).trim();
    const afterDate = line.slice(dateMatch.index + dateMatch[0].length).trim();
    setApart = afterDate.includes("✓") || pendingSetApart;

    const commaIdx = beforeDate.lastIndexOf(",");
    if (commaIdx === -1) return null;

    const beforeComma = beforeDate.slice(0, commaIdx).trim();
    memberFirstName = beforeDate.slice(commaIdx + 1).trim();

    const parts = beforeComma.split(/\s+/);
    if (parts.length < 2) return null; // need calling name + last name
    memberLastName = parts[parts.length - 1];
    callingName = parts.slice(0, -1).join(" ").replace(/^\*+\s+/, "").trim();
    memberFullName = `${memberFirstName} ${memberLastName}`;
    activeDate = parseDateStr(dateMatch[1]);
  }

  // Qualify the position with its class when one is active, dropping a leading
  // org word so "Primary Teacher" under "Valiant 8" reads "Valiant 8 Teacher".
  // Skip qualification when the calling already names the class (e.g. the
  // "Nursery Leader" calling under the "Nursery" class stays "Nursery Leader").
  let positionName = callingName;
  if (klass) {
    let base = callingName;
    if (base.toLowerCase().startsWith(org.toLowerCase() + " ")) {
      base = base.slice(org.length + 1);
    }
    positionName = base.toLowerCase().startsWith(klass.toLowerCase())
      ? base
      : `${klass} ${base}`.trim();
  }

  return {
    organizationName: org,
    subOrganizationName: klass ?? undefined,
    positionName,
    memberFirstName,
    memberLastName,
    memberFullName,
    activeDate,
    setApart,
  };
}

/**
 * Extracts styled lines (text grouped by baseline, with the leading item's font
 * height) from a PDF file using pdf.js.
 */
export async function extractStyledLines(file: File): Promise<StyledLine[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const lines: StyledLine[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const itemsByY = new Map<number, { x: number; h: number; text: string }[]>();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = Math.round(item.transform[5]);
      const h = Math.hypot(item.transform[2], item.transform[3]);
      if (!itemsByY.has(y)) itemsByY.set(y, []);
      itemsByY.get(y)!.push({ x: item.transform[4], h, text: item.str });
    }

    const sortedYs = Array.from(itemsByY.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = itemsByY.get(y)!.sort((a, b) => a.x - b.x);
      const text = items.map((it) => it.text).join(" ").replace(/\s+/g, " ").trim();
      if (text) lines.push({ text, height: items[0].h });
    }
  }
  return lines;
}

/**
 * Parses a combined LCR "Organizations and Callings" (with member list) PDF file.
 */
export async function parseCombinedPdfFile(
  file: File
): Promise<CombinedPdfParseResult> {
  const lines = await extractStyledLines(file);
  return parseCombinedPdf(lines);
}
