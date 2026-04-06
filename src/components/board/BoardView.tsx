import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { OrganizationColumn } from "./OrganizationColumn";
import { CallingCard } from "./CallingCard";
import { DraggableMemberCard } from "../members/DraggableMemberCard";
import { MemberSidebar } from "../members/MemberSidebar";
import {
  useCallings,
  type CallingWithDetails,
} from "@/hooks/useCallings";
import {
  createAssignProposal,
  createReleaseProposal,
  createMoveProposal,
  useProposalsByCallingId,
  type CallingProposal,
} from "@/hooks/useProposals";
import type { Member } from "@/types/models";

interface PendingDrop {
  memberId: string;
  memberName: string;
  targetCallingId: string;
  targetPositionName: string;
  sourceCallingId?: string;
  sourcePositionName?: string;
  /** The member currently in the target slot, if replacing */
  replacingMemberId?: string;
  replacingMemberName?: string;
}

interface Props {
  organizationFilter: Set<string>;
  showVacantOnly: boolean;
  showProposedOnly: boolean;
  searchQuery: string;
}

type DragItem =
  | { type: "calling"; calling: CallingWithDetails }
  | { type: "member"; member: Member };

export function BoardView({
  organizationFilter,
  showVacantOnly,
  showProposedOnly,
  searchQuery,
}: Props) {
  const callings = useCallings(organizationFilter.size > 0 ? organizationFilter : undefined);
  const proposalMap = useProposalsByCallingId();
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [activeDropId, setActiveDropId] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

  // Synced horizontal scrollbar refs
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [availableHeight, setAvailableHeight] = useState(0);
  const syncing = useRef(false);
  const observerRef = useRef<ResizeObserver | null>(null);
  const contentHeightObserverRef = useRef<ResizeObserver | null>(null);

  // Track available height of the scroll container
  const contentContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (contentHeightObserverRef.current) {
      contentHeightObserverRef.current.disconnect();
      contentHeightObserverRef.current = null;
    }
    // Also set contentRef
    (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setAvailableHeight(entry.contentRect.height);
        }
      });
      observer.observe(node);
      contentHeightObserverRef.current = observer;
      setAvailableHeight(node.clientHeight);
    }
  }, []);

  const syncScroll = useCallback((source: "content" | "scrollbar") => {
    if (syncing.current) return;
    syncing.current = true;
    const from = source === "content" ? contentRef.current : scrollbarRef.current;
    const to = source === "content" ? scrollbarRef.current : contentRef.current;
    if (from && to) {
      to.scrollLeft = from.scrollLeft;
    }
    syncing.current = false;
  }, []);

  // Callback ref to observe the inner content div's width
  const innerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentWidth(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
      // Set initial width
      setContentWidth(node.getBoundingClientRect().width);
    }
  }, []);

  // Clean up observers on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      contentHeightObserverRef.current?.disconnect();
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const grouped = useMemo(() => {
    if (!callings) return new Map<string, CallingWithDetails[]>();

    let filtered = callings;
    if (showVacantOnly) {
      filtered = filtered.filter((c) => c.calling.status === "vacant");
    }
    if (showProposedOnly) {
      filtered = filtered.filter((c) => {
        const proposals = proposalMap.get(c.calling.id);
        return proposals && proposals.length > 0;
      });
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

    const map = new Map<string, CallingWithDetails[]>();
    for (const item of filtered) {
      const key = item.organization.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [callings, showVacantOnly, showProposedOnly, searchQuery, proposalMap]);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "calling") {
      setActiveItem({ type: "calling", calling: data.calling });
    } else if (data?.type === "member") {
      setActiveItem({ type: "member", member: data.member });
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over?.id?.toString();
    const overData = event.over?.data.current;
    if (overId?.startsWith("vacant-")) {
      setActiveDropId(overId.replace("vacant-", ""));
    } else if (overId?.startsWith("filled-")) {
      // Don't highlight if dragging onto yourself
      const targetId = overId.replace("filled-", "");
      const activeData = event.active.data.current;
      if (activeData?.type === "calling" && activeData.calling.calling.id === targetId) {
        setActiveDropId(null);
      } else {
        setActiveDropId(targetId);
      }
    } else if (overData?.type === "calling") {
      // Sortable node hit directly — treat as filled slot
      const targetId = overData.calling.calling.id;
      const activeData = event.active.data.current;
      if (activeData?.type === "calling" && activeData.calling.calling.id === targetId) {
        setActiveDropId(null);
      } else {
        setActiveDropId(targetId);
      }
    } else {
      setActiveDropId(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    setActiveDropId(null);

    const { active, over } = event;
    if (!over) return;

    const overData = over.data.current;
    const activeData = active.data.current;
    const isVacantTarget = overData?.type === "vacant-slot";
    const isFilledTarget = overData?.type === "filled-slot" || overData?.type === "calling";

    if (!isVacantTarget && !isFilledTarget) return;

    const targetCalling: CallingWithDetails = overData!.calling;

    const targetProposals = proposalMap?.get(targetCalling.calling.id);
    const hasReleaseProposal = targetProposals?.some((p) => p.type === "release") ?? false;

    // Member from sidebar dropped onto a slot
    if (activeData?.type === "member") {
      const member: Member = activeData.member;

      if (isFilledTarget && !hasReleaseProposal) {
        // Dropping onto a filled slot without existing release: propose release + assign
        await createReleaseProposal(
          targetCalling.calling.id,
          targetCalling.calling.memberId!
        );
      }
      // If there's already a release proposal, just add the assign
      await createAssignProposal(
        targetCalling.calling.id,
        member.id,
        null
      );
      return;
    }

    // Calling card dragged onto a slot
    if (activeData?.type === "calling") {
      const sourceCalling: CallingWithDetails = activeData.calling;
      if (sourceCalling.calling.id === targetCalling.calling.id) return;
      if (!sourceCalling.calling.memberId) return;

      const drop: PendingDrop = {
        memberId: sourceCalling.calling.memberId,
        memberName: sourceCalling.member?.fullName ?? "Unknown",
        targetCallingId: targetCalling.calling.id,
        targetPositionName: `${targetCalling.position.positionName} (${targetCalling.organization.name})`,
        sourceCallingId: sourceCalling.calling.id,
        sourcePositionName: `${sourceCalling.position.positionName} (${sourceCalling.organization.name})`,
      };

      if (isFilledTarget && targetCalling.calling.memberId && !hasReleaseProposal) {
        drop.replacingMemberId = targetCalling.calling.memberId;
        drop.replacingMemberName = targetCalling.member?.fullName ?? "Unknown";
      }

      setPendingDrop(drop);
    }
  }

  async function handleDropConfirm(action: "move" | "assign") {
    if (!pendingDrop) return;

    // If replacing someone in target, propose their release first
    if (pendingDrop.replacingMemberId) {
      await createReleaseProposal(
        pendingDrop.targetCallingId,
        pendingDrop.replacingMemberId
      );
    }

    if (action === "move" && pendingDrop.sourceCallingId) {
      await createMoveProposal(
        pendingDrop.sourceCallingId,
        pendingDrop.targetCallingId,
        pendingDrop.memberId
      );
    } else {
      // Assign only — keep old calling
      await createAssignProposal(
        pendingDrop.targetCallingId,
        pendingDrop.memberId,
        null
      );
    }

    setPendingDrop(null);
  }

  const vacantCount = callings?.filter(
    (c) => c.calling.status === "vacant"
  ).length ?? 0;
  const filledCount = callings?.filter(
    (c) => c.calling.status === "active"
  ).length ?? 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Board area */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {!callings ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : grouped.size === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {callings.length === 0
                ? "No callings yet. Import data to get started."
                : "No callings match your filters."}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-6 text-sm px-6 pt-6 pb-3 flex-shrink-0">
                <span className="text-muted-foreground">
                  Total:{" "}
                  <strong className="text-foreground">
                    {callings.length}
                  </strong>
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

              {/* Horizontal scroll area — columns expand horizontally */}
              <div
                ref={contentContainerRef}
                className="flex-1 overflow-y-hidden overflow-x-auto scrollbar-hide-x px-6"
                onScroll={() => syncScroll("content")}
              >
                <div ref={innerRef} className="flex gap-3 w-max h-full items-start pb-4">
                  {Array.from(grouped.entries()).map(([orgId, items]) => (
                    <OrganizationColumn
                      key={orgId}
                      orgName={items[0]!.organization.name}
                      callings={items}
                      activeDropId={activeDropId}
                      proposalMap={proposalMap}
                      maxHeight={availableHeight}
                    />
                  ))}
                </div>
              </div>

              {/* Pinned horizontal scrollbar */}
              <div
                ref={scrollbarRef}
                className="overflow-x-auto overflow-y-hidden flex-shrink-0 px-6"
                onScroll={() => syncScroll("scrollbar")}
              >
                <div style={{ width: contentWidth, height: 1 }} />
              </div>
            </>
          )}
        </main>

        {/* Sidebar */}
        <MemberSidebar isBoardView />
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeItem?.type === "calling" && (
          <CallingCard item={activeItem.calling} isDragOverlay />
        )}
        {activeItem?.type === "member" && (
          <DraggableMemberCard
            member={activeItem.member}
            isDragOverlay
          />
        )}
      </DragOverlay>

      {/* Drop confirmation dialog */}
      {pendingDrop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl p-6 max-w-md">
            <h3 className="font-semibold mb-3">
              Assign {pendingDrop.memberName}
            </h3>
            <p className="text-sm text-muted-foreground mb-1">
              To: <strong className="text-foreground">{pendingDrop.targetPositionName}</strong>
            </p>
            {pendingDrop.sourcePositionName && (
              <p className="text-sm text-muted-foreground mb-1">
                From: <strong className="text-foreground">{pendingDrop.sourcePositionName}</strong>
              </p>
            )}
            {pendingDrop.replacingMemberName && (
              <p className="text-sm text-warning mt-2">
                This will also propose releasing {pendingDrop.replacingMemberName} from the target position.
              </p>
            )}
            <div className="flex flex-col gap-2 mt-4">
              {pendingDrop.sourceCallingId && (
                <button
                  onClick={() => handleDropConfirm("move")}
                  className="w-full px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Move (release from {pendingDrop.sourcePositionName?.split(" (")[0]})
                </button>
              )}
              <button
                onClick={() => handleDropConfirm("assign")}
                className="w-full px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
              >
                Assign Only (keep current calling)
              </button>
              <button
                onClick={() => setPendingDrop(null)}
                className="w-full px-4 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
