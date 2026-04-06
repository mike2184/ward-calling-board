import { useDroppable } from "@dnd-kit/core";
import { CallingCard, VacantDropTarget } from "./CallingCard";
import type { CallingWithDetails } from "@/hooks/useCallings";
import type { CallingProposal } from "@/hooks/useProposals";

interface Props {
  orgName: string;
  callings: CallingWithDetails[];
  activeDropId: string | null;
  proposalMap?: Map<string, CallingProposal[]>;
  maxHeight?: number;
}

// Card column width (px) — matches w-60 (240px)
const CARD_WIDTH = 240;
// Gap between cards
const CARD_GAP = 8;
// Header height (px)
const HEADER_HEIGHT = 44;
// Padding inside the cards area
const CARDS_PADDING = 8;

export function OrganizationColumn({
  orgName,
  callings,
  activeDropId,
  proposalMap,
  maxHeight,
}: Props) {
  const filledCount = callings.filter(
    (c) => c.calling.status === "active"
  ).length;
  const vacantCount = callings.filter(
    (c) => c.calling.status === "vacant"
  ).length;

  // Calculate the available height for the cards area
  const cardsMaxHeight = maxHeight
    ? maxHeight - HEADER_HEIGHT - CARDS_PADDING * 2
    : undefined;

  return (
    <div className="flex-shrink-0 flex flex-col" style={maxHeight ? { maxHeight } : undefined}>
      {/* Column header */}
      <div className="px-3 py-2.5 border-b bg-muted/50 rounded-t-lg border border-b-0 rounded-b-none">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{orgName}</h3>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">{filledCount}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">
              {filledCount + vacantCount}
            </span>
          </div>
        </div>
      </div>

      {/* Callings list — flex column wrap so the container grows horizontally */}
      <div
        className="flex flex-col flex-wrap content-start bg-muted/30 border rounded-b-lg border-t-0"
        style={{
          gap: `${CARD_GAP}px`,
          padding: `${CARDS_PADDING}px`,
          ...(cardsMaxHeight ? { maxHeight: cardsMaxHeight } : {}),
        }}
      >
        {callings.map((item) => {
          const proposals = proposalMap?.get(item.calling.id);
          if (item.calling.status === "vacant") {
            return (
              <div key={item.calling.id} style={{ width: CARD_WIDTH }}>
                <DroppableVacantSlot
                  item={item}
                  isOver={activeDropId === item.calling.id}
                  proposals={proposals}
                />
              </div>
            );
          }
          return (
            <div key={item.calling.id} style={{ width: CARD_WIDTH }}>
              <DroppableFilledSlot
                item={item}
                isOver={activeDropId === item.calling.id}
                proposals={proposals}
              />
            </div>
          );
        })}
        {callings.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4 italic" style={{ width: CARD_WIDTH }}>
            No callings
          </div>
        )}
      </div>
    </div>
  );
}

function DroppableFilledSlot({
  item,
  isOver,
  proposals,
}: {
  item: CallingWithDetails;
  isOver: boolean;
  proposals?: CallingProposal[];
}) {
  const { setNodeRef } = useDroppable({
    id: `filled-${item.calling.id}`,
    data: {
      type: "filled-slot",
      calling: item,
    },
  });

  return (
    <div ref={setNodeRef} className={isOver ? "ring-2 ring-primary rounded-lg" : ""}>
      <CallingCard item={item} proposals={proposals} />
    </div>
  );
}

function DroppableVacantSlot({
  item,
  isOver,
  proposals,
}: {
  item: CallingWithDetails;
  isOver: boolean;
  proposals?: CallingProposal[];
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
        proposals={proposals}
      />
    </div>
  );
}
