import { useState, useMemo } from "react";
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
import { db } from "@/data/db";
import type { Member } from "@/types/models";

interface Props {
  organizationFilter: string | null;
  showVacantOnly: boolean;
  searchQuery: string;
}

type DragItem =
  | { type: "calling"; calling: CallingWithDetails }
  | { type: "member"; member: Member };

export function BoardView({
  organizationFilter,
  showVacantOnly,
  searchQuery,
}: Props) {
  const callings = useCallings(organizationFilter ?? undefined);
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [activeDropId, setActiveDropId] = useState<string | null>(null);

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
  }, [callings, showVacantOnly, searchQuery]);

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
    if (overId?.startsWith("vacant-")) {
      setActiveDropId(overId.replace("vacant-", ""));
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

    // Member dropped on vacant slot
    if (
      active.data.current?.type === "member" &&
      overData?.type === "vacant-slot"
    ) {
      const member: Member = active.data.current.member;
      const targetCalling: CallingWithDetails = overData.calling;

      await db.callings.update(targetCalling.calling.id, {
        memberId: member.id,
        activeDate: new Date().toISOString().split("T")[0],
        status: "active",
        setApart: false,
      });
    }

    // Calling card dropped on vacant slot (move)
    if (
      active.data.current?.type === "calling" &&
      overData?.type === "vacant-slot"
    ) {
      const sourceCalling: CallingWithDetails = active.data.current.calling;
      const targetCalling: CallingWithDetails = overData.calling;

      if (sourceCalling.calling.id === targetCalling.calling.id) return;

      await db.transaction("rw", db.callings, async () => {
        await db.callings.update(targetCalling.calling.id, {
          memberId: sourceCalling.calling.memberId,
          activeDate: new Date().toISOString().split("T")[0],
          status: "active",
          setApart: false,
        });
        await db.callings.update(sourceCalling.calling.id, {
          memberId: null,
          activeDate: null,
          status: "vacant",
          setApart: false,
        });
      });
    }
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
        <main className="flex-1 min-w-0 overflow-auto p-6">
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
            <div className="space-y-4">
              <div className="flex items-center gap-6 text-sm">
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

              <div className="flex gap-3 overflow-x-auto pb-4">
                {Array.from(grouped.entries()).map(([orgId, items]) => (
                  <OrganizationColumn
                    key={orgId}
                    orgName={items[0]!.organization.name}
                    callings={items}
                    activeDropId={activeDropId}
                  />
                ))}
              </div>
            </div>
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
    </DndContext>
  );
}
