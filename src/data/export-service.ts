import { db } from "./db";
import { generateId } from "./seed";

interface MetadataProposal {
  type: "assign" | "release" | "move" | "create_position" | "remove_position";
  organizationName?: string;
  positionName?: string;
  fromMemberFullName?: string;
  toMemberFullName?: string;
  reason?: string;
  status: "draft" | "pending_approval" | "approved" | "applied";
  createdAt: string;
  updatedAt: string;
}

interface MetadataMember {
  fullName: string;
  activityStatus?: string;
  notes?: string;
}

interface MetadataCallingNote {
  organizationName: string;
  positionName: string;
  memberFullName?: string;
  notes: string;
}

export interface MetadataBackup {
  version: 1;
  kind: "ward-callings-metadata";
  exportedAt: string;
  members: MetadataMember[];
  callingNotes: MetadataCallingNote[];
  proposedChanges: MetadataProposal[];
}

export async function exportMetadata(): Promise<string> {
  const [members, callings, positions, orgs, proposals] = await Promise.all([
    db.members.toArray(),
    db.callings.toArray(),
    db.callingPositions.toArray(),
    db.organizations.toArray(),
    db.proposedChanges.toArray(),
  ]);

  const memberById = new Map(members.map((m) => [m.id, m]));
  const posById = new Map(positions.map((p) => [p.id, p]));
  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const callingById = new Map(callings.map((c) => [c.id, c]));

  const memberMeta: MetadataMember[] = members
    .filter((m) => m.activityStatus || m.notes)
    .map((m) => ({
      fullName: m.fullName,
      activityStatus: m.activityStatus,
      notes: m.notes,
    }));

  const callingNotes: MetadataCallingNote[] = callings
    .filter((c) => c.notes && c.notes.trim().length > 0)
    .map((c) => {
      const pos = posById.get(c.positionId);
      const org = pos ? orgById.get(pos.organizationId) : undefined;
      const member = c.memberId ? memberById.get(c.memberId) : undefined;
      return {
        organizationName: org?.name ?? "",
        positionName: pos?.positionName ?? "",
        memberFullName: member?.fullName,
        notes: c.notes!,
      };
    });

  const proposedChanges: MetadataProposal[] = proposals.map((p) => {
    const calling = p.callingId ? callingById.get(p.callingId) : undefined;
    const pos = calling
      ? posById.get(calling.positionId)
      : p.positionId
        ? posById.get(p.positionId)
        : undefined;
    const org = pos ? orgById.get(pos.organizationId) : undefined;
    return {
      type: p.type,
      organizationName: org?.name,
      positionName: pos?.positionName,
      fromMemberFullName: p.fromMemberId ? memberById.get(p.fromMemberId)?.fullName : undefined,
      toMemberFullName: p.toMemberId ? memberById.get(p.toMemberId)?.fullName : undefined,
      reason: p.reason,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  const backup: MetadataBackup = {
    version: 1,
    kind: "ward-callings-metadata",
    exportedAt: new Date().toISOString(),
    members: memberMeta,
    callingNotes,
    proposedChanges,
  };

  return JSON.stringify(backup, null, 2);
}

export interface MetadataImportResult {
  membersUpdated: number;
  callingNotesApplied: number;
  proposalsCreated: number;
  warnings: string[];
}

export async function importMetadata(json: string): Promise<MetadataImportResult> {
  const parsed = JSON.parse(json) as MetadataBackup;
  if (parsed.kind !== "ward-callings-metadata") {
    throw new Error("Not a metadata backup file");
  }

  const warnings: string[] = [];
  let membersUpdated = 0;
  let callingNotesApplied = 0;
  let proposalsCreated = 0;

  await db.transaction(
    "rw",
    [db.members, db.callings, db.callingPositions, db.organizations, db.proposedChanges],
    async () => {
      const [members, callings, positions, orgs] = await Promise.all([
        db.members.toArray(),
        db.callings.toArray(),
        db.callingPositions.toArray(),
        db.organizations.toArray(),
      ]);

      const memberByName = new Map<string, string>();
      for (const m of members) memberByName.set(m.fullName.toLowerCase(), m.id);

      const orgByName = new Map<string, string>();
      for (const o of orgs) orgByName.set(o.name.toLowerCase(), o.id);

      // position key: `${orgId}::${positionName lowercased}` -> positionId
      const posByKey = new Map<string, string>();
      for (const p of positions) {
        posByKey.set(`${p.organizationId}::${p.positionName.toLowerCase()}`, p.id);
      }

      // callings grouped by positionId
      const callingsByPos = new Map<string, typeof callings>();
      for (const c of callings) {
        const arr = callingsByPos.get(c.positionId) ?? [];
        arr.push(c);
        callingsByPos.set(c.positionId, arr);
      }

      function findCalling(
        orgName: string,
        positionName: string,
        memberFullName?: string
      ): string | undefined {
        const orgId = orgByName.get(orgName.toLowerCase());
        if (!orgId) return undefined;
        const posId = posByKey.get(`${orgId}::${positionName.toLowerCase()}`);
        if (!posId) return undefined;
        const slots = callingsByPos.get(posId) ?? [];
        if (memberFullName) {
          const mid = memberByName.get(memberFullName.toLowerCase());
          if (mid) {
            const match = slots.find((c) => c.memberId === mid);
            if (match) return match.id;
          }
        }
        // Fall back to first slot of this position
        return slots[0]?.id;
      }

      // Restore member-level metadata
      for (const m of parsed.members ?? []) {
        const id = memberByName.get(m.fullName.toLowerCase());
        if (!id) {
          warnings.push(`Member not found: ${m.fullName}`);
          continue;
        }
        await db.members.update(id, {
          activityStatus: m.activityStatus as never,
          notes: m.notes,
        });
        membersUpdated++;
      }

      // Restore calling notes
      for (const cn of parsed.callingNotes ?? []) {
        const callingId = findCalling(cn.organizationName, cn.positionName, cn.memberFullName);
        if (!callingId) {
          warnings.push(`Calling not found: ${cn.organizationName} / ${cn.positionName}`);
          continue;
        }
        await db.callings.update(callingId, { notes: cn.notes });
        callingNotesApplied++;
      }

      // Restore proposed changes
      for (const p of parsed.proposedChanges ?? []) {
        const memberFullName =
          p.type === "release" ? p.fromMemberFullName : p.toMemberFullName;
        const callingId =
          p.organizationName && p.positionName
            ? findCalling(p.organizationName, p.positionName, memberFullName)
            : undefined;
        if (!callingId) {
          warnings.push(
            `Proposal skipped (calling not found): ${p.organizationName ?? "?"} / ${p.positionName ?? "?"}`
          );
          continue;
        }
        const fromMemberId = p.fromMemberFullName
          ? memberByName.get(p.fromMemberFullName.toLowerCase()) ?? null
          : null;
        const toMemberId = p.toMemberFullName
          ? memberByName.get(p.toMemberFullName.toLowerCase()) ?? null
          : null;
        if (p.fromMemberFullName && !fromMemberId) {
          warnings.push(`Proposal from-member not found: ${p.fromMemberFullName}`);
        }
        if (p.toMemberFullName && !toMemberId) {
          warnings.push(`Proposal to-member not found: ${p.toMemberFullName}`);
        }
        await db.proposedChanges.add({
          id: generateId(),
          type: p.type,
          callingId,
          fromMemberId,
          toMemberId,
          reason: p.reason,
          status: p.status,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });
        proposalsCreated++;
      }
    }
  );

  return { membersUpdated, callingNotesApplied, proposalsCreated, warnings };
}

export async function downloadMetadataBackup() {
  const json = await exportMetadata();
  const date = new Date().toISOString().split("T")[0];
  downloadFile(json, `ward-callings-metadata-${date}.json`, "application/json");
}

export async function exportToJson(): Promise<string> {
  const [members, organizations, callingPositions, callings, proposedChanges] =
    await Promise.all([
      db.members.toArray(),
      db.organizations.toArray(),
      db.callingPositions.toArray(),
      db.callings.toArray(),
      db.proposedChanges.toArray(),
    ]);

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { members, organizations, callingPositions, callings, proposedChanges },
    },
    null,
    2
  );
}

export async function importFromJson(json: string): Promise<{ imported: number }> {
  const parsed = JSON.parse(json);
  const data = parsed.data;
  if (!data) throw new Error("Invalid backup file format");

  await db.transaction(
    "rw",
    [db.members, db.organizations, db.callingPositions, db.callings, db.proposedChanges],
    async () => {
      await db.members.clear();
      await db.organizations.clear();
      await db.callingPositions.clear();
      await db.callings.clear();
      await db.proposedChanges.clear();

      if (data.members?.length) await db.members.bulkAdd(data.members);
      if (data.organizations?.length) await db.organizations.bulkAdd(data.organizations);
      if (data.callingPositions?.length) await db.callingPositions.bulkAdd(data.callingPositions);
      if (data.callings?.length) await db.callings.bulkAdd(data.callings);
      if (data.proposedChanges?.length) await db.proposedChanges.bulkAdd(data.proposedChanges);
    }
  );

  const total =
    (data.members?.length ?? 0) +
    (data.organizations?.length ?? 0) +
    (data.callingPositions?.length ?? 0) +
    (data.callings?.length ?? 0) +
    (data.proposedChanges?.length ?? 0);

  return { imported: total };
}

export async function exportToCsv(): Promise<string> {
  const callings = await db.callings.toArray();
  const positions = await db.callingPositions.toArray();
  const orgs = await db.organizations.toArray();
  const members = await db.members.toArray();

  const posMap = new Map(positions.map((p) => [p.id, p]));
  const orgMap = new Map(orgs.map((o) => [o.id, o]));
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const rows: string[][] = [
    ["Organization", "Position", "Member", "Status", "Active Date", "Set Apart"],
  ];

  // Sort by org sortOrder, then position sortOrder
  const sorted = callings
    .map((c) => {
      const pos = posMap.get(c.positionId);
      const org = pos ? orgMap.get(pos.organizationId) : undefined;
      const member = c.memberId ? memberMap.get(c.memberId) : undefined;
      return { calling: c, position: pos, organization: org, member };
    })
    .sort((a, b) => {
      const orgOrder = (a.organization?.sortOrder ?? 999) - (b.organization?.sortOrder ?? 999);
      if (orgOrder !== 0) return orgOrder;
      return (a.position?.sortOrder ?? 999) - (b.position?.sortOrder ?? 999);
    });

  for (const { calling, position, organization, member } of sorted) {
    rows.push([
      organization?.name ?? "",
      position?.positionName ?? "",
      member?.fullName ?? "",
      calling.status,
      calling.activeDate ?? "",
      calling.setApart ? "Yes" : "No",
    ]);
  }

  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadCsvExport() {
  const csv = await exportToCsv();
  const date = new Date().toISOString().split("T")[0];
  downloadFile(csv, `ward-callings-${date}.csv`, "text/csv");
}

export async function downloadJsonBackup() {
  const json = await exportToJson();
  const date = new Date().toISOString().split("T")[0];
  downloadFile(json, `ward-callings-backup-${date}.json`, "application/json");
}
