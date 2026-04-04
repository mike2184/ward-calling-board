import { useDroppable } from "@dnd-kit/core";
import { CallingCard, VacantDropTarget } from "./CallingCard";
import type { CallingWithDetails } from "@/hooks/useCallings";

interface Props {
  orgName: string;
  callings: CallingWithDetails[];
  activeDropId: string | null;
}

export function OrganizationColumn({
  orgName,
  callings,
  activeDropId,
}: Props) {
  const filledCount = callings.filter(
    (c) => c.calling.status === "active"
  ).length;
  const vacantCount = callings.filter(
    (c) => c.calling.status === "vacant"
  ).length;

  return (
    <div className="w-64 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg border">
      {/* Column header */}
      <div className="px-3 py-2.5 border-b bg-muted/50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{orgName}</h3>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-success">{filledCount}</span>
            <span className="text-muted-foreground">/</span>
            <span className={vacantCount > 0 ? "text-vacant" : "text-muted-foreground"}>
              {filledCount + vacantCount}
            </span>
          </div>
        </div>
      </div>

      {/* Callings list */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {callings.map((item) => {
          if (item.calling.status === "vacant") {
            return (
              <DroppableVacantSlot
                key={item.calling.id}
                item={item}
                isOver={activeDropId === item.calling.id}
              />
            );
          }
          return <CallingCard key={item.calling.id} item={item} />;
        })}
        {callings.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4 italic">
            No callings
          </div>
        )}
      </div>
    </div>
  );
}

function DroppableVacantSlot({
  item,
  isOver,
}: {
  item: CallingWithDetails;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `vacant-${item.calling.id}`,
    data: {
      type: "vacant-slot",
      calling: item,
    },
  });

  return (
    <div ref={setNodeRef}>
      <VacantDropTarget
        positionName={item.position.positionName}
        isOver={isOver}
      />
    </div>
  );
}
