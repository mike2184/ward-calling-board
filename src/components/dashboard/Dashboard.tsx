import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/data/db";

interface OrgStats {
  name: string;
  filled: number;
  vacant: number;
  total: number;
}

export function Dashboard({ onClose }: { onClose: () => void }) {
  const stats = useLiveQuery(async () => {
    const [members, callings, positions, orgs, proposals] = await Promise.all([
      db.members.toArray(),
      db.callings.toArray(),
      db.callingPositions.toArray(),
      db.organizations.toArray(),
      db.proposedChanges
        .where("status")
        .anyOf(["draft", "pending_approval", "approved"])
        .toArray(),
    ]);

    const posMap = new Map(positions.map((p) => [p.id, p]));
    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    // Members with callings
    const memberIdsWithCallings = new Set(
      callings.filter((c) => c.memberId).map((c) => c.memberId!)
    );

    const unassigned = members.filter((m) => !memberIdsWithCallings.has(m.id));

    // Multi-calling members
    const callingCountByMember = new Map<string, number>();
    for (const c of callings) {
      if (c.memberId) {
        callingCountByMember.set(
          c.memberId,
          (callingCountByMember.get(c.memberId) ?? 0) + 1
        );
      }
    }
    const multiCalling = [...callingCountByMember.entries()].filter(
      ([, count]) => count > 1
    );

    // Per-org stats
    const orgStats: OrgStats[] = [];
    const orgCallings = new Map<string, { filled: number; vacant: number }>();

    for (const c of callings) {
      const pos = posMap.get(c.positionId);
      if (!pos) continue;
      const orgId = pos.organizationId;
      if (!orgCallings.has(orgId)) orgCallings.set(orgId, { filled: 0, vacant: 0 });
      const entry = orgCallings.get(orgId)!;
      if (c.status === "active") entry.filled++;
      else entry.vacant++;
    }

    for (const org of orgs.sort((a, b) => a.sortOrder - b.sortOrder)) {
      const entry = orgCallings.get(org.id);
      if (!entry) continue;
      orgStats.push({
        name: org.name,
        filled: entry.filled,
        vacant: entry.vacant,
        total: entry.filled + entry.vacant,
      });
    }

    const totalFilled = callings.filter((c) => c.status === "active").length;
    const totalVacant = callings.filter((c) => c.status === "vacant").length;

    // Longest serving
    const filledCallings = callings
      .filter((c) => c.memberId && c.activeDate)
      .map((c) => {
        const member = members.find((m) => m.id === c.memberId);
        const pos = posMap.get(c.positionId);
        const org = pos ? orgMap.get(pos.organizationId) : undefined;
        return {
          memberName: member?.fullName ?? "Unknown",
          positionName: pos?.positionName ?? "Unknown",
          orgName: org?.name ?? "",
          activeDate: c.activeDate!,
          daysServing: Math.floor(
            (Date.now() - new Date(c.activeDate!).getTime()) / (1000 * 60 * 60 * 24)
          ),
        };
      })
      .sort((a, b) => b.daysServing - a.daysServing);

    return {
      totalMembers: members.length,
      totalCallings: callings.length,
      totalFilled,
      totalVacant,
      unassignedCount: unassigned.length,
      multiCallingCount: multiCalling.length,
      pendingProposals: proposals.length,
      orgStats,
      longestServing: filledCallings,
      fillRate: callings.length > 0 ? Math.round((totalFilled / callings.length) * 100) : 0,
    };
  });

  const [longestServingCount, setLongestServingCount] = useState(10);

  if (!stats) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Callings" value={stats.totalCallings} />
            <StatCard label="Filled" value={stats.totalFilled} color="text-success" />
            <StatCard label="Vacant" value={stats.totalVacant} color="text-vacant" />
            <StatCard label="Fill Rate" value={`${stats.fillRate}%`} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Members" value={stats.totalMembers} />
            <StatCard label="No Calling" value={stats.unassignedCount} color="text-warning" />
            <StatCard label="Multi-Calling" value={stats.multiCallingCount} color="text-vacant" />
            <StatCard label="Pending Changes" value={stats.pendingProposals} color="text-primary" />
          </div>

          {/* Longest serving */}
          {stats.longestServing.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3">Longest Serving</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Member</th>
                      <th className="text-left px-3 py-2 font-medium">Calling</th>
                      <th className="text-left px-3 py-2 font-medium">Since</th>
                      <th className="text-right px-3 py-2 font-medium">Serving</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.longestServing.slice(0, longestServingCount).map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5">{item.memberName}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {item.positionName}
                          {item.orgName && (
                            <span className="text-xs"> ({item.orgName})</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {item.activeDate}
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium whitespace-nowrap">
                          {formatDuration(item.daysServing)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {stats.longestServing.length > longestServingCount && (
                <button
                  onClick={() => setLongestServingCount((c) => c + 10)}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Show more ({stats.longestServing.length - longestServingCount} remaining)
                </button>
              )}
              {longestServingCount > 10 && (
                <button
                  onClick={() => setLongestServingCount(10)}
                  className="mt-2 ml-3 text-xs text-muted-foreground hover:underline"
                >
                  Show less
                </button>
              )}
            </div>
          )}

          {/* Org breakdown */}
          <div>
            <h3 className="font-semibold text-sm mb-3">By Organization</h3>
            <div className="space-y-2">
              {stats.orgStats.map((org) => (
                <div key={org.name} className="flex items-center gap-3">
                  <div className="w-40 text-sm truncate">{org.name}</div>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="bg-success h-full transition-all"
                      style={{
                        width: org.total > 0 ? `${(org.filled / org.total) * 100}%` : "0%",
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground w-16 text-right">
                    {org.filled}/{org.total}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(totalDays: number): string {
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays % 30;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 || parts.length === 0) parts.push(`${days}d`);
  return parts.join(" ");
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${color ?? ""}`}>{value}</div>
    </div>
  );
}
