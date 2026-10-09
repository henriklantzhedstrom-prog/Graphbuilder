import { useState } from "react";
import { IconClose, IconPlus } from "@/components/icons";
import { Button, Field, Section, TextInput } from "@/components/ui";
import { t } from "@/i18n";
import type { GraphNode } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { resolvedNodeStyle } from "@/store/selectors";
import { commonValue, NODE_STYLE_FIELDS } from "./common";
import { PropertiesEditor } from "./PropertiesEditor";
import { StyleFields } from "./StyleFields";

export function NodeSection({ nodes }: { nodes: GraphNode[] }) {
  const doc = useDocumentStore((s) => s.doc);
  const updateNode = useDocumentStore((s) => s.updateNode);
  const setNodeStyle = useDocumentStore((s) => s.setNodeStyle);
  const resetElementStyle = useDocumentStore((s) => s.resetElementStyle);
  const [newLabel, setNewLabel] = useState("");
  const ids = nodes.map((n) => n.id);
  const refs = ids.map((id) => ({ kind: "node" as const, id }));
  const caption = commonValue(nodes.map((n) => n.caption));
  const labels = [...new Set(nodes.flatMap((n) => n.labels))];
  const hasCustomStyle = nodes.some((n) => Object.keys(n.style).length > 0);

  const addLabel = () => {
    const label = newLabel.trim();
    if (!label) return;
    for (const n of nodes) {
      if (!n.labels.includes(label)) updateNode(n.id, { labels: [...n.labels, label] });
    }
    setNewLabel("");
  };
  const removeLabel = (label: string) => {
    for (const n of nodes) {
      if (n.labels.includes(label))
        updateNode(n.id, { labels: n.labels.filter((l) => l !== label) });
    }
  };

  return (
    <>
      <Section title={nodes.length === 1 ? t.inspector.node : t.inspector.nodes(nodes.length)}>
        <Field label={t.inspector.caption}>
          {(id) => (
            <TextInput
              id={id}
              data-testid="inspector-caption"
              value={caption ?? ""}
              placeholder={caption === null ? t.inspector.mixed : t.inspector.captionPlaceholder}
              onChange={(e) => {
                for (const n of nodes) updateNode(n.id, { caption: e.target.value });
              }}
            />
          )}
        </Field>
        <Field label={t.inspector.labels}>
          {(id) => (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1">
                {labels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 py-0.5 pr-1 pl-2 text-xs"
                  >
                    {label}
                    <button
                      type="button"
                      aria-label={`${t.inspector.removeLabel}: ${label}`}
                      className="rounded-full p-0.5 hover:bg-surface-3"
                      onClick={() => removeLabel(label)}
                    >
                      <IconClose size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <TextInput
                  id={id}
                  placeholder={t.inspector.labelPlaceholder}
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addLabel();
                  }}
                />
                <Button
                  onClick={addLabel}
                  disabled={!newLabel.trim()}
                  aria-label={t.inspector.addLabel}
                >
                  <IconPlus size={16} />
                </Button>
              </div>
            </div>
          )}
        </Field>
      </Section>
      <Section title={t.inspector.properties}>
        <PropertiesEditor refs={refs} propertySets={nodes.map((n) => n.properties)} />
      </Section>
      <Section title={t.inspector.style}>
        <StyleFields
          fields={NODE_STYLE_FIELDS}
          labels={t.inspector.styleNode}
          values={nodes.map((n) => resolvedNodeStyle(doc, n))}
          onChange={(key, value) => setNodeStyle(ids, { [key]: value })}
        />
        {hasCustomStyle && (
          <Button variant="ghost" onClick={() => resetElementStyle(refs)}>
            {t.inspector.resetStyle}
          </Button>
        )}
      </Section>
    </>
  );
}
