import { db } from "./db";
import {
  defaultOrganizations,
  defaultPositions,
  generateId,
} from "./seed";
import type { ParsedCalling, ParsedMember } from "@/types/models";

function normalizeOrgName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findOrCreateOrgId(
  orgName: string,
  existingOrgs: Map<string, string>
): string {
  const normalized = normalizeOrgName(orgName);
  const existing = existingOrgs.get(normalized);
  if (existing) return existing;

  // Check default organizations
  for (const org of defaultOrganizations) {
    if (normalizeOrgName(org.name) === normalized) {
      existingOrgs.set(normalized, org.id);
      return org.id;
    }
  }

  // Create a new ID for unknown orgs
  const id = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  existingOrgs.set(normalized, id);
  return id;
}

export async function importCallings(
  parsedCallings: ParsedCalling[]
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  await db.transaction(
    "rw",
    [
      db.organizations,
      db.callingPositions,
      db.callings,
      db.members,
      db.importSessions,
    ],
    async () => {
      // Ensure default orgs exist
      const existingOrgs = await db.organizations.toArray();
      const orgNameMap = new Map<string, string>();
      for (const org of existingOrgs) {
        orgNameMap.set(normalizeOrgName(org.name), org.id);
      }

      if (existingOrgs.length === 0) {
        await db.organizations.bulkAdd(defaultOrganizations);
        for (const org of defaultOrganizations) {
          orgNameMap.set(normalizeOrgName(org.name), org.id);
        }
      }

      // Ensure default positions exist
      const existingPositions = await db.callingPositions.toArray();
      if (existingPositions.length === 0) {
        await db.callingPositions.bulkAdd(defaultPositions);
      }

      // Track existing members for matching
      const existingMembers = await db.members.toArray();
      const memberNameMap = new Map<string, string>();
      for (const m of existingMembers) {
        memberNameMap.set(m.fullName.toLowerCase(), m.id);
      }

      for (const parsed of parsedCallings) {
        try {
          // Find or create organization
          const orgId = findOrCreateOrgId(
            parsed.organizationName,
            orgNameMap
          );

          // Ensure org exists in DB
          const orgExists = await db.organizations.get(orgId);
          if (!orgExists) {
            const maxOrder = await db.organizations
              .orderBy("sortOrder")
              .last();
            await db.organizations.add({
              id: orgId,
              name: parsed.organizationName,
              sortOrder: (maxOrder?.sortOrder ?? 0) + 1,
            });
          }

          // Find or create position
          let positionId: string | undefined;
          const allPositions = await db.callingPositions
            .where("organizationId")
            .equals(orgId)
            .toArray();

          const matchingPosition = allPositions.find(
            (p) =>
              p.positionName.toLowerCase() ===
              parsed.positionName.toLowerCase()
          );

          if (matchingPosition) {
            positionId = matchingPosition.id;
          } else {
            positionId = generateId();
            const maxOrder = allPositions.reduce(
              (max, p) => Math.max(max, p.sortOrder),
              0
            );
            await db.callingPositions.add({
              id: positionId,
              organizationId: orgId,
              positionName: parsed.positionName,
              sortOrder: maxOrder + 1,
              isRequired: false,
              maxHolders: 1,
            });
          }

          // Find or create member
          let memberId: string | null = null;
          if (parsed.memberFullName || parsed.memberFirstName) {
            const fullName =
              parsed.memberFullName ||
              `${parsed.memberFirstName ?? ""} ${parsed.memberLastName ?? ""}`.trim();

            const existingId = memberNameMap.get(fullName.toLowerCase());
            if (existingId) {
              memberId = existingId;
            } else {
              memberId = generateId();
              const member = {
                id: memberId,
                firstName: parsed.memberFirstName || fullName.split(" ")[0] || "",
                lastName:
                  parsed.memberLastName ||
                  fullName.split(" ").slice(1).join(" ") ||
                  "",
                fullName,
              };
              await db.members.add(member);
              memberNameMap.set(fullName.toLowerCase(), memberId);
            }
          }

          // Check for existing callings for this position
          const existingCallings = await db.callings
            .where("positionId")
            .equals(positionId)
            .toArray();

          // Find an available slot: a vacant calling or one with matching member
          const matchingCalling = memberId
            ? existingCallings.find((c) => c.memberId === memberId)
            : null;
          const vacantCalling = existingCallings.find(
            (c) => c.status === "vacant"
          );
          const existingCalling = matchingCalling || vacantCalling;

          if (existingCalling) {
            // Update existing calling
            await db.callings.update(existingCalling.id, {
              memberId,
              activeDate: parsed.activeDate || existingCalling.activeDate,
              setApart: parsed.setApart ?? existingCalling.setApart,
              status: memberId ? "active" : "vacant",
            });
          } else {
            // Create new calling (additional slot for multi-holder positions)
            await db.callings.add({
              id: generateId(),
              positionId,
              memberId,
              activeDate: parsed.activeDate || null,
              setApart: parsed.setApart ?? false,
              status: memberId ? "active" : "vacant",
            });
          }

          imported++;
        } catch (e) {
          errors.push(
            `Error importing "${parsed.positionName}" in "${parsed.organizationName}": ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }

      // Record import session
      await db.importSessions.add({
        id: generateId(),
        importedAt: new Date().toISOString(),
        sourceType: "json",
        recordCount: imported,
      });
    }
  );

  return { imported, errors };
}

export async function importMembers(
  parsedMembers: ParsedMember[]
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  await db.transaction("rw", [db.members], async () => {
    const existingMembers = await db.members.toArray();
    const memberNameMap = new Map<string, string>();
    for (const m of existingMembers) {
      memberNameMap.set(m.fullName.toLowerCase(), m.id);
    }

    for (const parsed of parsedMembers) {
      try {
        const fullName = parsed.fullName || `${parsed.firstName} ${parsed.lastName}`.trim();
        const existingId = memberNameMap.get(fullName.toLowerCase());

        if (existingId) {
          // Update existing member with any new data
          const updates: Record<string, unknown> = {};
          if (parsed.gender) updates.gender = parsed.gender;
          if (parsed.age != null) updates.age = parsed.age;
          if (parsed.phone) updates.phone = parsed.phone;
          if (parsed.email) updates.email = parsed.email;
          if (Object.keys(updates).length > 0) {
            await db.members.update(existingId, updates);
            imported++;
          }
          continue;
        }

        const id = generateId();
        await db.members.add({
          id,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          fullName,
          gender: parsed.gender,
          age: parsed.age,
          email: parsed.email,
          phone: parsed.phone,
          priesthoodOffice: parsed.priesthoodOffice,
        });
        memberNameMap.set(fullName.toLowerCase(), id);
        imported++;
      } catch (e) {
        errors.push(
          `Error importing member "${parsed.fullName}": ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  });

  return { imported, errors };
}

export async function seedDefaultData(): Promise<void> {
  const orgCount = await db.organizations.count();
  if (orgCount === 0) {
    await db.organizations.bulkAdd(defaultOrganizations);
    await db.callingPositions.bulkAdd(defaultPositions);

    // Create vacant callings for all default positions
    for (const pos of defaultPositions) {
      await db.callings.add({
        id: generateId(),
        positionId: pos.id,
        memberId: null,
        activeDate: null,
        setApart: false,
        status: "vacant",
      });
    }
  }
}

export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.members,
      db.organizations,
      db.callingPositions,
      db.callings,
      db.proposedChanges,
      db.importSessions,
    ],
    async () => {
      await db.members.clear();
      await db.organizations.clear();
      await db.callingPositions.clear();
      await db.callings.clear();
      await db.proposedChanges.clear();
      await db.importSessions.clear();
    }
  );
}
