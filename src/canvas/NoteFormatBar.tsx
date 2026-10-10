import { toggleTextStyle, useTextStyleState } from "@/components/RichTextEditor";
import { cx } from "@/components/ui";
import { t } from "@/i18n";
import type { Viewport } from "@/model/geometry";
import { useDocumentStore } from "@/store/documentStore";
import { useUiStore } from "@/store/uiStore";

/**
 * Knapparna B och I strax ovanför en anteckning som redigeras på ritytan. De gör den markerade
 * texten fet eller kursiv direkt i rutan. Knapparna tar inte fokus, så markeringen ligger kvar.
 */
export function NoteFormatBar({ viewport }: { viewport: Viewport }) {
  const editing = useUiStore((s) => s.editing);
  const note = useDocumentStore((s) =>
    editing?.kind === "note" ? s.doc.notes[editing.id] : undefined,
  );
  const active = useTextStyleState();
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
    </div>
  );
}
