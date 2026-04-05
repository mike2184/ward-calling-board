import { db } from "./db";

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
