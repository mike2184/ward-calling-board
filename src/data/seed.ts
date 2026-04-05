import type { Organization, CallingPosition } from "@/types/models";

export const defaultOrganizations: Organization[] = [
  { id: "bishopric", name: "Bishopric", sortOrder: 1 },
  { id: "elders-quorum", name: "Elders Quorum", sortOrder: 2 },
  { id: "relief-society", name: "Relief Society", sortOrder: 3 },
  { id: "priests-quorum", name: "Priests Quorum", sortOrder: 4 },
  { id: "teachers-quorum", name: "Teachers Quorum", sortOrder: 5 },
  { id: "deacons-quorum", name: "Deacons Quorum", sortOrder: 6 },
  { id: "young-men", name: "Young Men", sortOrder: 7 },
  { id: "young-women", name: "Young Women", sortOrder: 8 },
  { id: "primary", name: "Primary", sortOrder: 9 },
  { id: "sunday-school", name: "Sunday School", sortOrder: 10 },
  { id: "ward-missionaries", name: "Ward Missionaries", sortOrder: 11 },
  { id: "ward-activities", name: "Ward Activities", sortOrder: 12 },
  { id: "temple-family-history", name: "Temple & Family History", sortOrder: 13 },
  { id: "music", name: "Music", sortOrder: 14 },
  { id: "other", name: "Other Callings", sortOrder: 15 },
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
  pos("ward-exec-sec", "bishopric", "Executive Secretary", 4),
  pos("ward-asst-exec-sec", "bishopric", "Assistant Executive Secretary", 5, false, 2),
  pos("ward-clerk", "bishopric", "Ward Clerk", 6),
  pos("ward-asst-clerk", "bishopric", "Assistant Clerk", 7, false),
  pos("ward-asst-clerk-mem", "bishopric", "Assistant Clerk--Membership", 8, false),
  pos("ward-asst-clerk-fin", "bishopric", "Assistant Clerk--Finance", 9, false),

  // Elders Quorum
  pos("eq-president", "elders-quorum", "President", 1),
  pos("eq-1st", "elders-quorum", "1st Counselor", 2),
  pos("eq-2nd", "elders-quorum", "2nd Counselor", 3),
  pos("eq-secretary", "elders-quorum", "Secretary", 4),
  pos("eq-asst-secretary", "elders-quorum", "Assistant Secretary", 5, false),
  pos("eq-teacher", "elders-quorum", "Teacher", 6, false, 4),
  pos("eq-ministering-sec", "elders-quorum", "Ministering Secretary", 7, false),
  pos("eq-activity-coord", "elders-quorum", "Activity Coordinator", 8, false),
  pos("eq-asst-activity-coord", "elders-quorum", "Assistant Activity Coordinator", 9, false),
  pos("eq-activity-committee", "elders-quorum", "Activity Committee Member", 10, false, 4),
  pos("eq-service-coord", "elders-quorum", "Service Coordinator", 11, false),
  pos("eq-asst-service-coord", "elders-quorum", "Assistant Service Coordinator", 12, false),
  pos("eq-service-committee", "elders-quorum", "Service Committee Member", 13, false, 4),

  // Relief Society
  pos("rs-president", "relief-society", "President", 1),
  pos("rs-1st", "relief-society", "1st Counselor", 2),
  pos("rs-2nd", "relief-society", "2nd Counselor", 3),
  pos("rs-secretary", "relief-society", "Secretary", 4),
  pos("rs-asst-secretary", "relief-society", "Assistant Secretary", 5, false),
  pos("rs-teacher", "relief-society", "Teacher", 6, false, 4),
  pos("rs-ministering-sec", "relief-society", "Ministering Secretary", 7, false),
  pos("rs-activity-coord", "relief-society", "Activity Coordinator", 8, false),
  pos("rs-asst-activity-coord", "relief-society", "Assistant Activity Coordinator", 9, false),
  pos("rs-activity-committee", "relief-society", "Activity Committee Member", 10, false, 8),
  pos("rs-music-leader", "relief-society", "Music Leader", 11, false),
  pos("rs-pianist", "relief-society", "Pianist", 12, false),
  pos("rs-service-coord", "relief-society", "Service Coordinator", 13, false),
  pos("rs-asst-service-coord", "relief-society", "Assistant Service Coordinator", 14, false),
  pos("rs-service-committee", "relief-society", "Service Committee Member", 15, false, 4),

  // Priests Quorum
  pos("pq-president", "priests-quorum", "President", 1),
  pos("pq-1st-asst", "priests-quorum", "1st Assistant", 2),
  pos("pq-2nd-asst", "priests-quorum", "2nd Assistant", 3),
  pos("pq-secretary", "priests-quorum", "Secretary", 4, false),
  pos("pq-adviser", "priests-quorum", "Adviser", 5, false, 2),
  pos("pq-specialist", "priests-quorum", "Specialist", 6, false, 2),

  // Teachers Quorum
  pos("tq-president", "teachers-quorum", "President", 1),
  pos("tq-1st", "teachers-quorum", "1st Counselor", 2),
  pos("tq-2nd", "teachers-quorum", "2nd Counselor", 3),
  pos("tq-secretary", "teachers-quorum", "Secretary", 4, false),
  pos("tq-adviser", "teachers-quorum", "Adviser", 5, false, 2),
  pos("tq-specialist", "teachers-quorum", "Specialist", 6, false, 2),

  // Deacons Quorum
  pos("dq-president", "deacons-quorum", "President", 1),
  pos("dq-1st", "deacons-quorum", "1st Counselor", 2),
  pos("dq-2nd", "deacons-quorum", "2nd Counselor", 3),
  pos("dq-secretary", "deacons-quorum", "Secretary", 4, false),
  pos("dq-adviser", "deacons-quorum", "Adviser", 5, false, 2),
  pos("dq-specialist", "deacons-quorum", "Specialist", 6, false, 2),

  // Young Men
  pos("ym-president", "young-men", "President", 1),
  pos("ym-1st", "young-men", "1st Counselor", 2),
  pos("ym-2nd", "young-men", "2nd Counselor", 3),
  pos("ym-secretary", "young-men", "Secretary", 4, false),
  pos("ym-camp-director", "young-men", "Camp Director", 5, false),
  pos("ym-asst-camp-director", "young-men", "Assistant Camp Director", 6, false),
  pos("ym-specialist-sports", "young-men", "Specialist - Sports", 7, false),
  pos("ym-specialist-sports-asst", "young-men", "Specialist - Sports Assistant", 8, false),
  pos("ym-ap-specialist", "young-men", "Aaronic Priesthood Quorums Specialist", 9, false, 2),
  pos("ym-stake-youth", "young-men", "Stake Youth Committee Member", 10, false),

  // Young Women
  pos("yw-president", "young-women", "President", 1),
  pos("yw-1st", "young-women", "1st Counselor", 2),
  pos("yw-2nd", "young-women", "2nd Counselor", 3),
  pos("yw-secretary", "young-women", "Secretary", 4, false),
  pos("yw-class-president", "young-women", "Class President", 5, false, 3),
  pos("yw-class-1st", "young-women", "Class 1st Counselor", 6, false, 3),
  pos("yw-class-2nd", "young-women", "Class 2nd Counselor", 7, false, 3),
  pos("yw-class-secretary", "young-women", "Class Secretary", 8, false, 3),
  pos("yw-class-adviser", "young-women", "Class Adviser", 9, false, 3),
  pos("yw-specialist", "young-women", "Specialist", 10, false, 4),
  pos("yw-specialist-activities", "young-women", "Specialist - Activities", 11, false),
  pos("yw-camp-director", "young-women", "Specialist - Camp Director", 12, false),
  pos("yw-asst-camp-director", "young-women", "Specialist - Assistant Camp Director", 13, false),
  pos("yw-stake-youth", "young-women", "Stake Youth Committee", 14, false),
  pos("yw-specialist-sports", "young-women", "Specialist - Sports", 15, false),
  pos("yw-specialist-sports-asst", "young-women", "Specialist - Sports Assistant", 16, false),

  // Primary
  pos("primary-president", "primary", "President", 1),
  pos("primary-1st", "primary", "1st Counselor", 2),
  pos("primary-2nd", "primary", "2nd Counselor", 3),
  pos("primary-secretary", "primary", "Secretary", 4),
  pos("primary-pianist", "primary", "Pianist", 5, false),
  pos("primary-music", "primary", "Music Leader", 6, false),
  pos("primary-teacher", "primary", "Teacher", 7, false, 16),
  pos("nursery-leader", "primary", "Nursery Leader", 8, false, 6),
  pos("valiant-activities", "primary", "Valiant Activities Leader", 9, false, 6),

  // Sunday School
  pos("ss-president", "sunday-school", "President", 1),
  pos("ss-1st", "sunday-school", "1st Counselor", 2, false),
  pos("ss-2nd", "sunday-school", "2nd Counselor", 3, false),
  pos("ss-secretary", "sunday-school", "Secretary", 4, false),
  pos("ss-teacher", "sunday-school", "Teacher", 5, false, 14),
  pos("ss-resource-center", "sunday-school", "Resource Center Specialist", 6, false, 3),

  // Ward Missionaries
  pos("wml", "ward-missionaries", "Ward Mission Leader", 1),
  pos("wml-asst", "ward-missionaries", "Assistant Ward Mission Leader", 2, false),
  pos("ward-missionary", "ward-missionaries", "Ward Missionary", 3, false, 8),

  // Ward Activities
  pos("ward-activity-coord", "ward-activities", "Activity Coordinator", 1, false),
  pos("ward-asst-activity-coord", "ward-activities", "Assistant Activity Coordinator", 2, false),
  pos("ward-activity-committee", "ward-activities", "Activity Committee Member", 3, false, 12),

  // Temple & Family History
  pos("tfh-leader", "temple-family-history", "Leader", 1, false),
  pos("tfh-consultant", "temple-family-history", "Consultant", 2, false, 12),
  pos("tfh-indexing", "temple-family-history", "Indexing Worker", 3, false, 4),

  // Music
  pos("choir-director", "music", "Choir Director", 1, false, 2),
  pos("choir-accompanist", "music", "Choir Accompanist", 2, false, 2),
  pos("ward-organist", "music", "Accompanist", 3, false),
  pos("ward-music-leader", "music", "Music Leader", 4, false),
  pos("ward-music-coord", "music", "Music Coordinator", 5, false),
  pos("music-adviser", "music", "Music Adviser", 6, false),
  pos("priesthood-pianist", "music", "Priesthood Pianist or Organist", 7, false),
  pos("priesthood-music-dir", "music", "Priesthood Music Director", 8, false),

  // Other Callings
  pos("building-rep", "other", "Building Representative", 1, false, 4),
  pos("fsy-rep", "other", "FSY Conferences Representative", 2, false, 2),
  pos("technology-specialist", "other", "Technology Specialist", 3, false, 4),
  pos("email-specialist", "other", "Email Communication Specialist", 4, false),
  pos("history-specialist", "other", "History Specialist", 5, false),
  pos("ysa-adviser", "other", "Young Single Adult Adviser", 6, false),
  pos("ysa-leader", "other", "Young Single Adult Leader", 7, false),
  pos("welfare-specialist", "other", "Welfare and Self-Reliance Specialist", 8, false),
  pos("self-reliance-facilitator", "other", "Self-Reliance Group Facilitator", 9, false),
  pos("rs-ysa-adviser", "other", "RS Adviser to YSA Sisters", 10, false),
  pos("interpreter", "other", "Ward/Branch Interpreter", 11, false),
  pos("disability-specialist", "other", "Disability Specialist", 12, false),
  pos("disability-activity", "other", "Disability Activity Leader", 13, false),
  pos("magazine-rep", "other", "Magazine Representative", 14, false),
];

export function generateId(): string {
  return crypto.randomUUID();
}
