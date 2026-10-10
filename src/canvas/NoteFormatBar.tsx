import { IconMinus, IconPlus } from "@/components/icons";
import { toggleTextStyle, useTextStyleState } from "@/components/RichTextEditor";
import { cx } from "@/components/ui";
import { t } from "@/i18n";
import { NOTE_FONT_MAX, NOTE_FONT_MIN } from "@/model/defaults";
import type { Viewport } from "@/model/geometry";
import { useDocumentStore } from "@/store/documentStore";
import { useUiStore } from "@/store/uiStore";

/**
 * Den lilla menyn strax ovanför en anteckning som redigeras på ritytan: B och I gör den markerade
 * texten fet eller kursiv direkt i rutan, och − / + ändrar textstorleken för hela anteckningen.
 * Knapparna tar inte fokus, så markeringen ligger kvar.
 */
export function NoteFormatBar({ viewport }: { viewport: Viewport }) {
  const editing = useUiStore((s) => s.editing);
  const note = useDocumentStore((s) =>
    editing?.kind === "note" ? s.doc.notes[editing.id] : undefined,
  );
  const active = useTextStyleState();
  const updateNote = useDocumentStore((s) => s.updateNote);
  const setSize = (size: number) => {
    if (!note) return;
    updateNote(note.id, {
      fontSize: Math.min(NOTE_FONT_MAX, Math.max(NOTE_FONT_MIN, Math.round(size))),
    });
  };
  if (!note) return null;
  const left = note.position.x * viewport.zoom + viewport.x;
  const top = note.position.y * viewport.zoom + viewport.y - note.borderWidth * viewport.zoom;
  const button = (on: boolean, extra: string) =>
    cx(
      "flex h-8 w-8 items-center justify-center rounded-lg text-[16px] transition-colors",
      on ? "bg-accent-soft text-accent" : "text-text hover:bg-surface-2",
      extra,
    );
  return (
    <div
      role="toolbar"
      aria-label={t.inspector.text}
      data-testid="note-format-bar"
      className="absolute z-10 flex gap-0.5 rounded-xl border border-border bg-surface p-1 shadow-float"
      style={{ left, top: top - 8, transform: "translateY(-100%)" }}
      // Behåll fokus och markering i anteckningen när en knapp klickas.
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={t.inspector.bold}
        aria-pressed={active.bold}
        title={t.inspector.boldHint}
        data-testid="canvas-note-bold"
        className={button(active.bold, "font-bold")}
        onClick={() => toggleTextStyle("bold")}
      >
        B
      </button>
      <button
        type="button"
        aria-label={t.inspector.italic}
        aria-pressed={active.italic}
        title={t.inspector.italicHint}
        data-testid="canvas-note-italic"
        className={button(active.italic, "font-serif italic")}
        onClick={() => toggleTextStyle("italic")}
      >
        I
      </button>
      <span aria-hidden className="mx-1 h-5 w-px self-center bg-border" />
      {/* Textstorleken gäller hela anteckningen, samma värde som Text size i sidopanelen. */}
      <button
        type="button"
        aria-label={t.inspector.textSmaller}
        title={t.inspector.textSmaller}
        data-testid="canvas-note-smaller"
        disabled={note.fontSize <= NOTE_FONT_MIN}
        className={button(false, "disabled:opacity-35 disabled:hover:bg-transparent")}
        onClick={() => setSize(note.fontSize - 1)}
      >
        <IconMinus size={16} />
      </button>
      <output
        data-testid="canvas-note-size"
        title={t.inspector.fontSize}
        className="flex h-8 min-w-7 items-center justify-center text-[14px] text-text tabular-nums"
      >
        {note.fontSize}
      </output>
      <button
        type="button"
        aria-label={t.inspector.textLarger}
        title={t.inspector.textLarger}
        data-testid="canvas-note-larger"
        disabled={note.fontSize >= NOTE_FONT_MAX}
        className={button(false, "disabled:opacity-35 disabled:hover:bg-transparent")}
        onClick={() => setSize(note.fontSize + 1)}
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}
