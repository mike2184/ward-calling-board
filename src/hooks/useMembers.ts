import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/data/db";
import type { Member } from "@/types/models";

export interface MemberWithCallingInfo extends Member {
  callingCount: number;
  callingNames: string[];
}

export function useMembers() {
  return useLiveQuery(() => db.members.orderBy("lastName").toArray());
}

export function useMembersWithCallingInfo() {
  return useLiveQuery(async () => {
    const members = await db.members.orderBy("lastName").toArray();
    const callings = await db.callings.toArray();
    const positions = await db.callingPositions.toArray();
    const organizations = await db.organizations.toArray();

    const posMap = new Map(positions.map((p) => [p.id, p]));
    const orgMap = new Map(organizations.map((o) => [o.id, o]));

    return members.map((member): MemberWithCallingInfo => {
      const memberCallings = callings.filter(
        (c) => c.memberId === member.id && c.status === "active"
      );
      const callingNames = memberCallings
        .map((c) => {
          const pos = posMap.get(c.positionId);
          if (!pos) return "Unknown";
          const org = orgMap.get(pos.organizationId);
          return org ? `${pos.positionName} (${org.name})` : pos.positionName;
        })
        .sort();

      return {
        ...member,
        callingCount: memberCallings.length,
        callingNames,
      };
    });
  });
}

export function useUnassignedMembers() {
  return useLiveQuery(async () => {
    const members = await db.members.orderBy("lastName").toArray();
    const callings = await db.callings.toArray();

    const assignedMemberIds = new Set(
      callings
        .filter((c) => c.memberId && c.status === "active")
        .map((c) => c.memberId!)
    );

    return members.filter((m) => !assignedMemberIds.has(m.id));
  });
}

export function useMultiCallingMembers() {
  return useLiveQuery(async () => {
    const members = await db.members.toArray();
    const callings = await db.callings.toArray();
    const positions = await db.callingPositions.toArray();
    const organizations = await db.organizations.toArray();

    const posMap = new Map(positions.map((p) => [p.id, p]));
    const orgMap = new Map(organizations.map((o) => [o.id, o]));

    const result: MemberWithCallingInfo[] = [];

    for (const member of members) {
      const memberCallings = callings.filter(
        (c) => c.memberId === member.id && c.status === "active"
      );
      if (memberCallings.length >= 2) {
        result.push({
          ...member,
          callingCount: memberCallings.length,
          callingNames: memberCallings
            .map((c) => {
              const pos = posMap.get(c.positionId);
              if (!pos) return "Unknown";
              const org = orgMap.get(pos.organizationId);
              return org ? `${pos.positionName} (${org.name})` : pos.positionName;
            })
            .sort(),
        });
      }
    }

    return result.sort((a, b) => a.lastName.localeCompare(b.lastName));
  });
}
