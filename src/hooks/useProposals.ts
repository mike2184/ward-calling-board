import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/data/db";
import { generateId } from "@/data/seed";
import type { ProposedChange } from "@/types/models";

export interface ProposalWithDetails extends ProposedChange {
  fromMemberName?: string;
  toMemberName?: string;
  positionName?: string;
  organizationName?: string;
}

export function useProposals() {
  return useLiveQuery(async () => {
    const proposals = await db.proposedChanges
      .where("status")
      .anyOf(["draft", "pending_approval", "approved", "applied"])
      .toArray();

    const members = await db.members.toArray();
    const callings = await db.callings.toArray();
    const positions = await db.callingPositions.toArray();
    const orgs = await db.organizations.toArray();

    const memberMap = new Map(members.map((m) => [m.id, m]));
    const posMap = new Map(positions.map((p) => [p.id, p]));
    const orgMap = new Map(orgs.map((o) => [o.id, o]));
    const callingMap = new Map(callings.map((c) => [c.id, c]));

    return proposals
      .map((p): ProposalWithDetails => {
        const calling = p.callingId ? callingMap.get(p.callingId) : undefined;
        const position = calling
          ? posMap.get(calling.positionId)
          : p.positionId
            ? posMap.get(p.positionId)
            : undefined;
        const org = position ? orgMap.get(position.organizationId) : undefined;

        return {
          ...p,
          fromMemberName: p.fromMemberId
            ? memberMap.get(p.fromMemberId)?.fullName
            : undefined,
          toMemberName: p.toMemberId
            ? memberMap.get(p.toMemberId)?.fullName
            : undefined,
          positionName: position?.positionName,
          organizationName: org?.name,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  });
}

export function useProposalCount() {
  return useLiveQuery(() =>
    db.proposedChanges
      .where("status")
      .anyOf(["draft", "pending_approval", "approved"])
      .count()
  );
}

export interface CallingProposal {
  id: string;
  type: "assign" | "release" | "move";
  status: string;
  toMemberName?: string;
  fromMemberName?: string;
}

export function useProposalsByCallingId() {
  return useLiveQuery(async () => {
    const proposals = await db.proposedChanges
      .where("status")
      .anyOf(["draft", "pending_approval", "approved"])
      .toArray();

    const members = await db.members.toArray();
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const map = new Map<string, CallingProposal[]>();
    for (const p of proposals) {
      if (!p.callingId) continue;
      const entry: CallingProposal = {
        id: p.id,
        type: p.type as "assign" | "release" | "move",
        status: p.status,
        toMemberName: p.toMemberId
          ? memberMap.get(p.toMemberId)?.fullName
          : undefined,
        fromMemberName: p.fromMemberId
          ? memberMap.get(p.fromMemberId)?.fullName
          : undefined,
      };
      if (!map.has(p.callingId)) map.set(p.callingId, []);
      map.get(p.callingId)!.push(entry);
    }
    return map;
  });
}

export async function createAssignProposal(
  callingId: string,
  toMemberId: string,
  fromMemberId: string | null
): Promise<void> {
  const now = new Date().toISOString();
  await db.proposedChanges.add({
    id: generateId(),
    type: fromMemberId ? "move" : "assign",
    callingId,
    fromMemberId: fromMemberId || null,
    toMemberId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
}

export async function createReleaseProposal(
  callingId: string,
  fromMemberId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.proposedChanges.add({
    id: generateId(),
    type: "release",
    callingId,
    fromMemberId,
    toMemberId: null,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
}

export async function createMoveProposal(
  fromCallingId: string,
  toCallingId: string,
  memberId: string
): Promise<void> {
  const now = new Date().toISOString();

  // Create release from old position
  await db.proposedChanges.add({
    id: generateId(),
    type: "release",
    callingId: fromCallingId,
    fromMemberId: memberId,
    toMemberId: null,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  // Create assign to new position
  await db.proposedChanges.add({
    id: generateId(),
    type: "assign",
    callingId: toCallingId,
    fromMemberId: null,
    toMemberId: memberId,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
}

export async function advanceProposal(id: string): Promise<void> {
  const proposal = await db.proposedChanges.get(id);
  if (!proposal) return;

  type ProposalStatus = "draft" | "pending_approval" | "approved" | "applied";
  const nextStatus: Partial<Record<ProposalStatus, ProposalStatus>> = {
    draft: "pending_approval",
    pending_approval: "approved",
  };

  const next = nextStatus[proposal.status as ProposalStatus];
  if (next) {
    await db.proposedChanges.update(id, {
      status: next,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function applyProposal(id: string): Promise<void> {
  const proposal = await db.proposedChanges.get(id);
  if (!proposal || proposal.status !== "approved") return;

  await db.transaction("rw", [db.callings, db.proposedChanges], async () => {
    if (proposal.callingId) {
      if (proposal.type === "assign") {
        await db.callings.update(proposal.callingId, {
          memberId: proposal.toMemberId,
          activeDate: new Date().toISOString().split("T")[0],
          status: "active",
          setApart: false,
        });
      } else if (proposal.type === "release") {
        await db.callings.update(proposal.callingId, {
          memberId: null,
          activeDate: null,
          status: "vacant",
          setApart: false,
        });
      }
    }

    await db.proposedChanges.update(id, {
      status: "applied",
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function applyAllApproved(): Promise<number> {
  const approved = await db.proposedChanges
    .where("status")
    .equals("approved")
    .toArray();

  for (const proposal of approved) {
    await applyProposal(proposal.id);
  }

  return approved.length;
}

export async function rewindProposal(id: string): Promise<void> {
  const proposal = await db.proposedChanges.get(id);
  if (!proposal) return;

  type ProposalStatus = "draft" | "pending_approval" | "approved" | "applied";
  const prevStatus: Partial<Record<ProposalStatus, ProposalStatus>> = {
    pending_approval: "draft",
    approved: "pending_approval",
  };

  const prev = prevStatus[proposal.status as ProposalStatus];
  if (prev) {
    await db.proposedChanges.update(id, {
      status: prev,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function revertProposal(id: string): Promise<void> {
  const proposal = await db.proposedChanges.get(id);
  if (!proposal || proposal.status !== "applied") return;

  await db.transaction("rw", [db.callings, db.proposedChanges], async () => {
    if (proposal.callingId) {
      if (proposal.type === "assign") {
        // Undo assignment: restore to vacant (or previous member)
        await db.callings.update(proposal.callingId, {
          memberId: proposal.fromMemberId || null,
          activeDate: proposal.fromMemberId ? new Date().toISOString().split("T")[0] : null,
          status: proposal.fromMemberId ? "active" : "vacant",
          setApart: false,
        });
      } else if (proposal.type === "release") {
        // Undo release: restore the member
        await db.callings.update(proposal.callingId, {
          memberId: proposal.fromMemberId,
          activeDate: new Date().toISOString().split("T")[0],
          status: "active",
          setApart: false,
        });
      }
    }

    await db.proposedChanges.delete(id);
  });
}

export async function deleteProposal(id: string): Promise<void> {
  await db.proposedChanges.delete(id);
}
