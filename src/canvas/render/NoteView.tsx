import { textOn } from "@/model/color";
import { layoutRichText } from "@/model/noteText";
import type { Box, Note } from "@/model/types";
import { CHAR_WIDTH_FACTOR, LINE_HEIGHT } from "./text";

export const NOTE_PADDING = 10;

export interface NoteViewProps {
  note: Note;
  box: Box;
  interactive?: boolean;
  hideText?: boolean;
}

export function NoteView({ note, box, interactive = false, hideText = false }: NoteViewProps) {
  // Radbrytning per ord; **fet** och *kursiv* i texten blir stil på orden, märkena ritas inte.
  const maxChars = Math.floor((box.w - NOTE_PADDING * 2) / (note.fontSize * CHAR_WIDTH_FACTOR));
  const lines = hideText ? [] : layoutRichText(note.text, maxChars);
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
        // Ramen ligger utanför anteckningens yta: linjens mitt är en halv rambredd utanför.
        data-width={box.w}
        data-height={box.h}
        x={box.x - note.borderWidth / 2}
        y={box.y - note.borderWidth / 2}
        width={box.w + note.borderWidth}
        height={box.h + note.borderWidth}
        rx={6 + note.borderWidth / 2}
        fill={note.color}
        stroke={note.borderColor}
        strokeWidth={note.borderWidth}
      />
      {lines.length > 0 && (
        <text
          clipPath={`url(#${clipId})`}
          x={textX}
          y={box.y + NOTE_PADDING + note.fontSize * 0.85}
          textAnchor={note.align === "center" ? "middle" : "start"}
          fontSize={note.fontSize}
          fill={textOn(note.color, note.textColor)}
          fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: "none", userSelect: "none", whiteSpace: "pre" }}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={textX} dy={i === 0 ? 0 : lineHeight}>
              {line.length === 0
                ? " "
                : line.map((run, j) => (
                    <tspan
                      key={j}
                      fontWeight={run.bold ? 700 : undefined}
                      fontStyle={run.italic ? "italic" : undefined}
                    >
                      {run.text}
                    </tspan>
                  ))}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}
