import {
  useUnassignedMembers,
  useMultiCallingMembers,
  useMembersWithCallingInfo,
} from "@/hooks/useMembers";
import { useState } from "react";
import { DraggableMemberCard } from "./DraggableMemberCard";

interface Props {
  isBoardView: boolean;
}

export function MemberSidebar({ isBoardView }: Props) {
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
        {isBoardView && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag onto vacant slots
          </p>
        )}
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
              {unassigned?.length ?? 0}
            </span>
          </button>
          {expandedSection === "unassigned" && unassigned && (
            <div className="px-2 pb-2 space-y-0.5 overflow-auto flex-1">
              {unassigned.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2 italic">
                  All members have callings
                </p>
              ) : isBoardView ? (
                unassigned.map((m) => (
                  <DraggableMemberCard key={m.id} member={m} />
                ))
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
              {multiCalling?.length ?? 0}
            </span>
          </button>
          {expandedSection === "multi" && multiCalling && (
            <div className="px-2 pb-2 space-y-0.5 overflow-auto flex-1">
              {multiCalling.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 px-2 italic">
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
        <div className={`${expandedSection === "all" ? "flex-1 flex flex-col overflow-hidden" : ""}`}>
          <button
            onClick={() => toggleSection("all")}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors flex-shrink-0"
          >
            <span>All Members</span>
            <span className="text-muted-foreground text-xs">
              {allMembers?.length ?? 0}
            </span>
          </button>
          {expandedSection === "all" && (
            <div className="px-2 pb-2 flex flex-col flex-1 overflow-hidden">
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded mb-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring flex-shrink-0"
              />
              <div className="space-y-0.5 overflow-auto flex-1">
                {filteredMembers?.map((m) =>
                  isBoardView ? (
                    <DraggableMemberCard
                      key={m.id}
                      member={m}
                      callingInfo={
                        m.callingCount === 1
                          ? m.callingNames[0]
                          : m.callingCount > 1
                            ? `${m.callingCount} callings`
                            : undefined
                      }
                    />
                  ) : (
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
