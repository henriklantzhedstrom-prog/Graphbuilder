import { ColorField, Field, Section, Segmented, SegmentedItem, SliderField } from "@/components/ui";
import { t } from "@/i18n";
import { NOTE_COLORS } from "@/model/defaults";
import type { Note } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { commonValue, MAX_ELEMENT_SIZE, MIN_ELEMENT_SIZE } from "./common";

export function NoteSection({ notes }: { notes: Note[] }) {
  const updateNote = useDocumentStore((s) => s.updateNote);
  const setAll = (patch: Partial<Omit<Note, "id">>) => {
    for (const n of notes) updateNote(n.id, patch);
  };
  const text = commonValue(notes.map((n) => n.text));
  const align = commonValue(notes.map((n) => n.align));
  const single = notes.length === 1 ? notes[0] : undefined;
  const fontSize = commonValue(notes.map((n) => n.fontSize));

  return (
    <Section title={notes.length === 1 ? t.inspector.note : t.inspector.notes(notes.length)}>
      <Field label={t.inspector.text}>
        {(id) => (
          <textarea
            id={id}
            data-testid="inspector-note-text"
            className="gb-control min-h-24 w-full resize-y rounded-lg px-2.5 py-2 text-[1em] leading-snug placeholder:text-text-muted/70"
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
      <SliderField
        label={t.inspector.fontSize}
        value={fontSize ?? 6}
        mixed={fontSize === null}
        min={6}
        max={80}
        step={1}
        onChange={(value) => setAll({ fontSize: value })}
      />
      <Field label={t.inspector.align} inline>
        {() => (
          <Segmented className="w-44">
            <SegmentedItem
              selected={align === "left"}
              aria-pressed={align === "left"}
              onClick={() => setAll({ align: "left" })}
            >
              {t.inspector.alignLeft}
            </SegmentedItem>
            <SegmentedItem
              selected={align === "center"}
              aria-pressed={align === "center"}
              onClick={() => setAll({ align: "center" })}
            >
              {t.inspector.alignCenter}
            </SegmentedItem>
          </Segmented>
        )}
      </Field>
      {single && (
        <>
          <SliderField
            label={t.inspector.width}
            value={single.size.w}
            min={MIN_ELEMENT_SIZE}
            max={MAX_ELEMENT_SIZE}
            step={1}
            onChange={(w) => updateNote(single.id, { size: { ...single.size, w } })}
          />
          <SliderField
            label={t.inspector.height}
            value={single.size.h}
            min={MIN_ELEMENT_SIZE}
            max={MAX_ELEMENT_SIZE}
            step={1}
            onChange={(h) => updateNote(single.id, { size: { ...single.size, h } })}
          />
        </>
      )}
    </Section>
  );
}
