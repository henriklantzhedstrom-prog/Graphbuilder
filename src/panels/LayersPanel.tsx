import { useState } from "react";
import { selectLayer } from "@/canvas/actions";
import { Dialog } from "@/components/Dialog";
import {
  IconChevronDown,
  IconChevronUp,
  IconEye,
  IconEyeOff,
  IconGrip,
  IconLock,
  IconPlus,
  IconSelectAll,
  IconTrash,
  IconUnlock,
} from "@/components/icons";
import { Button, cx, IconButton, TextInput } from "@/components/ui";
import { t } from "@/i18n";
import type { Id, Layer } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { countElementsInLayer } from "@/store/selectors";
import { useUiStore } from "@/store/uiStore";

export function LayersPanel() {
  const doc = useDocumentStore((s) => s.doc);
  const addLayer = useDocumentStore((s) => s.addLayer);
  const moveLayer = useDocumentStore((s) => s.moveLayer);
  const activeLayerId = useUiStore((s) => s.activeLayerId);
  const setActiveLayer = useUiStore((s) => s.setActiveLayer);
  const [dragId, setDragId] = useState<Id | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [toRemove, setToRemove] = useState<Layer | null>(null);

  // Visas topp → botten, dokumentet lagrar botten → topp.
  const layersTopFirst = [...doc.layers].reverse();
  const toDocIndex = (visualIndex: number) => doc.layers.length - 1 - visualIndex;

  const onAdd = () => {
    const id = addLayer();
    setActiveLayer(id);
  };

  return (
    <div className="flex flex-col" data-testid="layers-panel">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-text-muted text-[0.86em]">{t.layers.hint}</span>
      </div>
      <div className="px-3 pb-2">
        <Button onClick={onAdd} data-testid="add-layer">
          <IconPlus size={16} />
          {t.layers.add}
        </Button>
      </div>
      <ul className="flex flex-col">
        {layersTopFirst.map((layer, visualIndex) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            count={countElementsInLayer(doc, layer.id)}
            active={layer.id === activeLayerId}
            isTop={visualIndex === 0}
            isBottom={visualIndex === layersTopFirst.length - 1}
            canRemove={doc.layers.length > 1}
            dropHighlight={dropIndex === visualIndex && dragId !== null && dragId !== layer.id}
            onActivate={() => setActiveLayer(layer.id)}
            onMoveUp={() => moveLayer(layer.id, toDocIndex(visualIndex) + 1)}
            onMoveDown={() => moveLayer(layer.id, toDocIndex(visualIndex) - 1)}
            onRemove={() => setToRemove(layer)}
            onDragStart={() => setDragId(layer.id)}
            onDragOver={() => setDropIndex(visualIndex)}
            onDrop={() => {
              if (dragId && dragId !== layer.id) moveLayer(dragId, toDocIndex(visualIndex));
              setDragId(null);
              setDropIndex(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setDropIndex(null);
            }}
          />
        ))}
      </ul>
      {toRemove && <RemoveLayerDialog layer={toRemove} onClose={() => setToRemove(null)} />}
    </div>
  );
}

