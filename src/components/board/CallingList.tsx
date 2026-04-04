import { useCallings, type CallingWithDetails } from "@/hooks/useCallings";
import { formatServingDurationShort } from "@/utils/time";

interface Props {
  organizationFilter: string | null;
  showVacantOnly: boolean;
  searchQuery: string;
}

function CallingRow({ item }: { item: CallingWithDetails }) {
  const isVacant = item.calling.status === "vacant";

  return (
    <tr className={`border-t hover:bg-muted/30 transition-colors ${isVacant ? "bg-vacant/5" : ""}`}>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isVacant ? "bg-vacant" : "bg-success"
            }`}
          />
          {item.organization.name}
        </div>
      </td>
      <td className="px-3 py-2.5 font-medium">{item.position.positionName}</td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        {item.member ? (
          item.member.fullName
        ) : (
          <span className="text-vacant italic">Vacant</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
        {isVacant ? "—" : formatServingDurationShort(item.calling.activeDate)}
      </td>
    </tr>
  );
}

export function CallingList({
  organizationFilter,
  showVacantOnly,
  searchQuery,
}: Props) {
  const callings = useCallings(organizationFilter ?? undefined);

  if (!callings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading callings...
      </div>
    );
  }

  let filtered = callings;

  if (showVacantOnly) {
    filtered = filtered.filter((c) => c.calling.status === "vacant");
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.position.positionName.toLowerCase().includes(q) ||
        c.organization.name.toLowerCase().includes(q) ||
        c.member?.fullName.toLowerCase().includes(q)
    );
  }

  // Group by organization
  const grouped = new Map<string, CallingWithDetails[]>();
  for (const item of filtered) {
    const orgName = item.organization.name;
    if (!grouped.has(orgName)) {
      grouped.set(orgName, []);
    }
    grouped.get(orgName)!.push(item);
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {callings.length === 0
            ? "No callings yet. Import data to get started."
            : "No callings match your filters."}
        </p>
      </div>
    );
  }

  const vacantCount = callings.filter(
    (c) => c.calling.status === "vacant"
  ).length;
  const filledCount = callings.filter(
    (c) => c.calling.status === "active"
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex items-center gap-6 text-sm">
        <span className="text-muted-foreground">
          Total: <strong className="text-foreground">{callings.length}</strong>
        </span>
        <span className="text-muted-foreground">
          Filled:{" "}
          <strong className="text-success">{filledCount}</strong>
        </span>
        <span className="text-muted-foreground">
          Vacant:{" "}
          <strong className="text-vacant">{vacantCount}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium">
                Organization
              </th>
              <th className="text-left px-3 py-2.5 font-medium">
                Position
              </th>
              <th className="text-left px-3 py-2.5 font-medium">
                Member
              </th>
              <th className="text-left px-3 py-2.5 font-medium">
                Serving
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from(grouped.entries()).map(([, items]) => (
              items.map((item) => (
                <CallingRow key={item.calling.id} item={item} />
              ))
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
