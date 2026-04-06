import type { ParsedCalling } from "@/types/models";

/**
 * Parses the text content extracted from an LCR "Organizations and Callings" PDF.
 *
 * Each line in the PDF follows one of these patterns:
 *   CallingName  Last, First  DD Mon YYYY  [✓]
 *   CallingName  Calling Vacant
 *
 * Some lines are prefixed with "* " (e.g. "* Ward Activity Committee Member").
 */

// Ordered longest-prefix-first so "Ward Assistant Executive Secretary" matches
// before "Ward Assistant Clerk" etc.
const ORG_RULES: { prefix: string; org: string; strip: boolean }[] = [
  // Bishopric ward-level callings
  { prefix: "Ward Assistant Executive Secretary", org: "Bishopric", strip: false },
  { prefix: "Ward Executive Secretary", org: "Bishopric", strip: false },
  { prefix: "Ward Assistant Clerk--Membership", org: "Bishopric", strip: false },
  { prefix: "Ward Assistant Clerk--Finance", org: "Bishopric", strip: false },
  { prefix: "Ward Assistant Clerk", org: "Bishopric", strip: false },
  { prefix: "Ward Clerk", org: "Bishopric", strip: false },
  { prefix: "Bishopric First Counselor", org: "Bishopric", strip: false },
  { prefix: "Bishopric Second Counselor", org: "Bishopric", strip: false },

  // Quorums
  { prefix: "Aaronic Priesthood Quorums Specialist", org: "Young Men", strip: false },
  { prefix: "Aaronic Priesthood Quorums", org: "Young Men", strip: false },
  { prefix: "Priests Quorum", org: "Priests Quorum", strip: true },
  { prefix: "Teachers Quorum", org: "Teachers Quorum", strip: true },
  { prefix: "Deacons Quorum", org: "Deacons Quorum", strip: true },
  { prefix: "Elders Quorum", org: "Elders Quorum", strip: true },
  { prefix: "Relief Society", org: "Relief Society", strip: true },

  // Youth
  { prefix: "Young Women", org: "Young Women", strip: true },
  { prefix: "Young Men", org: "Young Men", strip: true },

  // Sunday School & Resource Center
  { prefix: "Resource Center", org: "Sunday School", strip: false },
  { prefix: "Sunday School", org: "Sunday School", strip: true },

  // Primary
  { prefix: "Nursery", org: "Primary", strip: false },
  { prefix: "Valiant", org: "Primary", strip: false },
  { prefix: "Primary", org: "Primary", strip: true },

  // Temple & Family History
  { prefix: "Ward Temple and Family History", org: "Temple & Family History", strip: true },
  { prefix: "Indexing Worker", org: "Temple & Family History", strip: false },

  // Ward Missionaries
  { prefix: "Assistant Ward Mission Leader", org: "Ward Missionaries", strip: false },
  { prefix: "Ward Mission Leader", org: "Ward Missionaries", strip: false },
  { prefix: "Ward Missionary", org: "Ward Missionaries", strip: false },

  // Ward Activities
  { prefix: "Ward Assistant Activity Coordinator", org: "Ward Activities", strip: false },
  { prefix: "Ward Activity", org: "Ward Activities", strip: false },

  // Music
  { prefix: "Choir Accompanist", org: "Music", strip: false },
  { prefix: "Choir Director", org: "Music", strip: false },
  { prefix: "Accompanist", org: "Music", strip: false },
  { prefix: "Music Adviser", org: "Music", strip: false },
  { prefix: "Music Leader", org: "Music", strip: false },
  { prefix: "Music Coordinator", org: "Music", strip: false },
  { prefix: "Priesthood Pianist or Organist", org: "Music", strip: false },
  { prefix: "Priesthood Music Director", org: "Music", strip: false },

  // Bishopric (after more specific matches)
  { prefix: "Bishop", org: "Bishopric", strip: false },

  // Other callings
  { prefix: "Relief Society Adviser to Young Single Adult", org: "Other Callings", strip: false },
  { prefix: "Young Single Adult", org: "Other Callings", strip: false },
  { prefix: "Building Representative", org: "Other Callings", strip: false },
  { prefix: "FSY Conferences Representative", org: "Other Callings", strip: false },
  { prefix: "Technology Specialist", org: "Other Callings", strip: false },
  { prefix: "Email Communication Specialist", org: "Other Callings", strip: false },
  { prefix: "History Specialist", org: "Other Callings", strip: false },
  { prefix: "Magazine Representative", org: "Other Callings", strip: false },
  { prefix: "Ward/Branch Interpreter", org: "Other Callings", strip: false },
  { prefix: "Disability", org: "Other Callings", strip: false },
  { prefix: "Welfare and Self-Reliance", org: "Other Callings", strip: false },
  { prefix: "Self-Reliance", org: "Other Callings", strip: false },
];

