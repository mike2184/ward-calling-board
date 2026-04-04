import type { ParsedCalling, ParsedMember } from "@/types/models";

export interface CsvParseResult {
  callings: ParsedCalling[];
  members: ParsedMember[];
  errors: string[];
}

const CALLING_COLUMN_MAP: Record<string, string> = {
  organization: "organization",
  org: "organization",
  "sub-organization": "subOrganization",
  "sub organization": "subOrganization",
  suborg: "subOrganization",
  suborganization: "subOrganization",
  position: "position",
  calling: "position",
  title: "position",
  "first name": "firstName",
  firstname: "firstName",
  first: "firstName",
  "last name": "lastName",
  lastname: "lastName",
  last: "lastName",
  name: "fullName",
  "full name": "fullName",
  fullname: "fullName",
  member: "fullName",
  "active date": "activeDate",
  activedate: "activeDate",
  "start date": "activeDate",
  "sustained date": "activeDate",
  sustained: "activeDate",
  date: "activeDate",
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === "," || char === "\t") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function mapColumns(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const normalized = (headers[i] ?? "").toLowerCase().trim();
    const mapped = CALLING_COLUMN_MAP[normalized];
    if (mapped) {
      mapping[i] = mapped;
    }
  }
  return mapping;
}

export function parseCsvCallings(csvText: string): CsvParseResult {
  const errors: string[] = [];
  const callings: ParsedCalling[] = [];
  const members: ParsedMember[] = [];

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { callings: [], members: [], errors: ["CSV must have a header row and at least one data row."] };
  }

  const headers = parseCSVLine(lines[0]!);
  const columnMap = mapColumns(headers);

  const hasOrg = Object.values(columnMap).includes("organization");
  const hasPosition = Object.values(columnMap).includes("position");
  const hasName =
    Object.values(columnMap).includes("fullName") ||
    Object.values(columnMap).includes("firstName");

  if (!hasOrg && !hasPosition && !hasName) {
    return {
      callings: [],
      members: [],
      errors: [
        `Could not map any columns. Found headers: ${headers.join(", ")}. Expected columns like: Organization, Position, First Name, Last Name, Active Date.`,
      ],
    };
  }

  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const values = parseCSVLine(lines[lineIdx]!);
    const row: Record<string, string> = {};

    for (const [colIdx, fieldName] of Object.entries(columnMap)) {
      row[fieldName] = values[Number(colIdx)] ?? "";
    }

    // If we have position data, parse as calling
    if (hasPosition && row["position"]) {
      const fullName = row["fullName"] || "";
      let firstName = row["firstName"] || "";
      let lastName = row["lastName"] || "";

      if (!firstName && !lastName && fullName) {
        if (fullName.includes(",")) {
          const [last, ...rest] = fullName.split(",");
          lastName = (last ?? "").trim();
          firstName = rest.join(",").trim();
        } else {
          const parts = fullName.split(/\s+/);
          firstName = parts[0] ?? "";
          lastName = parts.slice(1).join(" ");
        }
      }

      callings.push({
        organizationName: row["organization"] || "Unknown",
        subOrganizationName: row["subOrganization"] || undefined,
        positionName: row["position"] || "",
        memberFirstName: firstName || undefined,
        memberLastName: lastName || undefined,
        memberFullName:
          firstName && lastName
            ? `${firstName} ${lastName}`
            : fullName || undefined,
        activeDate: row["activeDate"] || undefined,
      });
    }
    // Otherwise parse as member only
    else if (hasName) {
      const fullName = row["fullName"] || "";
      let firstName = row["firstName"] || "";
      let lastName = row["lastName"] || "";

      if (!firstName && !lastName && fullName) {
        const parts = fullName.split(/\s+/);
        firstName = parts[0] ?? "";
        lastName = parts.slice(1).join(" ");
      }

      if (firstName || lastName) {
        members.push({
          firstName,
          lastName,
          fullName: fullName || `${firstName} ${lastName}`.trim(),
          gender: (row["gender"] as "M" | "F") || undefined,
          email: row["email"] || undefined,
          phone: row["phone"] || undefined,
        });
      }
    }
  }

  return { callings, members, errors };
}
