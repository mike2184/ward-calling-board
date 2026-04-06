import {
  useUnassignedMembers,
  useMultiCallingMembers,
  useMembersWithCallingInfo,
  type MemberWithCallingInfo,
} from "@/hooks/useMembers";
import { useState, useMemo } from "react";
import { DraggableMemberCard } from "./DraggableMemberCard";
import type { Member } from "@/types/models";

type AgeFilter = "all" | "children" | "youth" | "adults";
type GenderFilter = "all" | "M" | "F";
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

function MemberRow({ member, callingInfo }: { member: Member & { age?: number }; callingInfo?: string }) {
  return (
    <div className="text-sm py-1 px-2 rounded hover:bg-muted/50 cursor-default">
      <div className="flex items-center justify-between">
        <span>{member.fullName}</span>
        {member.age != null && (
          <span className="text-[10px] text-muted-foreground">{member.age}</span>
        )}
      </div>
      {callingInfo && (
        <div className="text-xs text-muted-foreground truncate">{callingInfo}</div>
      )}
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
  const [sortBy, setSortBy] = useState<SortOption>("age-asc");

  const unassigned = useUnassignedMembers();
  const multiCalling = useMultiCallingMembers();
  const allMembers = useMembersWithCallingInfo();

  const filteredUnassigned = useMemo(() => {
    if (!unassigned) return undefined;
    let result = unassigned.filter((m) => matchesAgeFilter(m, ageFilter) && matchesGenderFilter(m, genderFilter));
    return sortMembers(result, sortBy);
  }, [unassigned, ageFilter, genderFilter, sortBy]);

  const filteredMulti = useMemo(() => {
    if (!multiCalling) return undefined;
    let result = multiCalling.filter((m) => matchesAgeFilter(m, ageFilter) && matchesGenderFilter(m, genderFilter));
    return sortMembers(result, sortBy);
  }, [multiCalling, ageFilter, genderFilter, sortBy]);

  const filteredMembers = useMemo(() => {
    if (!allMembers) return undefined;
    let result: MemberWithCallingInfo[] = allMembers.filter((m) => matchesAgeFilter(m, ageFilter) && matchesGenderFilter(m, genderFilter));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => m.fullName.toLowerCase().includes(q));
    }
    return sortMembers(result, sortBy);
  }, [allMembers, ageFilter, genderFilter, sortBy, searchQuery]);

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
            <span className="text-muted-foreground text-xs">
              {filteredUnassigned?.length ?? 0}
            </span>
          </button>
          {expandedSection === "unassigned" && filteredUnassigned && (
            <div className="px-2 pb-2 space-y-0.5 overflow-auto flex-1">
              {filteredUnassigned.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2 italic">
                  {ageFilter === "all" ? "All members have callings" : "No matching members"}
                </p>
              ) : isBoardView ? (
                filteredUnassigned.map((m) => (
                  <DraggableMemberCard key={m.id} member={m} ageDisplay={m.age} />
                ))
              ) : (
                filteredUnassigned.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))
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
            <span className="text-muted-foreground text-xs">
              {filteredMulti?.length ?? 0}
            </span>
          </button>
          {expandedSection === "multi" && filteredMulti && (
            <div className="px-2 pb-2 space-y-0.5 overflow-auto flex-1">
              {filteredMulti.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2 italic">
                  {ageFilter === "all" ? "No members with multiple callings" : "No matching members"}
                </p>
              ) : (
                filteredMulti.map((m) => (
                  <div
                    key={m.id}
                    className="text-sm py-1 px-2 rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <span>{m.fullName}</span>
                      <div className="flex items-center gap-1.5">
                        {m.age != null && (
                          <span className="text-[10px] text-muted-foreground">{m.age}</span>
                        )}
                        <span className="text-xs bg-vacant/10 text-vacant px-1.5 py-0.5 rounded-full">
                          {m.callingCount}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.callingNames.join(", ")}
                    </div>
                  </div>
                ))
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
                      callingInfo={
                        m.callingCount === 1
                          ? m.callingNames[0]
                          : m.callingCount > 1
                            ? `${m.callingCount} callings`
                            : undefined
                      }
                    />
                  ) : (
                    <MemberRow key={m.id} member={m} callingInfo={
                      m.callingCount === 1
                        ? m.callingNames[0]
                        : m.callingCount > 1
                          ? `${m.callingCount} callings`
                          : undefined
                    } />
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
