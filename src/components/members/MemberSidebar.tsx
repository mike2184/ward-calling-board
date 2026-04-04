import {
  useUnassignedMembers,
  useMultiCallingMembers,
  useMembersWithCallingInfo,
} from "@/hooks/useMembers";
import { useState } from "react";

export function MemberSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "unassigned"
  );

  const unassigned = useUnassignedMembers();
  const multiCalling = useMultiCallingMembers();
  const allMembers = useMembersWithCallingInfo();

  const filteredMembers = searchQuery
    ? allMembers?.filter((m) =>
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allMembers;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="w-64 flex-shrink-0 border-l bg-muted/20 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Members</h3>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Unassigned Members */}
        <div className="border-b">
          <button
            onClick={() => toggleSection("unassigned")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning" />
              No Calling
            </span>
            <span className="text-muted-foreground text-xs">
              {unassigned?.length ?? 0}
            </span>
          </button>
          {expandedSection === "unassigned" && unassigned && (
            <div className="px-4 pb-2 space-y-0.5">
              {unassigned.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">
                  All members have callings
                </p>
              ) : (
                unassigned.map((m) => (
                  <div
                    key={m.id}
                    className="text-sm py-1 px-2 rounded hover:bg-muted/50 cursor-default"
                  >
                    {m.fullName}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Multi-Calling Members */}
        <div className="border-b">
          <button
            onClick={() => toggleSection("multi")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-vacant" />
              Multiple Callings
            </span>
            <span className="text-muted-foreground text-xs">
              {multiCalling?.length ?? 0}
            </span>
          </button>
          {expandedSection === "multi" && multiCalling && (
            <div className="px-4 pb-2 space-y-0.5">
              {multiCalling.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">
                  No members with multiple callings
                </p>
              ) : (
                multiCalling.map((m) => (
                  <div
                    key={m.id}
                    className="text-sm py-1 px-2 rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <span>{m.fullName}</span>
                      <span className="text-xs bg-vacant/10 text-vacant px-1.5 py-0.5 rounded-full">
                        {m.callingCount}
                      </span>
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
        <div>
          <button
            onClick={() => toggleSection("all")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <span>All Members</span>
            <span className="text-muted-foreground text-xs">
              {allMembers?.length ?? 0}
            </span>
          </button>
          {expandedSection === "all" && (
            <div className="px-4 pb-2">
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded mb-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="space-y-0.5 max-h-60 overflow-auto">
                {filteredMembers?.map((m) => (
                  <div
                    key={m.id}
                    className="text-sm py-1 px-2 rounded hover:bg-muted/50 flex items-center justify-between"
                  >
                    <span>{m.fullName}</span>
                    {m.callingCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {m.callingCount === 1
                          ? m.callingNames[0]
                          : `${m.callingCount} callings`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
