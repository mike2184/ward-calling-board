import Dexie, { type EntityTable } from "dexie";
import type {
  Member,
  Organization,
  CallingPosition,
  Calling,
  ProposedChange,
  ImportSession,
} from "@/types/models";

const db = new Dexie("WardCallings") as Dexie & {
  members: EntityTable<Member, "id">;
  organizations: EntityTable<Organization, "id">;
  callingPositions: EntityTable<CallingPosition, "id">;
  callings: EntityTable<Calling, "id">;
  proposedChanges: EntityTable<ProposedChange, "id">;
  importSessions: EntityTable<ImportSession, "id">;
};

db.version(1).stores({
  members: "id, lastName, fullName",
  organizations: "id, parentId, sortOrder",
  callingPositions: "id, organizationId, sortOrder",
  callings: "id, positionId, memberId, status",
  proposedChanges: "id, type, status, callingId, createdAt",
  importSessions: "id, importedAt",
});

db.version(2).stores({
  members: "id, lastName, fullName, activityStatus",
});

db.version(3).upgrade(async (tx) => {
  const maleOrgIds = new Set(["bishopric", "elders-quorum", "priests-quorum", "teachers-quorum", "deacons-quorum", "young-men"]);
  const femaleOrgIds = new Set(["relief-society", "young-women"]);
  const femalePositionIds = new Set(["primary-president", "primary-1st", "primary-2nd", "primary-secretary"]);

  const positions = await tx.table("callingPositions").toArray();
  const updates = positions
    .filter((p) => maleOrgIds.has(p.organizationId) || femaleOrgIds.has(p.organizationId) || femalePositionIds.has(p.id))
    .map((p) => ({
      ...p,
      genderRestriction: maleOrgIds.has(p.organizationId) ? "M" : "F",
    }));

  if (updates.length > 0) {
    await tx.table("callingPositions").bulkPut(updates);
  }
});

export { db };
