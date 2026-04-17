import { useDraggable } from "@dnd-kit/core";
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Member } from "@/types/models";

const ACTIVITY_DOT_COLORS: Record<string, string> = {
  active: "bg-green-500",
  "less-active": "bg-yellow-500",
  inactive: "bg-red-500",
  "serving-away": "bg-blue-500",
  "not-eligible": "bg-gray-400",
};

function DragCallingPill({ count, callingNames }: { count: number; callingNames: string[] }) {
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

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

  useLayoutEffect(() => {
    if (!open || !popupRef.current || !pillRef.current) return;
    const pill = pillRef.current.getBoundingClientRect();
    const popup = popupRef.current;
    const popupHeight = popup.offsetHeight;
    const popupWidth = popup.offsetWidth;
    const spaceBelow = window.innerHeight - pill.bottom - 4;
    const flipUp = spaceBelow < popupHeight && pill.top > popupHeight;

    const rawLeft = pill.right - popupWidth;
    popup.style.left = `${Math.min(window.innerWidth - popupWidth - 8, Math.max(8, rawLeft))}px`;
    if (flipUp) {
      popup.style.top = "";
      popup.style.bottom = `${window.innerHeight - pill.top + 4}px`;
    } else {
      popup.style.bottom = "";
      popup.style.top = `${pill.bottom + 4}px`;
    }
    popup.style.visibility = "visible";
  }, [open]);

  if (count === 0) return null;

  return (
    <>
      <span
        ref={pillRef}
        onPointerDown={(e) => {
          e.stopPropagation(); // prevent drag initiation
          setOpen(!open);
        }}
        className="text-[11px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full min-w-[20px] text-center hover:bg-primary/20 transition-colors flex-shrink-0 cursor-pointer"
      >
        {count}
      </span>
      {open && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[9999] bg-popover border rounded-md shadow-lg py-2 px-3 max-w-[220px]"
          style={{ visibility: "hidden" }}
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

interface Props {
  member: Member;
  isDragOverlay?: boolean;
  ageDisplay?: number;
  callingCount?: number;
  callingNames?: string[];
  projected?: boolean;
  hasProposedCalling?: boolean;
}

export function DraggableMemberCard({
  member,
  isDragOverlay,
  ageDisplay,
  callingCount,
  callingNames,
  projected,
  hasProposedCalling,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `member-${member.id}`,
    data: {
      type: "member",
      member,
    },
  });

  const status = member.activityStatus ?? "active";

  if (isDragOverlay) {
    return (
      <div className="bg-background border-2 border-primary rounded-md px-3 py-2 shadow-lg text-sm font-medium w-48 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${ACTIVITY_DOT_COLORS[status]} flex-shrink-0`} />
        {member.fullName}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`text-sm py-1.5 px-2 rounded cursor-grab active:cursor-grabbing transition-colors ${
        isDragging ? "opacity-40" : ""
      } ${
        projected
          ? "bg-warning/8 border border-dashed border-warning/40 hover:bg-warning/15"
          : hasProposedCalling
            ? "bg-success/8 border border-dashed border-success/40 hover:bg-success/15"
            : "hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full ${ACTIVITY_DOT_COLORS[status]} flex-shrink-0`} />
          <span className={`truncate ${projected ? "italic" : ""}`}>{member.fullName}</span>
          {projected && (
            <span className="text-[9px] text-warning font-medium flex-shrink-0">PROJ</span>
          )}
          {hasProposedCalling && (
            <span className="text-[9px] text-success font-medium flex-shrink-0">PROP</span>
          )}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {ageDisplay != null && (
            <span className="text-[10px] text-muted-foreground">{ageDisplay}</span>
          )}
          {callingCount != null && callingCount > 0 && callingNames && (
            <DragCallingPill count={callingCount} callingNames={callingNames} />
          )}
        </div>
      </div>
    </div>
  );
}
