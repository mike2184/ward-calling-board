import {
  useMembersWithCallingInfo,
  updateMemberActivityStatus,
  type MemberWithCallingInfo,
} from "@/hooks/useMembers";
import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { DraggableMemberCard } from "./DraggableMemberCard";
import type { Member, ActivityStatus } from "@/types/models";

type AgeFilter = "all" | "children" | "youth" | "adults";
type GenderFilter = "all" | "M" | "F";
type ActivityFilter = "all" | "active" | "less-active" | "inactive" | "serving-away";
type SortOption = "name" | "age-asc" | "age-desc";

interface Props {
  isBoardView: boolean;
}

function ageFilterLabel(filter: AgeFilter): string {
  if (filter === "children") return "0-10";
  if (filter === "youth") return "11-17";
  if (filter === "adults") return "18+";
  return "All";
}

function matchesGenderFilter(member: { gender?: "M" | "F" }, filter: GenderFilter): boolean {
  if (filter === "all") return true;
  return member.gender === filter;
}

function matchesActivityFilter(member: { activityStatus?: ActivityStatus }, filter: ActivityFilter): boolean {
  if (filter === "all") return true;
  const status = member.activityStatus ?? "active";
  return status === filter;
}

function matchesAgeFilter(member: { age?: number }, filter: AgeFilter): boolean {
  if (filter === "all") return true;
  const age = member.age;
  if (age == null) return filter === "adults"; // unknown age treated as adult
  if (filter === "children") return age <= 10;
  if (filter === "youth") return age >= 11 && age <= 17;
  if (filter === "adults") return age >= 18;
  return true;
}

function sortMembers<T extends { fullName: string; lastName: string; age?: number }>(
  members: T[],
  sort: SortOption
): T[] {
  const sorted = [...members];
  if (sort === "age-asc") {
    sorted.sort((a, b) => (a.age ?? 999) - (b.age ?? 999));
  } else if (sort === "age-desc") {
    sorted.sort((a, b) => (b.age ?? -1) - (a.age ?? -1));
  } else {
    sorted.sort((a, b) => a.lastName.localeCompare(b.lastName));
  }
  return sorted;
}

const ACTIVITY_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  "less-active": "bg-yellow-500",
  inactive: "bg-red-500",
  "serving-away": "bg-blue-500",
};

const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  "less-active": "Less Active",
  inactive: "Inactive",
  "serving-away": "Serving Away",
};

