import type { Box } from "@/model/types";

export const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
export type Handle = (typeof HANDLES)[number];

const CURSORS: Record<Handle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

export function handlePosition(box: Box, handle: Handle): { x: number; y: number } {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const right = box.x + box.w;
  const bottom = box.y + box.h;
  switch (handle) {
    case "nw":
      return { x: box.x, y: box.y };
    case "n":
      return { x: cx, y: box.y };
    case "ne":
      return { x: right, y: box.y };
    case "e":
      return { x: right, y: cy };
    case "se":
      return { x: right, y: bottom };
    case "s":
      return { x: cx, y: bottom };
    case "sw":
      return { x: box.x, y: bottom };
    case "w":
      return { x: box.x, y: cy };
  }
}

/** Markeringsram med storlekshandtag för anteckningar och bilder. */
export function SelectionBox({
  box,
  refKey,
  zoom,
  resizable,
}: {
  box: Box;
  refKey: string;
  zoom: number;
  resizable: boolean;
}) {
  const size = 8 / zoom;
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.5 / zoom}
        strokeDasharray={`${6 / zoom} ${4 / zoom}`}
        style={{ pointerEvents: "none" }}
      />
      {resizable &&
        HANDLES.map((h) => {
          const p = handlePosition(box, h);
          return (
            <rect
              key={h}
              x={p.x - size / 2}
              y={p.y - size / 2}
              width={size}
              height={size}
              fill="var(--color-surface)"
              stroke="var(--color-accent)"
              strokeWidth={1.5 / zoom}
              data-ref={refKey}
              data-part="handle"
              data-handle={h}
              style={{ cursor: CURSORS[h] }}
            />
          );
        })}
    </g>
  );
}
