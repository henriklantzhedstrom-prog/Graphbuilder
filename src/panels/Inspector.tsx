import { deleteSelection, duplicateSelection } from "@/canvas/actions";
import { IconCopy, IconTrash } from "@/components/icons";
import { Button, Field, Section } from "@/components/ui";
import { t } from "@/i18n";
import { useDocumentStore } from "@/store/documentStore";
import { getElement } from "@/store/selectors";
import { useUiStore } from "@/store/uiStore";
import { commonValue } from "./inspector/common";
import { DocumentStyleSection } from "./inspector/DocumentStyleSection";
import { ImageSection } from "./inspector/ImageSection";
import { NodeSection } from "./inspector/NodeSection";
import { NoteSection } from "./inspector/NoteSection";
import { RelationshipSection } from "./inspector/RelationshipSection";

export function Inspector() {
  const doc = useDocumentStore((s) => s.doc);
  const moveElementsToLayer = useDocumentStore((s) => s.moveElementsToLayer);
  const selection = useUiStore((s) => s.selection);

  if (selection.length === 0) return <DocumentStyleSection />;

  const pick = <T,>(kind: string, table: Record<string, T>): T[] =>
    selection.flatMap((r) => {
      const el = r.kind === kind ? table[r.id] : undefined;
      return el === undefined ? [] : [el];
    });
  const nodes = pick("node", doc.nodes);
  const relationships = pick("relationship", doc.relationships);
  const notes = pick("note", doc.notes);
  const images = pick("image", doc.images);
  const layerId = commonValue(selection.map((r) => getElement(doc, r)?.layerId ?? ""));

  return (
    <div data-testid="inspector">
      <Section title={t.inspector.selection(selection.length)}>
        <Field label={t.inspector.layer} inline>
          {(id) => (
            <select
              id={id}
              data-testid="inspector-layer"
              className="h-8 rounded-md border border-border bg-surface px-1 text-[1em]"
              value={layerId ?? ""}
              onChange={(e) => moveElementsToLayer(selection, e.target.value)}
            >
              {layerId === null && <option value="">{t.inspector.mixed}</option>}
              {[...doc.layers].reverse().map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="flex gap-1">
          <Button onClick={duplicateSelection}>
            <IconCopy size={16} />
            {t.inspector.duplicate}
          </Button>
          <Button variant="danger" onClick={deleteSelection}>
            <IconTrash size={16} />
            {t.inspector.delete}
          </Button>
        </div>
      </Section>
      {nodes.length > 0 && <NodeSection nodes={nodes} />}
      {relationships.length > 0 && <RelationshipSection relationships={relationships} />}
      {notes.length > 0 && <NoteSection notes={notes} />}
      {images.length > 0 && <ImageSection images={images} />}
    </div>
  );
}
