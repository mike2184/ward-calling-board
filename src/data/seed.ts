import type { Organization, CallingPosition } from "@/types/models";

export const defaultOrganizations: Organization[] = [
  { id: "bishopric", name: "Bishopric", sortOrder: 1 },
  { id: "elders-quorum", name: "Elders Quorum", sortOrder: 2 },
  { id: "relief-society", name: "Relief Society", sortOrder: 3 },
  { id: "young-men", name: "Young Men", sortOrder: 4 },
  { id: "young-women", name: "Young Women", sortOrder: 5 },
  { id: "primary", name: "Primary", sortOrder: 6 },
  { id: "sunday-school", name: "Sunday School", sortOrder: 7 },
  { id: "ward-missionaries", name: "Ward Missionaries", sortOrder: 8 },
  { id: "music", name: "Music", sortOrder: 9 },
  { id: "other", name: "Other Callings", sortOrder: 10 },
];

function pos(
  id: string,
  orgId: string,
  name: string,
  order: number,
  required = true,
  maxHolders = 1
): CallingPosition {
  return {
    id,
    organizationId: orgId,
    positionName: name,
    sortOrder: order,
    isRequired: required,
    maxHolders,
  };
}

export const defaultPositions: CallingPosition[] = [
  // Bishopric
  pos("bishop", "bishopric", "Bishop", 1),
  pos("bishopric-1st", "bishopric", "1st Counselor", 2),
  pos("bishopric-2nd", "bishopric", "2nd Counselor", 3),
  pos("ward-clerk", "bishopric", "Ward Clerk", 4),
  pos("ward-exec-sec", "bishopric", "Executive Secretary", 5),

  // Elders Quorum
  pos("eq-president", "elders-quorum", "President", 1),
  pos("eq-1st", "elders-quorum", "1st Counselor", 2),
  pos("eq-2nd", "elders-quorum", "2nd Counselor", 3),
  pos("eq-secretary", "elders-quorum", "Secretary", 4),
  pos("eq-teacher-1", "elders-quorum", "Instructor", 5, false, 3),

  // Relief Society
  pos("rs-president", "relief-society", "President", 1),
  pos("rs-1st", "relief-society", "1st Counselor", 2),
  pos("rs-2nd", "relief-society", "2nd Counselor", 3),
  pos("rs-secretary", "relief-society", "Secretary", 4),
  pos("rs-teacher-1", "relief-society", "Instructor", 5, false, 3),

  // Young Men
  pos("ym-president", "young-men", "President", 1),
  pos("ym-1st", "young-men", "1st Counselor", 2),
  pos("ym-2nd", "young-men", "2nd Counselor", 3),
  pos("ym-secretary", "young-men", "Secretary", 4, false),

  // Young Women
  pos("yw-president", "young-women", "President", 1),
  pos("yw-1st", "young-women", "1st Counselor", 2),
  pos("yw-2nd", "young-women", "2nd Counselor", 3),
  pos("yw-secretary", "young-women", "Secretary", 4, false),

  // Primary
  pos("primary-president", "primary", "President", 1),
  pos("primary-1st", "primary", "1st Counselor", 2),
  pos("primary-2nd", "primary", "2nd Counselor", 3),
  pos("primary-secretary", "primary", "Secretary", 4),
  pos("primary-music", "primary", "Music Leader", 5, false),
  pos("primary-pianist", "primary", "Pianist", 6, false),
  pos("nursery-leader", "primary", "Nursery Leader", 7, false, 4),
  pos("primary-teacher", "primary", "Teacher", 8, false, 12),

  // Sunday School
  pos("ss-president", "sunday-school", "President", 1),
  pos("ss-1st", "sunday-school", "1st Counselor", 2, false),
  pos("ss-2nd", "sunday-school", "2nd Counselor", 3, false),
  pos("ss-secretary", "sunday-school", "Secretary", 4, false),
  pos("ss-teacher", "sunday-school", "Instructor", 5, false, 6),

  // Ward Missionaries
  pos("wml", "ward-missionaries", "Ward Mission Leader", 1),
  pos("ward-missionary", "ward-missionaries", "Ward Missionary", 2, false, 8),

  // Music
  pos("choir-director", "music", "Choir Director", 1, false),
  pos("ward-organist", "music", "Organist", 2),
  pos("ward-music-chair", "music", "Music Chairman", 3, false),

  // Other
  pos("building-rep", "other", "Building Representative", 1, false),
  pos("newsletter", "other", "Newsletter Editor", 2, false),
];

export function generateId(): string {
  return crypto.randomUUID();
}
