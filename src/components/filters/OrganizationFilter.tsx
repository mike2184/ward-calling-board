import { useOrganizationsWithCounts } from "@/hooks/useCallings";

interface Props {
  selected: string | null;
  onSelect: (orgId: string | null) => void;
  showVacantOnly: boolean;
  onToggleVacant: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function OrganizationFilter({
  selected,
  onSelect,
  showVacantOnly,
  onToggleVacant,
  searchQuery,
  onSearchChange,
}: Props) {
  const orgsWithCounts = useOrganizationsWithCounts();

  return (
    <div className="space-y-3">
      {/* Organization pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect(null)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
            selected === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All Organizations
        </button>
        {orgsWithCounts?.map((org) => (
          <button
            key={org.id}
            onClick={() => onSelect(org.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors inline-flex items-center gap-1.5 ${
              selected === org.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {org.name}
            {org.vacant > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  selected === org.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-vacant/10 text-vacant"
                }`}
              >
                {org.vacant}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search and vacant filter */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search callings or members..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 max-w-sm px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showVacantOnly}
            onChange={onToggleVacant}
            className="rounded"
          />
          Show vacant only
        </label>
      </div>
    </div>
  );
}