// Normalize calling names from the PDF to shorter position names matching seed data
const POSITION_RENAMES: Record<string, string> = {
  // Bishopric
  "Bishopric First Counselor": "1st Counselor",
  "Bishopric Second Counselor": "2nd Counselor",
  "Ward Executive Secretary": "Executive Secretary",
  "Ward Assistant Executive Secretary": "Assistant Executive Secretary",
  "Ward Assistant Clerk": "Assistant Clerk",
  "Ward Assistant Clerk--Membership": "Assistant Clerk--Membership",
  "Ward Assistant Clerk--Finance": "Assistant Clerk--Finance",

  // Quorum counselors (after prefix strip: "First Counselor" → "1st Counselor")
  "First Counselor": "1st Counselor",
  "Second Counselor": "2nd Counselor",
  "First Assistant": "1st Assistant",
  "Second Assistant": "2nd Assistant",

  // Ward Activities (prefix not stripped)
  "Ward Activity Coordinator": "Activity Coordinator",
  "Ward Assistant Activity Coordinator": "Assistant Activity Coordinator",
  "Ward Activity Committee Member": "Activity Committee Member",

  // Ward Missionaries (prefix not stripped)
  "Ward Mission Leader": "Ward Mission Leader",
  "Assistant Ward Mission Leader": "Assistant Ward Mission Leader",
  "Ward Missionary": "Ward Missionary",

  // Temple & Family History (prefix stripped: "Ward Temple and Family History" → remainder)
  "Leader": "Leader",
  "Consultant": "Consultant",

  // YW class positions (after prefix strip)
  "Class First Counselor": "Class 1st Counselor",
  "Class Second Counselor": "Class 2nd Counselor",

  // Specialist variants for YM (not stripped since Aaronic Priesthood prefix)
  "Aaronic Priesthood Quorums Specialist - Camp Director": "Camp Director",
  "Aaronic Priesthood Quorums Specialist - Assistant Camp Director": "Assistant Camp Director",
  "Aaronic Priesthood Quorums Specialist": "Aaronic Priesthood Quorums Specialist",

  // Music
  "Priesthood Pianist or Organist": "Priesthood Pianist or Organist",
  "Priesthood Music Director": "Priesthood Music Director",

  // Other
  "Relief Society Adviser to Young Single Adult Sisters": "RS Adviser to YSA Sisters",
  "Young Single Adult Adviser": "Young Single Adult Adviser",
  "Young Single Adult Leader": "Young Single Adult Leader",
  "Young Single Adult Committee Chair": "Young Single Adult Committee Chair",
  "Young Single Adult Committee Member": "Young Single Adult Committee Member",
  "Welfare and Self-Reliance Specialist": "Welfare and Self-Reliance Specialist",
  "Self-Reliance Group Facilitator": "Self-Reliance Group Facilitator",
};

const DATE_PATTERN = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/;

// Lines to skip (headers, footers, page markers)
const SKIP_PATTERNS = [
  /^Organizations and Callings/,
  /^Calling\s+Name\s+Sustained/,
  /Canyon View/,
  /Orem Utah/,
  /For Church Use Only/,
  /Intellectual Reserve/,
  /^\d+\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/,
  /^Count:\s*\d+/,
  /^\d+$/, // bare page numbers
  /^$/,
];

function shouldSkipLine(line: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(line.trim()));
}

