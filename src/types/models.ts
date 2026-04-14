export type ActivityStatus = "active" | "less-active" | "inactive" | "serving-away";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender?: "M" | "F";
  age?: number;
  email?: string;
  phone?: string;
  priesthoodOffice?: string;
  moveInDate?: string;
  notes?: string;
  /** App-managed field — not imported from LCR. Defaults to "active" when undefined. */
  activityStatus?: ActivityStatus;
}

export interface Organization {
  id: string;
  name: string;
  parentId?: string;
  sortOrder: number;
}

export interface CallingPosition {
  id: string;
  organizationId: string;
  positionName: string;
  sortOrder: number;
  isRequired: boolean;
  maxHolders: number;
}

export interface Calling {
  id: string;
  positionId: string;
  memberId: string | null;
  activeDate: string | null;
  setApart: boolean;
  status: "active" | "vacant";
  notes?: string;
}

export interface ProposedChange {
  id: string;
  type: "assign" | "release" | "move" | "create_position" | "remove_position";
  callingId?: string;
  positionId?: string;
  fromMemberId?: string | null;
  toMemberId?: string | null;
  reason?: string;
  status: "draft" | "pending_approval" | "approved" | "applied";
  createdAt: string;
  updatedAt: string;
}

export interface ImportSession {
  id: string;
  importedAt: string;
  sourceType: "csv" | "json" | "lcr-paste";
  recordCount: number;
  notes?: string;
}

export interface ParsedCalling {
  organizationName: string;
  subOrganizationName?: string;
  positionName: string;
  memberFirstName?: string;
  memberLastName?: string;
  memberFullName?: string;
  activeDate?: string;
  setApart?: boolean;
}

export interface ParsedMember {
  firstName: string;
  lastName: string;
  fullName: string;
  gender?: "M" | "F";
  age?: number;
  email?: string;
  phone?: string;
  priesthoodOffice?: string;
}
