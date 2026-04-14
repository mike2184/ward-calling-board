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

export { db };
