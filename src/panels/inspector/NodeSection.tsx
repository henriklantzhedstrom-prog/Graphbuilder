import { useState } from "react";
import { IconClose, IconPlus } from "@/components/icons";
import { Button, Field, Section, TextInput } from "@/components/ui";
import { t } from "@/i18n";
import { nodeCaption } from "@/model/caption";
import { conflictingNodeIds, type LabelConflict } from "@/model/labels";
import type { GraphNode } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { resolvedNodeStyle } from "@/store/selectors";
import { NODE_STYLE_FIELDS } from "./common";
import { PropertiesEditor } from "./PropertiesEditor";
import { StyleFields } from "./StyleFields";

export function NodeSection({ nodes }: { nodes: GraphNode[] }) {
  const doc = useDocumentStore((s) => s.doc);
  const setNodeStyle = useDocumentStore((s) => s.setNodeStyle);
  const resetElementStyle = useDocumentStore((s) => s.resetElementStyle);
  const setCaptionKey = useDocumentStore((s) => s.setCaptionKey);
  const setNodeLabels = useDocumentStore((s) => s.setNodeLabels);
  const [newLabel, setNewLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const ids = nodes.map((n) => n.id);
  const refs = ids.map((id) => ({ kind: "node" as const, id }));
  const labels = [...new Set(nodes.flatMap((n) => n.labels))];
  const hasCustomStyle = nodes.some((n) => Object.keys(n.style).length > 0);

  const inConflict = nodes.some((n) => conflictingNodeIds(doc.nodes).has(n.id));

  const describeConflict = (conflict: LabelConflict, labels: string[]) => {
    const other = doc.nodes[conflict.otherId];
    return t.inspector.labelConflict(labels.join(", "), other ? nodeCaption(other) : "");
  };

  const applyLabels = (changes: { id: string; labels: string[] }[]): boolean => {
    if (changes.length === 0) return true;
    const result = setNodeLabels(changes);
    if (result.ok) {
      setLabelError(null);
      return true;
    }
    const attempted = changes.find((c) => c.id === result.conflict.nodeId)?.labels ?? [];
    setLabelError(describeConflict(result.conflict, attempted));
    return false;
  };

  const addLabel = () => {
    const label = newLabel.trim();
    if (!label) return;
    const changes = nodes
      .filter((n) => !n.labels.includes(label))
      .map((n) => ({ id: n.id, labels: [...n.labels, label] }));
    if (applyLabels(changes)) setNewLabel("");
  };
  const removeLabel = (label: string) => {
    applyLabels(
      nodes
        .filter((n) => n.labels.includes(label))
        .map((n) => ({ id: n.id, labels: n.labels.filter((l) => l !== label) })),
    );
  };

  return (
    <>
      <Section title={nodes.length === 1 ? t.inspector.node : t.inspector.nodes(nodes.length)}>
        <Field label={t.inspector.labels}>
          {(id) => (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1">
                {labels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 py-0.5 pr-1 pl-2 text-[0.86em]"
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
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    setLabelError(null);
                  }}
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
              {labelError && (
                <p role="alert" data-testid="label-error" className="text-danger text-[1em]">
                  {labelError}
                </p>
              )}
              {!labelError && inConflict && (
                <p data-testid="label-warning" className="text-[1em] text-amber-600">
                  {t.inspector.labelConflictExisting}
                </p>
              )}
            </div>
          )}
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
