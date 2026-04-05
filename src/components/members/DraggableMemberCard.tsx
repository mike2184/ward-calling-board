import { useDraggable } from "@dnd-kit/core";
import type { Member } from "@/types/models";

interface Props {
  member: Member;
  isDragOverlay?: boolean;
  callingInfo?: string;
  ageDisplay?: number;
}

export function DraggableMemberCard({
  member,
  isDragOverlay,
  callingInfo,
  ageDisplay,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `member-${member.id}`,
    data: {
      type: "member",
      member,
    },
  });

  if (isDragOverlay) {
    return (
      <div className="bg-background border-2 border-primary rounded-md px-3 py-2 shadow-lg text-sm font-medium w-48">
        {member.fullName}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`text-sm py-1.5 px-2 rounded cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate">{member.fullName}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {ageDisplay != null && (
            <span className="text-[10px] text-muted-foreground">{ageDisplay}</span>
          )}
          {callingInfo && (
            <span className="text-xs text-muted-foreground truncate max-w-20">
              {callingInfo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
