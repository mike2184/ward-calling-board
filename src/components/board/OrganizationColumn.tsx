import { useRef, useState, useCallback, useEffect } from "react";
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

/**
 * Distribute items into columns by measuring actual rendered heights.
 * Falls back to a single column if maxHeight is not provided.
 */
function useColumnLayout(
  itemCount: number,
  containerRef: React.RefObject<HTMLDivElement | null>,
  maxHeight: number | undefined
) {
  const [columns, setColumns] = useState<number[][]>([
    Array.from({ length: itemCount }, (_, i) => i),
  ]);

  const computeColumns = useCallback(() => {
    const container = containerRef.current;
    if (!container || !maxHeight) {
      setColumns([Array.from({ length: itemCount }, (_, i) => i)]);
      return;
    }

    const availableHeight = maxHeight - HEADER_HEIGHT - CARDS_PADDING * 2;
    if (availableHeight <= 0) {
      setColumns([Array.from({ length: itemCount }, (_, i) => i)]);
      return;
    }

    // Measure each card wrapper's height
    const wrappers = container.querySelectorAll<HTMLElement>("[data-card-wrapper]");
    const heights: number[] = [];
    wrappers.forEach((el) => heights.push(el.offsetHeight));

    if (heights.length === 0) {
      setColumns([Array.from({ length: itemCount }, (_, i) => i)]);
      return;
    }

    // Greedily assign items to columns
    const cols: number[][] = [[]];
    let colHeight = 0;
    for (let i = 0; i < heights.length; i++) {
      const needed = colHeight === 0 ? heights[i]! : heights[i]! + CARD_GAP;
      if (colHeight > 0 && colHeight + needed > availableHeight) {
        cols.push([]);
        colHeight = 0;
      }
      cols[cols.length - 1]!.push(i);
      colHeight += colHeight === 0 ? heights[i]! : needed;
    }
    setColumns(cols);
  }, [containerRef, maxHeight, itemCount]);

  return { columns, computeColumns };
}

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

  const measureRef = useRef<HTMLDivElement | null>(null);
  const { columns, computeColumns } = useColumnLayout(
    callings.length,
    measureRef,
    maxHeight
  );

  // Re-compute columns when callings or maxHeight change, after a paint
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has rendered the hidden measurer
    const raf = requestAnimationFrame(() => computeColumns());
    return () => cancelAnimationFrame(raf);
  }, [computeColumns]);

  // Also observe size changes in the hidden measurer to catch proposal additions etc.
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => computeColumns());
    // Observe each card wrapper for height changes
    el.querySelectorAll("[data-card-wrapper]").forEach((child) =>
      observer.observe(child)
    );
    return () => observer.disconnect();
  }, [computeColumns, callings]);

  // Calculate available height for the cards area
  const cardsMaxHeight = maxHeight
    ? maxHeight - HEADER_HEIGHT - CARDS_PADDING * 2
    : undefined;

  const renderCard = (item: CallingWithDetails) => {
    const proposals = proposalMap?.get(item.calling.id);
    if (item.calling.status === "vacant") {
      return (
        <DroppableVacantSlot
          item={item}
          isOver={activeDropId === item.calling.id}
          proposals={proposals}
        />
      );
    }
    return (
      <DroppableFilledSlot
        item={item}
        isOver={activeDropId === item.calling.id}
        proposals={proposals}
      />
    );
  };

  return (
    <div className="flex-shrink-0 flex flex-col relative" style={maxHeight ? { maxHeight } : undefined}>
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

      {/* Hidden measurer — single column to get natural card heights */}
      <div
        ref={measureRef}
        className="flex flex-col"
        style={{
          position: "fixed",
          left: -9999,
          visibility: "hidden",
          pointerEvents: "none",
          width: CARD_WIDTH + CARDS_PADDING * 2,
          gap: `${CARD_GAP}px`,
          padding: `${CARDS_PADDING}px`,
        }}
        aria-hidden
      >
        {callings.map((item) => (
          <div key={item.calling.id} data-card-wrapper style={{ width: CARD_WIDTH }}>
            {renderCard(item)}
          </div>
        ))}
      </div>

      {/* Visible multi-column layout */}
      <div
        className="flex bg-muted/30 border rounded-b-lg border-t-0"
        style={{
          gap: `${CARD_GAP}px`,
          padding: `${CARDS_PADDING}px`,
          ...(cardsMaxHeight ? { maxHeight: cardsMaxHeight } : {}),
        }}
      >
        {callings.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4 italic" style={{ width: CARD_WIDTH }}>
            No callings
          </div>
        ) : (
          columns.map((colIndices, colIdx) => (
            <div
              key={colIdx}
              className="flex flex-col"
              style={{ gap: `${CARD_GAP}px`, width: CARD_WIDTH }}
            >
              {colIndices.map((itemIdx) => {
                const item = callings[itemIdx];
                if (!item) return null;
                return (
                  <div key={item.calling.id} style={{ width: CARD_WIDTH }}>
                    {renderCard(item)}
                  </div>
                );
              })}
            </div>
          ))
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
