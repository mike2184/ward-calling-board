import { useDraggable } from "@dnd-kit/core";
import type { Member } from "@/types/models";

interface Props {
  member: Member;
  isDragOverlay?: boolean;
  callingInfo?: string;
}

export function DraggableMemberCard({
  member,
  isDragOverlay,
  callingInfo,
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
      <div className="flex items-center justify-between">
        <span>{member.fullName}</span>
        {callingInfo && (
          <span className="text-xs text-muted-foreground ml-2 truncate max-w-24">
            {callingInfo}
          </span>
        )}
      </div>
    </div>
  );
}
