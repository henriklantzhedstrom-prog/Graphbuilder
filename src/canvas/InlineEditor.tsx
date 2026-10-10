import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { nodeCaption } from "@/model/caption";
import { toggleMarkup } from "@/model/noteText";
import type { Box, ElementRef, GraphDocument, GraphNode } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { useUiStore } from "@/store/uiStore";

export interface InlineEditorProps {
  doc: GraphDocument;
  target: ElementRef;
  /** Box i canvas-koordinater där editorn placeras */
  box: Box;
  fontSize: number;
  color: string;
  align: "left" | "center";
  zoom: number;
}

function initialText(doc: GraphDocument, ref: ElementRef): string {
  switch (ref.kind) {
    case "node":
      return doc.nodes[ref.id] ? nodeCaption(doc.nodes[ref.id] as GraphNode) : "";
    case "relationship":
      return doc.relationships[ref.id]?.type ?? "";
    case "note":
      return doc.notes[ref.id]?.text ?? "";
    default:
      return "";
  }
}

export function InlineEditor({
  doc,
  target,
  box,
  fontSize,
  color,
  align,
  zoom,
}: InlineEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(() => initialText(doc, target));
  const committed = useRef(false);
  const setEditing = useUiStore((s) => s.setEditing);
  const setDetails = useUiStore((s) => s.setDetails);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const commit = (text: string) => {
    if (committed.current) return;
    committed.current = true;
    const store = useDocumentStore.getState();
    const trimmed = target.kind === "note" ? text : text.trim();
    if (trimmed !== initialText(doc, target)) {
      if (target.kind === "node") store.setCaption(target.id, trimmed);
      if (target.kind === "relationship") store.updateRelationship(target.id, { type: trimmed });
      if (target.kind === "note") store.updateNote(target.id, { text: trimmed });
    }
    setEditing(null);
  };

  const cancel = () => {
    if (committed.current) return;
    committed.current = true;
    setEditing(null);
  };

  return (
    <foreignObject x={box.x} y={box.y} width={box.w} height={box.h} style={{ overflow: "visible" }}>
      <textarea
        ref={ref}
        data-testid="inline-editor"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => {
          commit(value);
          // Går markören vidare till labels eller egenskaper fortsätter redigeringen där.
          const next = e.relatedTarget;
          if (!(next instanceof Element && next.closest("[data-details-editor]"))) setDetails(null);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          // I anteckningar: Ctrl/Cmd+B och Ctrl/Cmd+I gör den markerade texten fet eller kursiv.
          const style = e.key.toLowerCase();
          if (
            target.kind === "note" &&
            (e.ctrlKey || e.metaKey) &&
            (style === "b" || style === "i")
          ) {
            e.preventDefault();
            const el = e.currentTarget;
            const next = toggleMarkup(
              value,
              el.selectionStart,
              el.selectionEnd,
              style === "b" ? "**" : "*",
            );
            // Texten måste hinna in i fältet innan markeringen sätts, annars hamnar markören sist.
            flushSync(() => setValue(next.value));
            el.setSelectionRange(next.start, next.end);
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
            setDetails(null);
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit(value);
            setDetails(null);
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          height: "100%",
          resize: "none",
          border: `${1 / zoom}px solid var(--color-accent)`,
          borderRadius: 4,
          outline: "none",
          padding: 2,
          margin: 0,
          background: "rgba(255,255,255,0.92)",
          color,
          fontSize,
          lineHeight: 1.25,
          textAlign: align,
          fontFamily: "system-ui, sans-serif",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      />
    </foreignObject>
  );
}
