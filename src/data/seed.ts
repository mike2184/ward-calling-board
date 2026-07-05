import type { Organization } from "@/types/models";

/**
 * Default organizations, ordered to match the LCR "Organizations and Callings"
 * report. These are only shells for a sensible empty-state and stable column
 * ordering — positions and callings are defined entirely by the imported PDF
 * (the PDF is the source of truth). Names are matched case/space-insensitively
 * on import, so an imported organization slots into the matching shell here.
 */
export const defaultOrganizations: Organization[] = [
  { id: "bishopric", name: "Bishopric", sortOrder: 1 },
  { id: "elders-quorum", name: "Elders Quorum", sortOrder: 2 },
  { id: "relief-society", name: "Relief Society", sortOrder: 3 },
  { id: "aaronic-priesthood-quorums", name: "Aaronic Priesthood Quorums", sortOrder: 4 },
  { id: "young-women", name: "Young Women", sortOrder: 5 },
  { id: "sunday-school", name: "Sunday School", sortOrder: 6 },
  { id: "primary", name: "Primary", sortOrder: 7 },
  { id: "ward-missionaries", name: "Ward Missionaries", sortOrder: 8 },
  { id: "temple-family-history", name: "Temple and Family History", sortOrder: 9 },
  { id: "young-single-adult", name: "Young Single Adult", sortOrder: 10 },
  { id: "other", name: "Other Callings", sortOrder: 11 },
];

export function generateId(): string {
  return crypto.randomUUID();
}
