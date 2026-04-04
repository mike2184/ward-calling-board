import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatServingDurationShort } from "@/utils/time";
import type { CallingWithDetails } from "@/hooks/useCallings";

interface Props {
  item: CallingWithDetails;
  isDragOverlay?: boolean;
}

export function CallingCard({ item, isDragOverlay }: Props) {
  const isVacant = item.calling.status === "vacant";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.calling.id,
    data: {
      type: "calling",
      calling: item,
    },
    disabled: isVacant,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (isDragOverlay) {
    return (
      <div className="bg-background border-2 border-primary rounded-lg p-3 shadow-lg w-56">
        <CardContent item={item} isVacant={isVacant} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg p-3 border-l-4 transition-colors ${
        isVacant
          ? "bg-vacant/5 border-l-vacant border border-dashed border-border cursor-default"
          : "bg-background border-l-success border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md"
      }`}
    >
      <CardContent item={item} isVacant={isVacant} />
    </div>
  );
}

function CardContent({
  item,
  isVacant,
}: {
  item: CallingWithDetails;
  isVacant: boolean;
}) {
  return (
    <>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        {item.position.positionName}
      </div>
      {isVacant ? (
        <div className="text-sm text-vacant italic">Vacant</div>
      ) : (
        <>
          <div className="text-sm font-medium">{item.member?.fullName}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatServingDurationShort(item.calling.activeDate)}
          </div>
        </>
      )}
    </>
  );
}

export function VacantDropTarget({
  positionName,
  isOver,
}: {
  positionName: string;
  isOver: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 border-2 border-dashed transition-colors ${
        isOver
          ? "border-primary bg-primary/10"
          : "border-border bg-muted/20"
      }`}
    >
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        {positionName}
      </div>
      <div className={`text-sm italic ${isOver ? "text-primary" : "text-vacant"}`}>
        {isOver ? "Drop to assign" : "Vacant"}
      </div>
    </div>
  );
}
