import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/data/db";
import type {
  Calling,
  CallingPosition,
  Organization,
  Member,
} from "@/types/models";
import { generateId } from "@/data/seed";

export interface CallingWithDetails {
  calling: Calling;
  position: CallingPosition;
  organization: Organization;
  member: Member | null;
}

export function useCallings(organizationFilter?: Set<string>) {
  // Convert Set to sorted array for stable dependency
  const filterKey = organizationFilter ? [...organizationFilter].sort().join(",") : "";
  return useLiveQuery(async () => {
    const callings = await db.callings.toArray();
    const positions = await db.callingPositions.toArray();
    const organizations = await db.organizations.toArray();
    const members = await db.members.toArray();

    const posMap = new Map(positions.map((p) => [p.id, p]));
    const orgMap = new Map(organizations.map((o) => [o.id, o]));
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const results: CallingWithDetails[] = [];

    for (const calling of callings) {
      const position = posMap.get(calling.positionId);
      if (!position) continue;

      const organization = orgMap.get(position.organizationId);
      if (!organization) continue;

      if (organizationFilter && organizationFilter.size > 0 && !organizationFilter.has(organization.id))
        continue;

      results.push({
        calling,
        position,
        organization,
        member: calling.memberId
          ? memberMap.get(calling.memberId) ?? null
          : null,
      });
    }

    results.sort((a, b) => {
      const orgDiff = a.organization.sortOrder - b.organization.sortOrder;
      if (orgDiff !== 0) return orgDiff;
      return a.position.sortOrder - b.position.sortOrder;
    });

    return results;
  }, [filterKey]);
}

export function useOrganizations() {
  return useLiveQuery(() =>
    db.organizations.orderBy("sortOrder").toArray()
  );
}

export function useOrganizationsWithCounts() {
  return useLiveQuery(async () => {
    const organizations = await db.organizations.orderBy("sortOrder").toArray();
    const positions = await db.callingPositions.toArray();
    const callings = await db.callings.toArray();

    return organizations.map((org) => {
      const orgPositions = positions.filter(
        (p) => p.organizationId === org.id
      );
      const orgCallings = callings.filter((c) =>
        orgPositions.some((p) => p.id === c.positionId)
      );
      const vacant = orgCallings.filter((c) => c.status === "vacant").length;
      const filled = orgCallings.filter((c) => c.status === "active").length;

      return { ...org, totalCallings: orgCallings.length, vacant, filled };
    });
  });
}

export async function createCallingFromImport(
  positionId: string,
  memberId: string | null,
  activeDate: string | null,
  setApart = false
): Promise<void> {
  await db.callings.add({
    id: generateId(),
    positionId,
    memberId,
    activeDate,
    setApart,
    status: memberId ? "active" : "vacant",
  });
}
