import { type Ref, useState } from "react";
import { IconClose, IconPlus } from "@/components/icons";
import { Button, TextInput } from "@/components/ui";
import { t } from "@/i18n";
import { nodeDisplayName } from "@/model/caption";
import { conflictingNodeIds, type LabelConflict } from "@/model/labels";
import type { GraphNode } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";

/**
 * Labels för en eller flera noder: brickor som kan tas bort och ett fält för att lägga till.
 * Används både i sidopanelen och i redigeringen direkt på ritytan.
 */
export function LabelsEditor({
  nodes,
  inputId,
  inputRef,
}: {
  nodes: GraphNode[];
  inputId?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const doc = useDocumentStore((s) => s.doc);
  const setNodeLabels = useDocumentStore((s) => s.setNodeLabels);
  const [newLabel, setNewLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const labels = [...new Set(nodes.flatMap((n) => n.labels))];
  const inConflict = nodes.some((n) => conflictingNodeIds(doc.nodes).has(n.id));

  const describeConflict = (conflict: LabelConflict, attempted: string[]) => {
    const other = doc.nodes[conflict.otherId];
    return t.inspector.labelConflict(attempted.join(", "), other ? nodeDisplayName(other) : "");
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5 empty:hidden">
        {labels.map((label) => (
          <span
            key={label}
            className="inline-flex h-7 items-center gap-0.5 rounded-full bg-accent-soft pr-1 pl-3 font-medium text-[0.86em] text-accent"
          >
            {label}
            <button
              type="button"
              aria-label={`${t.inspector.removeLabel}: ${label}`}
              className="flex h-5 w-5 items-center justify-center rounded-full opacity-70 hover:bg-accent/15 hover:opacity-100"
              onClick={() => removeLabel(label)}
            >
              <IconClose size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <TextInput
          id={inputId}
          ref={inputRef}
          placeholder={t.inspector.labelPlaceholder}
          value={newLabel}
          onChange={(e) => {
            setNewLabel(e.target.value);
            setLabelError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") addLabel();
          }}
          // Det som står i fältet sparas även när man klickar någon annanstans.
          onBlur={addLabel}
        />
        <Button
          onClick={addLabel}
          disabled={!newLabel.trim()}
          aria-label={t.inspector.addLabel}
          className="w-9 px-0"
        >
          <IconPlus size={16} />
        </Button>
      </div>
      {labelError && (
        <p
          role="alert"
          data-testid="label-error"
          className="rounded-lg bg-danger/10 px-3 py-2 text-[0.88em] text-danger leading-snug"
        >
          {labelError}
        </p>
      )}
      {!labelError && inConflict && (
        <p
          data-testid="label-warning"
          className="rounded-lg bg-warning/10 px-3 py-2 text-[0.88em] text-warning leading-snug"
        >
          {t.inspector.labelConflictExisting}
        </p>
      )}
    </div>
  );
}