function ActivityStatusDot({ member }: { member: Member }) {
  const [open, setOpen] = useState(false);
  const dotRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = member.activityStatus ?? "active";
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        dotRef.current && !dotRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && dotRef.current) {
      const rect = dotRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(!open);
  };

  return (
    <>
      <button
        ref={dotRef}
        onClick={handleClick}
        className={`w-2 h-2 rounded-full ${ACTIVITY_STATUS_COLORS[status]} hover:ring-2 hover:ring-ring transition-all flex-shrink-0`}
        title={`Activity: ${ACTIVITY_STATUS_LABELS[status]}`}
      />
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] bg-popover border rounded-md shadow-md py-1 min-w-[120px]"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {(["active", "less-active", "inactive", "serving-away"] as ActivityStatus[]).map((s) => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                updateMemberActivityStatus(member.id, s === "active" ? undefined : s);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1 text-xs hover:bg-muted flex items-center gap-2 ${
                status === s ? "font-semibold" : ""
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${ACTIVITY_STATUS_COLORS[s]}`} />
              {ACTIVITY_STATUS_LABELS[s]}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function CallingCountPill({ count, callingNames }: { count: number; callingNames: string[] }) {
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        pillRef.current && !pillRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      // Position to the left of the pill, aligned with the top
      setPos({ top: rect.top, left: rect.left - 4 });
    }
    setOpen(!open);
  };

  if (count === 0) return null;

  return (
    <>
      <button
        ref={pillRef}
        onClick={handleClick}
        className="text-[11px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full min-w-[20px] text-center hover:bg-primary/20 transition-colors flex-shrink-0"
        title={`${count} calling${count !== 1 ? "s" : ""}`}
      >
        {count}
      </button>
      {open && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[9999] bg-popover border rounded-md shadow-lg py-2 px-3 max-w-[220px]"
          style={{ top: pos.top + 28, left: Math.max(8, pos.left - 180) }}
        >
          <div className="text-xs font-medium text-muted-foreground mb-1">
            {count} Calling{count !== 1 ? "s" : ""}
          </div>
          <ul className="space-y-1">
            {callingNames.map((name, i) => (
              <li key={i} className="text-xs text-foreground">{name}</li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}

function MemberRow({ member, callingCount, callingNames, projected, projectedCallingCount }: {
  member: Member & { age?: number };
  callingCount?: number;
  callingNames?: string[];
  projected?: boolean;
  /** When set, shows the projected count change (e.g. "2→3") */
  projectedCallingCount?: number;
}) {
  const hasProjectedChange = projectedCallingCount != null && projectedCallingCount !== callingCount;
  return (
    <div className={`text-sm py-1 px-2 rounded cursor-default ${
      projected
        ? "bg-warning/8 border border-dashed border-warning/40 hover:bg-warning/15"
        : "hover:bg-muted/50"
    }`}>
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <ActivityStatusDot member={member} />
          <span className={`truncate ${projected ? "italic" : ""}`}>{member.fullName}</span>
          {projected && (
            <span className="text-[9px] text-warning font-medium flex-shrink-0">PROJ</span>
          )}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {member.age != null && (
            <span className="text-[10px] text-muted-foreground">{member.age}</span>
          )}
          {callingCount != null && callingCount > 0 && callingNames && (
            <CallingCountPill count={callingCount} callingNames={callingNames} />
          )}
          {hasProjectedChange && (
            <span className="text-[10px] text-warning font-medium" title={`Projected: ${projectedCallingCount} callings`}>
              →{projectedCallingCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MemberSidebar({ isBoardView }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "unassigned"
  );
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("adults");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("age-asc");

  const allMembers = useMembersWithCallingInfo();

  const matchesFilters = (m: { age?: number; gender?: "M" | "F"; activityStatus?: ActivityStatus }) =>
    matchesAgeFilter(m, ageFilter) && matchesGenderFilter(m, genderFilter) && matchesActivityFilter(m, activityFilter);

  // Derive all member groups from the single allMembers query (which includes projected counts)
  const { currentUnassigned, projectedUnassigned, currentMulti, projectedMulti } = useMemo(() => {
    if (!allMembers) return { currentUnassigned: [] as MemberWithCallingInfo[], projectedUnassigned: [] as MemberWithCallingInfo[], currentMulti: [] as MemberWithCallingInfo[], projectedMulti: [] as MemberWithCallingInfo[] };

    const currentUnassigned: MemberWithCallingInfo[] = [];
    const projectedUnassigned: MemberWithCallingInfo[] = [];
    const currentMulti: MemberWithCallingInfo[] = [];
    const projectedMulti: MemberWithCallingInfo[] = [];

    for (const m of allMembers) {
      const hasChange = m.projectedCallingCount !== m.callingCount;

      if (m.callingCount === 0) {
        // Currently unassigned
        currentUnassigned.push(m);
      } else if (hasChange && m.projectedCallingCount === 0) {
        // Would become unassigned after proposals
        projectedUnassigned.push(m);
      }

      if (m.callingCount >= 2) {
        // Currently has multiple callings
        currentMulti.push(m);
      } else if (hasChange && m.projectedCallingCount >= 2) {
        // Would have multiple callings after proposals
        projectedMulti.push(m);
      }
    }

    return { currentUnassigned, projectedUnassigned, currentMulti, projectedMulti };
  }, [allMembers]);

  const filteredUnassigned = useMemo(() => {
    return sortMembers(currentUnassigned.filter(matchesFilters), sortBy);
  }, [currentUnassigned, ageFilter, genderFilter, activityFilter, sortBy]);

  const filteredProjectedUnassigned = useMemo(() => {
    return sortMembers(projectedUnassigned.filter(matchesFilters), sortBy);
  }, [projectedUnassigned, ageFilter, genderFilter, activityFilter, sortBy]);

  const filteredMulti = useMemo(() => {
    return sortMembers(currentMulti.filter(matchesFilters), sortBy);
  }, [currentMulti, ageFilter, genderFilter, activityFilter, sortBy]);

  const filteredProjectedMulti = useMemo(() => {
    return sortMembers(projectedMulti.filter(matchesFilters), sortBy);
  }, [projectedMulti, ageFilter, genderFilter, activityFilter, sortBy]);

  const filteredMembers = useMemo(() => {
    if (!allMembers) return undefined;
    let result: MemberWithCallingInfo[] = allMembers.filter(matchesFilters);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => m.fullName.toLowerCase().includes(q));
    }
    return sortMembers(result, sortBy);
  }, [allMembers, ageFilter, genderFilter, activityFilter, sortBy, searchQuery]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="w-72 flex-shrink-0 border-r bg-muted/20 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Members</h3>
        {isBoardView && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag onto vacant slots
          </p>
        )}
      </div>

      {/* Filter & Sort controls */}
      <div className="px-3 py-2 border-b space-y-1.5 flex-shrink-0">
        <div className="flex gap-1">
          {(["all", "children", "youth", "adults"] as AgeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setAgeFilter(f)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-full transition-colors ${
                ageFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {ageFilterLabel(f)}
            </button>
          ))}
          <span className="w-px bg-border mx-0.5" />
          {(["all", "M", "F"] as GenderFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setGenderFilter(f)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-full transition-colors ${
                genderFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f === "all" ? "A" : f}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "active", "less-active", "inactive", "serving-away"] as ActivityFilter[]).map((f) => {
            const label = { all: "All", active: "A", "less-active": "LA", inactive: "IA", "serving-away": "SA" }[f];
            return (
              <button
                key={f}
                onClick={() => setActivityFilter(f)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-full transition-colors flex items-center gap-1 ${
                  activityFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f !== "all" && (
                  <span className={`w-1.5 h-1.5 rounded-full ${ACTIVITY_STATUS_COLORS[f]}`} />
                )}
                {label}
              </button>
            );
          })}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="w-full text-xs border rounded px-1.5 py-1 bg-background text-foreground"
        >
          <option value="name">Sort by Name</option>
          <option value="age-asc">Sort by Age (youngest)</option>
          <option value="age-desc">Sort by Age (oldest)</option>
        </select>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Unassigned Members */}
        <div className={`border-b ${expandedSection === "unassigned" ? "flex-1 flex flex-col overflow-hidden" : ""}`}>
          <button
            onClick={() => toggleSection("unassigned")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors flex-shrink-0"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning" />
              No Calling
            </span>
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              {filteredUnassigned.length}
              {filteredProjectedUnassigned.length > 0 && (
                <span className="text-warning italic">+{filteredProjectedUnassigned.length}</span>
              )}
            </span>
          </button>
          {expandedSection === "unassigned" && (
            <div className="px-2 pb-2 space-y-0.5 overflow-auto flex-1">
              {filteredUnassigned.length === 0 && filteredProjectedUnassigned.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2 italic">
                  {ageFilter === "all" ? "All members have callings" : "No matching members"}
                </p>
              ) : (
                <>
                  {isBoardView ? (
                    filteredUnassigned.map((m) => (
                      <DraggableMemberCard key={m.id} member={m} ageDisplay={m.age} />
                    ))
                  ) : (
                    filteredUnassigned.map((m) => (
                      <MemberRow key={m.id} member={m} />
                    ))
                  )}
                  {filteredProjectedUnassigned.length > 0 && (
                    <>
                      {filteredUnassigned.length > 0 && (
                        <div className="text-[10px] text-warning font-medium px-2 pt-2 pb-0.5 uppercase tracking-wide">
                          After proposed changes
                        </div>
                      )}
                      {isBoardView ? (
                        filteredProjectedUnassigned.map((m) => (
                          <DraggableMemberCard key={m.id} member={m} ageDisplay={m.age} projected />
                        ))
                      ) : (
                        filteredProjectedUnassigned.map((m) => (
                          <MemberRow key={m.id} member={m} projected />
                        ))
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Multi-Calling Members */}
        <div className={`border-b ${expandedSection === "multi" ? "flex-1 flex flex-col overflow-hidden" : ""}`}>
          <button
            onClick={() => toggleSection("multi")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors flex-shrink-0"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-vacant" />
              Multiple Callings
            </span>
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              {filteredMulti.length}
              {filteredProjectedMulti.length > 0 && (
                <span className="text-warning italic">+{filteredProjectedMulti.length}</span>
              )}
            </span>
          </button>
          {expandedSection === "multi" && (
            <div className="px-2 pb-2 space-y-0.5 overflow-auto flex-1">
              {filteredMulti.length === 0 && filteredProjectedMulti.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2 italic">
                  {ageFilter === "all" ? "No members with multiple callings" : "No matching members"}
                </p>
              ) : (
                <>
                  {filteredMulti.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      callingCount={m.callingCount}
                      callingNames={m.callingNames}
                      projectedCallingCount={m.projectedCallingCount !== m.callingCount ? m.projectedCallingCount : undefined}
                    />
                  ))}
                  {filteredProjectedMulti.length > 0 && (
                    <>
                      {filteredMulti.length > 0 && (
                        <div className="text-[10px] text-warning font-medium px-2 pt-2 pb-0.5 uppercase tracking-wide">
                          After proposed changes
                        </div>
                      )}
                      {filteredProjectedMulti.map((m) => (
                        <MemberRow
                          key={m.id}
                          member={m}
                          callingCount={m.callingCount}
                          callingNames={m.callingNames}
                          projected
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* All Members */}
        <div className={`${expandedSection === "all" ? "flex-1 flex flex-col overflow-hidden" : ""}`}>
          <button
            onClick={() => toggleSection("all")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors flex-shrink-0"
          >
            <span>All Members</span>
            <span className="text-muted-foreground text-xs">
              {filteredMembers?.length ?? 0}
            </span>
          </button>
          {expandedSection === "all" && (
            <div className="px-2 pb-2 flex flex-col flex-1 overflow-hidden">
              <div className="relative mt-1 mb-2 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2 py-1 pr-7 text-sm border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="space-y-0.5 overflow-auto flex-1">
                {filteredMembers?.map((m) =>
                  isBoardView ? (
                    <DraggableMemberCard
                      key={m.id}
                      member={m}
                      ageDisplay={m.age}
                      callingCount={m.callingCount}
                      callingNames={m.callingNames}
                    />
                  ) : (
                    <MemberRow
                      key={m.id}
                      member={m}
                      callingCount={m.callingCount}
                      callingNames={m.callingNames}
                    />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