function LayerRow({
  layer,
  count,
  active,
  isTop,
  isBottom,
  canRemove,
  dropHighlight,
  onActivate,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  layer: Layer;
  count: number;
  active: boolean;
  isTop: boolean;
  isBottom: boolean;
  canRemove: boolean;
  dropHighlight: boolean;
  onActivate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const renameLayer = useDocumentStore((s) => s.renameLayer);
  const setLayerVisible = useDocumentStore((s) => s.setLayerVisible);
  const setLayerLocked = useDocumentStore((s) => s.setLayerLocked);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(layer.name);

  const commitName = () => {
    const name = draft.trim();
    if (name && name !== layer.name) renameLayer(layer.id, name);
    else setDraft(layer.name);
    setEditing(false);
  };

  return (
    <li
      data-testid="layer-row"
      data-layer-id={layer.id}
      data-active={active || undefined}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      className={cx(
        "border-border border-b",
        active ? "bg-accent-soft/60" : "hover:bg-surface-2",
        dropHighlight && "outline-2 outline-accent -outline-offset-2",
        !layer.visible && "opacity-60",
      )}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="cursor-grab text-text-muted" title={t.layers.moveUp}>
          <IconGrip size={16} />
        </span>
        <IconButton
          label={layer.visible ? t.layers.hide : t.layers.show}
          data-testid="layer-visibility"
          onClick={() => setLayerVisible(layer.id, !layer.visible)}
        >
          {layer.visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
        </IconButton>
        <IconButton
          label={layer.locked ? t.layers.unlock : t.layers.lock}
          data-testid="layer-lock"
          onClick={() => setLayerLocked(layer.id, !layer.locked)}
          className={layer.locked ? "text-accent" : ""}
        >
          {layer.locked ? <IconLock size={16} /> : <IconUnlock size={16} />}
        </IconButton>
        {editing ? (
          <TextInput
            aria-label={t.layers.namePlaceholder}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setDraft(layer.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            data-testid="layer-name"
            className={cx("min-w-0 flex-1 truncate text-left text-[1em]", active && "font-medium")}
            title={`${layer.name} – ${t.layers.rename}`}
            onClick={onActivate}
            onDoubleClick={() => {
              setDraft(layer.name);
              setEditing(true);
            }}
          >
            {layer.name}
          </button>
        )}
        <span
          className="text-text-muted text-[0.86em] tabular-nums"
          title={t.layers.elementCount(count)}
        >
          {count}
        </span>
      </div>
      {active && (
        <div className="flex flex-col gap-2 px-3 pb-2">
          <div className="flex gap-0.5">
            <IconButton label={t.layers.moveUp} onClick={onMoveUp} disabled={isTop}>
              <IconChevronUp size={16} />
            </IconButton>
            <IconButton label={t.layers.moveDown} onClick={onMoveDown} disabled={isBottom}>
              <IconChevronDown size={16} />
            </IconButton>
            <IconButton label={t.layers.selectAll} onClick={() => selectLayer(layer.id)}>
              <IconSelectAll size={16} />
            </IconButton>
            <div className="flex-1" />
            <IconButton
              label={t.layers.remove}
              data-testid="layer-remove"
              onClick={onRemove}
              disabled={!canRemove}
              className="text-danger"
            >
              <IconTrash size={16} />
            </IconButton>
          </div>
        </div>
      )}
    </li>
  );
}

function RemoveLayerDialog({ layer, onClose }: { layer: Layer; onClose: () => void }) {
  const doc = useDocumentStore((s) => s.doc);
  const removeLayer = useDocumentStore((s) => s.removeLayer);
  const count = countElementsInLayer(doc, layer.id);
  const others = doc.layers.filter((l) => l.id !== layer.id);
  const [target, setTarget] = useState<Id>(others[others.length - 1]?.id ?? "");

  const remove = (moveTo?: Id) => {
    removeLayer(layer.id, moveTo);
    onClose();
  };

  return (
    <Dialog
      title={t.layers.removeTitle(layer.name)}
      open
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          {count > 0 && (
            <Button variant="danger" onClick={() => remove()} data-testid="remove-layer-delete">
              {t.layers.removeDeleteContent}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => remove(count > 0 ? target : undefined)}
            data-testid="remove-layer-confirm"
          >
            {count > 0 ? t.layers.removeMoveTo : t.layers.removeEmpty}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-[1em]">{t.layers.removeBody(count)}</p>
      {count > 0 && (
        <label className="flex items-center gap-2 text-[1em]">
          {t.layers.removeMoveTo}
          <select
            className="h-8 rounded-md border border-border bg-surface px-1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {[...others].reverse().map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </Dialog>
  );
}
