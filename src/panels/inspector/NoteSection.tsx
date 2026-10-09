import { Button, ColorField, Field, NumberField, Section } from "@/components/ui";
import { t } from "@/i18n";
import { NOTE_COLORS } from "@/model/defaults";
import type { Note } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { commonValue } from "./common";

export function NoteSection({ notes }: { notes: Note[] }) {
  const updateNote = useDocumentStore((s) => s.updateNote);
  const setAll = (patch: Partial<Omit<Note, "id">>) => {
    for (const n of notes) updateNote(n.id, patch);
  };
  const text = commonValue(notes.map((n) => n.text));
  const align = commonValue(notes.map((n) => n.align));
  const single = notes.length === 1 ? notes[0] : undefined;

  return (
    <Section title={notes.length === 1 ? t.inspector.note : t.inspector.notes(notes.length)}>
      <Field label={t.inspector.text}>
        {(id) => (
          <textarea
            id={id}
            data-testid="inspector-note-text"
            className="min-h-24 w-full resize-y rounded-md border border-border bg-surface px-2 py-1 text-sm focus:border-accent focus:outline-none"
            value={text ?? ""}
            placeholder={text === null ? t.inspector.mixed : t.inspector.textPlaceholder}
            onChange={(e) => setAll({ text: e.target.value })}
          />
        )}
      </Field>
      <ColorField
        label={t.inspector.color}
        value={commonValue(notes.map((n) => n.color))}
        swatches={NOTE_COLORS}
        onChange={(color) => setAll({ color })}
      />
      <ColorField
        label={t.inspector.textColor}
        value={commonValue(notes.map((n) => n.textColor))}
        onChange={(textColor) => setAll({ textColor })}
      />
      <NumberField
        label={t.inspector.fontSize}
        value={commonValue(notes.map((n) => n.fontSize))}
        min={6}
        max={80}
        onChange={(fontSize) => setAll({ fontSize })}
      />
      <Field label={t.inspector.align} inline>
        {() => (
          <span className="flex gap-1">
            <Button active={align === "left"} onClick={() => setAll({ align: "left" })}>
              {t.inspector.alignLeft}
            </Button>
            <Button active={align === "center"} onClick={() => setAll({ align: "center" })}>
              {t.inspector.alignCenter}
            </Button>
          </span>
        )}
      </Field>
      {single && (
        <>
          <NumberField
            label={t.inspector.width}
            value={single.size.w}
            min={20}
            onChange={(w) => updateNote(single.id, { size: { ...single.size, w } })}
          />
          <NumberField
            label={t.inspector.height}
            value={single.size.h}
            min={20}
            onChange={(h) => updateNote(single.id, { size: { ...single.size, h } })}
          />
        </>
      )}
    </Section>
  );
}
