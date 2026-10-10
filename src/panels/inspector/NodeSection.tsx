import { Button, Field, Section } from "@/components/ui";
import { t } from "@/i18n";
import type { GraphNode } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { resolvedNodeStyle } from "@/store/selectors";
import { captionColorFor, NODE_STYLE_FIELDS } from "./common";
import { LabelsEditor } from "./LabelsEditor";
import { PropertiesEditor } from "./PropertiesEditor";
import { StyleFields } from "./StyleFields";

export function NodeSection({ nodes }: { nodes: GraphNode[] }) {
  const doc = useDocumentStore((s) => s.doc);
  const setNodeStyle = useDocumentStore((s) => s.setNodeStyle);
  const resetElementStyle = useDocumentStore((s) => s.resetElementStyle);
  const setCaptionKey = useDocumentStore((s) => s.setCaptionKey);
  const ids = nodes.map((n) => n.id);
  const refs = ids.map((id) => ({ kind: "node" as const, id }));
  const hasCustomStyle = nodes.some((n) => Object.keys(n.style).length > 0);

  return (
    <>
      <Section title={nodes.length === 1 ? t.inspector.node : t.inspector.nodes(nodes.length)}>
        <Field label={t.inspector.labels}>
          {(id) => <LabelsEditor nodes={nodes} inputId={id} />}
        </Field>
      </Section>
      <Section title={t.inspector.properties}>
        <PropertiesEditor
          refs={refs}
          propertySets={nodes.map((n) => n.properties)}
          caption={{
            keys: nodes.map((n) => n.captionKey),
            onToggle: (key, checked) => setCaptionKey(ids, checked ? key : null),
          }}
        />
      </Section>
      <Section title={t.inspector.style}>
        <StyleFields
          fields={NODE_STYLE_FIELDS}
          labels={t.inspector.styleNode}
          values={nodes.map((n) => resolvedNodeStyle(doc, n))}
          onChange={(key, value) => {
            setNodeStyle(ids, { [key]: value });
            if (key !== "fill" || typeof value !== "string") return;
            // Mörk fyllning med mörk rubrik (eller ljus med ljus) går inte att läsa: byt rubrikfärg.
            for (const node of nodes) {
              const caption = captionColorFor(value, resolvedNodeStyle(doc, node).captionColor);
              if (caption) setNodeStyle([node.id], { captionColor: caption });
            }
          }}
        />
        {hasCustomStyle && (
          <Button className="mt-2" onClick={() => resetElementStyle(refs)}>
            {t.inspector.resetStyle}
          </Button>
        )}
      </Section>
    </>
  );
}
