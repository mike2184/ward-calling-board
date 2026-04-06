import type { ParsedMember } from "@/types/models";

/**
 * Parses the text content extracted from LCR member PDFs.
 *
 * Supports two formats:
 * 1. "Members without Callings" — Last, First  M/F  Age  DD Mon YYYY  [(phone)]
 * 2. "Member List" (all members) — Last, First  M/F  Age  DD Mon YYYY phone  email
 *
 * Header/footer lines and the "Count: N" summary are skipped.
 */

const SKIP_PATTERNS = [
  /^Name\s+Gender\s+Age/,
  /Canyon View/,
  /Orem Utah/,
  /Members without Callings/,
  /^Member List/,
  /^Individuals/,
  /For Church Use Only/,
  /Intellectual Reserve/,
  /^\d+$/,
  /^$/,
  /^Count:\s*\d+/,
  /^April\s+\d/,
];

const PHONE_PATTERN = /(?:\((\d{3})\)\s*(\d{3})-(\d{4})|([\d+][\d+-]{6,}))/;
const EMAIL_PATTERN = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/;

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return SKIP_PATTERNS.some((p) => p.test(trimmed));
}

function parseLine(line: string): ParsedMember | null {
  const trimmed = line.trim();
  if (!trimmed || shouldSkipLine(trimmed)) return null;

  // Find the comma that separates "Last, First"
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx === -1) return null;

  const lastName = trimmed.substring(0, commaIdx).trim();

  // After the comma, parse: First  Gender  Age  Date  [Phone]  [Email]
  const rest = trimmed.substring(commaIdx + 1).trim();

  // Match: FirstName  M/F  Age  Date
  const match = rest.match(
    /^(.+?)\s+(M|F)\s+(\d+)\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/
  );
  if (!match) return null;

  const firstName = match[1].trim();
  const gender = match[2] as "M" | "F";
  const age = parseInt(match[3], 10);

  // Extract phone number if present
  let phone: string | undefined;
  const phoneMatch = trimmed.match(PHONE_PATTERN);
  if (phoneMatch) {
    if (phoneMatch[1]) {
      phone = `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
    } else if (phoneMatch[4]) {
      // Raw phone like "801-735-3613" or "+18018307751"
      const raw = phoneMatch[4].replace(/[^\d]/g, "");
      if (raw.length === 10) {
        phone = `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6)}`;
      } else if (raw.length === 11 && raw.startsWith("1")) {
        phone = `(${raw.slice(1, 4)}) ${raw.slice(4, 7)}-${raw.slice(7)}`;
      } else {
        phone = phoneMatch[4];
      }
    }
  }

  // Extract email if present
  let email: string | undefined;
  const emailMatch = trimmed.match(EMAIL_PATTERN);
  if (emailMatch) {
    email = emailMatch[1];
  }

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

export interface MemberPdfParseResult {
  members: ParsedMember[];
  errors: string[];
}

/**
 * Parses extracted text from an LCR member PDF (all members or without callings).
 */
export function parseMemberPdfText(text: string): MemberPdfParseResult {
  const lines = text.split("\n");
  const members: ParsedMember[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (shouldSkipLine(line)) continue;

    const parsed = parseLine(line);
    if (!parsed) continue;

    // Deduplicate
    const key = parsed.fullName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    members.push(parsed);
  }

  return { members, errors };
}

/**
 * Extracts text from an LCR member PDF file, then parses it.
 */
export async function parseMemberPdfFile(file: File): Promise<MemberPdfParseResult> {
  const pdfjsLib = await import("pdfjs-dist");

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

    // Group text items by y-position to reconstruct lines
    const itemsByY = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items) {
      if (!("str" in item)) continue;
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

  return parseMemberPdfText(lines.join("\n"));
}