function classifyCalling(callingName: string): { org: string; position: string } {
  for (const rule of ORG_RULES) {
    if (callingName.startsWith(rule.prefix)) {
      let position: string;
      if (rule.strip) {
        position = callingName.substring(rule.prefix.length).trim();
        if (!position) position = callingName; // fallback if prefix IS the full name
      } else {
        position = callingName;
      }

      // Apply renames
      if (POSITION_RENAMES[position]) {
        position = POSITION_RENAMES[position];
      }
      // Also check rename for the full calling name (for non-stripped cases)
      if (POSITION_RENAMES[callingName]) {
        position = POSITION_RENAMES[callingName];
      }

      return { org: rule.org, position };
    }
  }

  // Fallback: put in Other Callings
  return { org: "Other Callings", position: callingName };
}

function parseDateStr(dateStr: string): string {
  // Convert "21 Jan 2024" → "2024-01-21"
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

interface ParsedLine {
  callingName: string;
  memberFullName: string | null;
  memberFirstName: string | null;
  memberLastName: string | null;
  activeDate: string | null;
  setApart: boolean;
}

function parseLine(line: string): ParsedLine | null {
  let cleaned = line.trim();
  // Strip leading "* " prefix (indicates ward-level callings in LCR)
  if (cleaned.startsWith("* ")) {
    cleaned = cleaned.substring(2);
  }

  if (!cleaned || shouldSkipLine(cleaned)) return null;

  // Check for vacant position
  const vacantMatch = cleaned.match(/^(.+?)\s+Calling Vacant\s*$/);
  if (vacantMatch) {
    return {
      callingName: vacantMatch[1].trim(),
      memberFullName: null,
      memberFirstName: null,
      memberLastName: null,
      activeDate: null,
      setApart: false,
    };
  }

  // Look for the date pattern
  const dateMatch = cleaned.match(DATE_PATTERN);
  if (!dateMatch || dateMatch.index === undefined) return null;

  const beforeDate = cleaned.substring(0, dateMatch.index).trim();
  const afterDate = cleaned.substring(dateMatch.index + dateMatch[0].length).trim();
  const setApart = afterDate.includes("✓");

  // Find the comma that separates "Last, First" in the member name
  const commaIdx = beforeDate.lastIndexOf(",");
  if (commaIdx === -1) return null;

  const beforeComma = beforeDate.substring(0, commaIdx).trim();
  const firstName = beforeDate.substring(commaIdx + 1).trim();

  // The last name is the last whitespace-separated token before the comma
  const parts = beforeComma.split(/\s+/);
  if (parts.length < 2) return null; // Need at least calling name + last name

  const lastName = parts[parts.length - 1];
  const callingName = parts.slice(0, -1).join(" ");

  return {
    callingName,
    memberFullName: `${firstName} ${lastName}`,
    memberFirstName: firstName,
    memberLastName: lastName,
    activeDate: parseDateStr(dateMatch[1]),
    setApart,
  };
}

export interface PdfParseResult {
  callings: ParsedCalling[];
  errors: string[];
}

/**
 * Parses extracted text from an LCR Organizations and Callings PDF.
 */
// Sub-header detection rules: each rule matches a PDF section header line,
// extracts a qualifier, and specifies which org and positions it applies to.
interface SubHeaderRule {
  /** Regex to match the sub-header line. Must have a capture group for the qualifier. */
  pattern: RegExp;
  /** Function to abbreviate the captured group into a short prefix */
  abbreviate: (match: RegExpMatchArray) => string;
  /** The organization this sub-header applies to */
  org: string;
  /** Position names (lowercase) that should be qualified. If null, qualify all positions. */
  positions: string[] | null;
}

const SUB_HEADER_RULES: SubHeaderRule[] = [
  {
    // "Young Women 15-18 Class Presidency", "Young Women 12-14 Class Adult Leaders"
    pattern: /^Young Women\s+(\d+-\d+)\s+Class/,
    abbreviate: (m) => `YW ${m[1]}`,
    org: "Young Women",
    positions: [
      "class president", "class 1st counselor", "class 2nd counselor",
      "class first counselor", "class second counselor",
      "class secretary", "class adviser",
    ],
  },
  {
    // "Primary Activities - Boys", "Primary Activities - Girls"
    pattern: /^Primary Activities\s*[-–—]\s*(.+)/,
    abbreviate: (m) => m[1].trim(),
    org: "Primary",
    positions: null, // qualify all positions under this sub-header
  },
  {
    // Primary class sub-headers: "Valiant 9, Valiant 10   Room: 21", "CTR 5   Room: 6", "Sunbeam   Room: ...", "Nursery   Room: ..."
    pattern: /^((?:Valiant|CTR|Sunbeam|Nursery)[\w\s,()]+?)\s+Room:/,
    abbreviate: (m) => m[1].replace(/\s+/g, " ").trim(),
    org: "Primary",
    positions: ["teacher"],
  },
  {
    // Sunday School class sub-headers: "Gospel Doctrine   Room: ...", "Course 15, Course 16   Room: ..."
    pattern: /^((?:Gospel Doctrine|Course)[\w\s,]+?)\s+Room:/,
    abbreviate: (m) => m[1].replace(/\s+/g, " ").trim(),
    org: "Sunday School",
    positions: ["teacher"],
  },
  {
    // "Unassigned Teachers" section — reset qualifier so these don't get a class prefix
    pattern: /^Unassigned Teachers$/,
    abbreviate: () => "",
    org: "", // special: handled as a reset
    positions: null,
  },
];

export function parsePdfText(text: string): PdfParseResult {
  const lines = text.split("\n");
  const callings: ParsedCalling[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  // Track the current sub-header qualifier and its rule
  let currentQualifier: string | null = null;
  let currentRule: SubHeaderRule | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (shouldSkipLine(trimmed)) continue;

    // Detect sub-headers
    let matchedSubHeader = false;
    for (const rule of SUB_HEADER_RULES) {
      const match = trimmed.match(rule.pattern);
      if (match) {
        const qualifier = rule.abbreviate(match);
        if (!qualifier) {
          // Empty qualifier means reset (e.g. "Unassigned Teachers")
          currentQualifier = null;
          currentRule = null;
        } else {
          currentQualifier = qualifier;
          currentRule = rule;
        }
        matchedSubHeader = true;
        break;
      }
    }
    if (matchedSubHeader) continue;

    const parsed = parseLine(line);
    if (!parsed) continue;

    const { org, position } = classifyCalling(parsed.callingName);

    // Reset sub-header context when we leave the relevant org
    if (currentRule && org !== currentRule.org) {
      currentQualifier = null;
      currentRule = null;
    }

    // Qualify positions with the sub-header prefix
    let qualifiedPosition = position;
    if (currentQualifier && currentRule && org === currentRule.org) {
      const shouldQualify = currentRule.positions === null
        || currentRule.positions.some((p) => position.toLowerCase() === p);
      if (shouldQualify) {
        qualifiedPosition = `${currentQualifier} ${position}`;
      }
    }

    // Deduplicate (PDF repeats Bishopric entries for Priests Quorum)
    const key = `${org}|${qualifiedPosition}|${parsed.memberFullName ?? "vacant"}`;
    if (seen.has(key)) continue;
    seen.add(key);

    callings.push({
      organizationName: org,
      positionName: qualifiedPosition,
      memberFirstName: parsed.memberFirstName ?? undefined,
      memberLastName: parsed.memberLastName ?? undefined,
      memberFullName: parsed.memberFullName ?? undefined,
      activeDate: parsed.activeDate ?? undefined,
      setApart: parsed.setApart,
    });
  }

  return { callings, errors };
}

/**
 * Extracts text from a PDF file using pdf.js, then parses it.
 */
export async function parsePdfFile(file: File): Promise<PdfParseResult> {
  const pdfjsLib = await import("pdfjs-dist");

  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const lines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group text items by their y-position to reconstruct lines
    const itemsByY = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      // Round y to nearest integer to group items on the same line
      const y = Math.round(item.transform[5]);
      if (!itemsByY.has(y)) itemsByY.set(y, []);
      itemsByY.get(y)!.push({ x: item.transform[4], text: item.str });
    }

    // Sort by y descending (PDF coordinates go bottom-up), then x ascending
    const sortedYs = Array.from(itemsByY.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = itemsByY.get(y)!.sort((a, b) => a.x - b.x);
      const lineText = items.map((i) => i.text).join(" ").trim();
      if (lineText) lines.push(lineText);
    }
  }

  return parsePdfText(lines.join("\n"));
}
