import type { ParsedCalling } from "@/types/models";

interface LcrCallingEntry {
  positionName?: string;
  position?: string;
  memberName?: string;
  spokenName?: string;
  displayName?: string;
  name?: string;
  activeDate?: string;
  sustainedDate?: string;
  setApart?: boolean;
  hidden?: boolean;
}

interface LcrOrg {
  orgName?: string;
  unitName?: string;
  name?: string;
  children?: LcrOrg[];
  subOrgs?: LcrOrg[];
  callings?: LcrCallingEntry[];
  members?: LcrCallingEntry[];
  positions?: LcrCallingEntry[];
}

export interface LcrParseResult {
  callings: ParsedCalling[];
  errors: string[];
}

function parseMemberName(entry: LcrCallingEntry): {
  firstName?: string;
  lastName?: string;
  fullName?: string;
} {
  const raw =
    entry.memberName ||
    entry.spokenName ||
    entry.displayName ||
    entry.name ||
    "";
  if (!raw) return {};

  const fullName = raw.trim();

  // Try "Last, First" format
  if (fullName.includes(",")) {
    const [last, ...rest] = fullName.split(",");
    const first = rest.join(",").trim();
    return {
      firstName: first || undefined,
      lastName: last?.trim() || undefined,
      fullName: first ? `${first} ${last?.trim()}` : fullName,
    };
  }

  // Try "First Last" format
  const parts = fullName.split(/\s+/);
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
      fullName,
    };
  }

  return { fullName };
}

function extractCallings(
  org: LcrOrg,
  parentOrgName: string | undefined,
  results: ParsedCalling[],
  errors: string[]
): void {
  const orgName = org.orgName || org.unitName || org.name || "Unknown";
  const callingEntries = org.callings || org.members || org.positions || [];

  for (const entry of callingEntries) {
    if (entry.hidden) continue;

    const positionName = entry.positionName || entry.position;
    if (!positionName) {
      errors.push(`Skipped entry in "${orgName}": no position name found`);
      continue;
    }

    const member = parseMemberName(entry);
    const activeDate = entry.activeDate || entry.sustainedDate || undefined;

    results.push({
      organizationName: parentOrgName || orgName,
      subOrganizationName: parentOrgName ? orgName : undefined,
      positionName,
      memberFirstName: member.firstName,
      memberLastName: member.lastName,
      memberFullName: member.fullName,
      activeDate,
      setApart: entry.setApart,
    });
  }

  // Recurse into children
  const children = org.children || org.subOrgs || [];
  for (const child of children) {
    extractCallings(child, parentOrgName || orgName, results, errors);
  }
}

export function parseLcrJson(jsonText: string): LcrParseResult {
  const errors: string[] = [];
  const callings: ParsedCalling[] = [];

  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    return {
      callings: [],
      errors: [
        `Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`,
      ],
    };
  }

  // Handle both array and single object responses
  const orgs: LcrOrg[] = Array.isArray(data) ? data : [data as LcrOrg];

  for (const org of orgs) {
    extractCallings(org, undefined, callings, errors);
  }

  if (callings.length === 0 && errors.length === 0) {
    errors.push(
      "No callings found in the JSON. The structure may not match the expected LCR format."
    );
  }

  return { callings, errors };
}
