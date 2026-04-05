import type { ParsedMember } from "@/types/models";

/**
 * Parses the text content extracted from an LCR "Members without Callings" PDF.
 *
 * Each line follows the pattern:
 *   Last, First  Gender  Age  DD Mon YYYY  [(phone)]
 *
 * Header/footer lines and the "Count: N" summary are skipped.
 */

const SKIP_PATTERNS = [
  /^Name\s+Gender\s+Age/,
  /Canyon View/,
  /Orem Utah/,
  /Members without Callings/,
  /For Church Use Only/,
  /Intellectual Reserve/,
  /^\d+$/,
  /^$/,
  /^Count:\s*\d+/,
  /^April\s+\d/,
];

const DATE_PATTERN = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/;
const PHONE_PATTERN = /\((\d{3})\)\s*(\d{3})-(\d{4})/;

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return SKIP_PATTERNS.some((p) => p.test(trimmed));
}

function parseLine(line: string): ParsedMember | null {
  const trimmed = line.trim();
  if (!trimmed || shouldSkipLine(trimmed)) return null;

  // Extract phone number if present
  let phone: string | undefined;
  const phoneMatch = trimmed.match(PHONE_PATTERN);
  if (phoneMatch) {
    phone = `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
  }

  // Find the comma that separates "Last, First"
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx === -1) return null;

  const lastName = trimmed.substring(0, commaIdx).trim();

  // After the comma, parse: First  Gender  Age  Date  [Phone]
  const rest = trimmed.substring(commaIdx + 1).trim();

  // Match: FirstName  M/F  Age  Date  [Phone]
  const match = rest.match(
    /^(.+?)\s+(M|F)\s+(\d+)\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/
  );
  if (!match) return null;

  const firstName = match[1].trim();
  const gender = match[2] as "M" | "F";
  const age = parseInt(match[3], 10);

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    gender,
    age: isNaN(age) ? undefined : age,
    phone,
  };
}

export interface MemberPdfParseResult {
  members: ParsedMember[];
  errors: string[];
}

/**
 * Parses extracted text from an LCR "Members without Callings" PDF.
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
 * Extracts text from a "Members without Callings" PDF file, then parses it.
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
