import type { Box, Note } from "@/model/types";
import { LINE_HEIGHT, wrapToWidth } from "./text";

export const NOTE_PADDING = 10;

export interface NoteViewProps {
  note: Note;
  box: Box;
  interactive?: boolean;
  hideText?: boolean;
}

export function NoteView({ note, box, interactive = false, hideText = false }: NoteViewProps) {
  const lines = hideText ? [] : wrapToWidth(note.text, box.w - NOTE_PADDING * 2, note.fontSize);
  const lineHeight = note.fontSize * LINE_HEIGHT;
  const clipId = `note-clip-${note.id}`;
  const textX = note.align === "center" ? box.x + box.w / 2 : box.x + NOTE_PADDING;
  return (
    <g
      className="gb-note"
      data-ref={interactive ? `note:${note.id}` : undefined}
      data-part={interactive ? "body" : undefined}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={6} />
        </clipPath>
      </defs>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={6}
        fill={note.color}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth={1}
      />
      {lines.length > 0 && (
        <text
          clipPath={`url(#${clipId})`}
          x={textX}
          y={box.y + NOTE_PADDING + note.fontSize * 0.85}
          textAnchor={note.align === "center" ? "middle" : "start"}
          fontSize={note.fontSize}
          fill={note.textColor}
          fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: "none", userSelect: "none", whiteSpace: "pre" }}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={textX} dy={i === 0 ? 0 : lineHeight}>
              {line || " "}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}
