import { useId, useRef } from "react";
import { flushSync } from "react-dom";
import { attachNotes } from "@/canvas/actions";
import { IconLink } from "@/components/icons";
import {
  Button,
  ColorField,
  Field,
  IconButton,
  Section,
  Segmented,
  SegmentedItem,
  SliderField,
} from "@/components/ui";
import { t } from "@/i18n";
import { nodeDisplayName } from "@/model/caption";
import { NOTE_COLORS } from "@/model/defaults";
import { toggleMarkup } from "@/model/noteText";
import type { GraphDocument, Note } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { useUiStore } from "@/store/uiStore";
import { commonValue } from "./common";

const nodeDisplayNameOf = (doc: GraphDocument, id: string): string => {
  const node = doc.nodes[id];
  return node ? nodeDisplayName(node) : "";
};

export function NoteSection({ notes }: { notes: Note[] }) {
  const updateNote = useDocumentStore((s) => s.updateNote);
  const setAll = (patch: Partial<Omit<Note, "id">>) => {
    for (const n of notes) updateNote(n.id, patch);
  };
  const text = commonValue(notes.map((n) => n.text));
  const align = commonValue(notes.map((n) => n.align));
  const fontSize = commonValue(notes.map((n) => n.fontSize));
  const borderWidth = commonValue(notes.map((n) => n.borderWidth));

  const textId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  /** Gör den markerade texten i textfältet fet eller kursiv (eller tar bort stilen igen). */
  const applyStyle = (marker: "**" | "*") => {
    const el = textRef.current;
    if (!el || text === null) return;
    const next = toggleMarkup(text, el.selectionStart, el.selectionEnd, marker);
    if (next.value === text) return;
    // Texten måste hinna in i fältet innan markeringen sätts, annars hamnar markören sist.
    flushSync(() => setAll({ text: next.value }));
    el.focus();
    el.setSelectionRange(next.start, next.end);
  };
  const doc = useDocumentStore((s) => s.doc);
  const attaching = useUiStore((s) => s.attachingNotes !== null);
  const setAttachingNotes = useUiStore((s) => s.setAttachingNotes);
  const ids = notes.map((n) => n.id);
  const anchors = notes.map((n) => (n.attachedTo ? `${n.attachedTo.kind}:${n.attachedTo.id}` : ""));
  const sameAnchor = commonValue(anchors);
  const anchor = sameAnchor ? notes[0]?.attachedTo : undefined;
  const attachedLabel =
    sameAnchor === null
      ? t.inspector.mixed
      : !anchor
        ? t.inspector.attachedNothing
        : anchor.kind === "node"
          ? t.inspector.attachedNode(nodeDisplayNameOf(doc, anchor.id))
          : t.inspector.attachedRelationship(doc.relationships[anchor.id]?.type ?? "");
  const isAttached = anchors.some((a) => a !== "");

  return (
    <Section title={notes.length === 1 ? t.inspector.note : t.inspector.notes(notes.length)}>
      <div className="flex flex-col gap-2 pb-1" data-testid="note-attachment">
        <span className="text-[0.88em] text-text-muted">{t.inspector.attachedTo}</span>
        <p className="font-medium text-[0.94em] leading-snug" data-testid="note-attached-to">
          {attachedLabel}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            active={attaching}
            data-testid="note-attach"
            className={isAttached ? "" : "col-span-2"}
            onClick={() => setAttachingNotes(attaching ? null : ids)}
          >
            <IconLink size={16} />
            {attaching
              ? t.inspector.attaching
              : isAttached
                ? t.inspector.attachChange
                : t.inspector.attach}
          </Button>
          {isAttached && (
            <Button data-testid="note-detach" onClick={() => attachNotes(ids, null)}>
              {t.inspector.detach}
            </Button>
          )}
        </div>
        <p className="text-[0.82em] text-text-muted leading-snug">{t.inspector.attachedHint}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={textId} className="text-[0.88em] text-text-muted">
            {t.inspector.text}
          </label>
          <span className="flex gap-1">
            <IconButton
              label={t.inspector.bold}
              data-testid="note-bold"
              className="h-8 w-8 font-bold text-[1em] text-text"
              // Behåll markeringen i textfältet när knappen klickas.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyStyle("**")}
            >
              B
            </IconButton>
            <IconButton
              label={t.inspector.italic}
              data-testid="note-italic"
              className="h-8 w-8 font-serif text-[1em] text-text italic"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyStyle("*")}
            >
              I
            </IconButton>
          </span>
        </div>
        <textarea
          id={textId}
          ref={textRef}
          data-testid="inspector-note-text"
          className="gb-control min-h-24 w-full resize-y rounded-lg px-2.5 py-2 text-[1em] leading-snug placeholder:text-text-muted/70"
          value={text ?? ""}
          placeholder={text === null ? t.inspector.mixed : t.inspector.textPlaceholder}
          onChange={(e) => setAll({ text: e.target.value })}
          onKeyDown={(e) => {
            const key = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && (key === "b" || key === "i")) {
              e.preventDefault();
              applyStyle(key === "b" ? "**" : "*");
            }
          }}
        />
        <p className="text-[0.82em] text-text-muted leading-snug">{t.inspector.textStyleHint}</p>
      </div>
      <ColorField
        label={t.inspector.color}
        value={commonValue(notes.map((n) => n.color))}
        swatches={NOTE_COLORS}
        onChange={(color) => setAll({ color })}
      />
      <ColorField
        label={t.inspector.borderColor}
        value={commonValue(notes.map((n) => n.borderColor))}
        onChange={(borderColor) => setAll({ borderColor })}
      />
      <SliderField
        label={t.inspector.borderWidth}
        value={borderWidth ?? 0}
        mixed={borderWidth === null}
        min={0}
        max={10}
        step={0.5}
        onChange={(value) => setAll({ borderWidth: value })}
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
    </Section>
  );
}
