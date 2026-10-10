import { t } from "@/i18n";
import { fitBoxInViewport, zoomAt } from "@/model/geometry";
import type { Box, ElementRef, Id, Point, Size } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import {
  allElementRefs,
  contentBounds,
  elementLayerId,
  getElement,
  isElementLocked,
  isSelectable,
  layerById,
} from "@/store/selectors";
import { useUiStore } from "@/store/uiStore";

const docState = () => useDocumentStore.getState();
const ui = () => useUiStore.getState();

/** Aktivt lager (finns och är olåst), annars null med en toast. */
export function resolveActiveLayer(notify = true): Id | null {
  const { doc } = docState();
  const { activeLayerId, showToast, setActiveLayer } = ui();
  let layer = activeLayerId ? layerById(doc, activeLayerId) : undefined;
  if (!layer) {
    layer = doc.layers[doc.layers.length - 1];
    if (layer) setActiveLayer(layer.id);
  }
  if (!layer) return null;
  if (layer.locked) {
    if (notify) showToast(t.toasts.layerLocked, "error");
    return null;
  }
  return layer.id;
}

export function createNodeAt(position: Point, edit = true): Id | null {
  const layerId = resolveActiveLayer();
  if (!layerId) return null;
  const id = docState().addNode(layerId, position);
  const ref: ElementRef = { kind: "node", id };
  ui().setSelection([ref]);
  if (edit) ui().setEditing(ref);
  return id;
}

/** Nya relationer får inget eget lager, så de kan skapas oavsett vilket lager som är aktivt. */
export function createRelationship(fromId: Id, toId: Id, edit = true): Id | null {
  const id = docState().addRelationship(fromId, toId);
  if (!(id in docState().doc.relationships)) return null;
  const ref: ElementRef = { kind: "relationship", id };
  ui().setSelection([ref]);
  if (edit) ui().setEditing(ref);
  return id;
}

export function createNoteAt(box: Box, edit = true): Id | null {
  const layerId = resolveActiveLayer();
  if (!layerId) return null;
  const id = docState().addNote(layerId, { x: box.x, y: box.y }, { size: { w: box.w, h: box.h } });
  const ref: ElementRef = { kind: "note", id };
  ui().setSelection([ref]);
  if (edit) ui().setEditing(ref);
  return id;
}

export const movableSelection = (): ElementRef[] => {
  const { doc } = docState();
  return ui().selection.filter(
    (r) => r.kind !== "relationship" && !isElementLocked(doc, r) && getElement(doc, r),
  );
};

export function deleteSelection(): void {
  const { selection, setSelection, setEditing } = ui();
  if (selection.length === 0) return;
  docState().deleteElements(selection);
  setSelection([]);
  setEditing(null);
}

/** Antal kopierade noder som tappade sina labels för att labelkombinationen redan fanns. */
function strippedLabelCount(sourceNodes: { labels: string[] }[], created: ElementRef[]): number {
  const { doc } = docState();
  const copies = created.filter((r) => r.kind === "node").map((r) => doc.nodes[r.id]);
  return sourceNodes.filter((n, i) => n.labels.length > 0 && copies[i]?.labels.length === 0).length;
}

function notifyStrippedLabels(count: number): void {
  if (count > 0) ui().showToast(t.toasts.labelsStrippedOnCopy(count));
}

export function duplicateSelection(): void {
  const { selection, setSelection } = ui();
  if (selection.length === 0) return;
  const source = docState().copyElements(selection);
  const created = docState().duplicateElements(selection);
  setSelection(created);
  notifyStrippedLabels(strippedLabelCount(source.nodes, created));
}

export function copySelection(): void {
  const { selection, setClipboard, showToast } = ui();
  if (selection.length === 0) {
    showToast(t.toasts.nothingToCopy);
    return;
  }
  setClipboard(docState().copyElements(selection));
}

export function cutSelection(): void {
  copySelection();
  deleteSelection();
}

export function pasteClipboard(): void {
  const { clipboard, setSelection, showToast } = ui();
  if (!clipboard) return;
  const layerId = resolveActiveLayer();
  if (!layerId) return;
  const created = docState().pasteElements(clipboard, layerId);
  setSelection(created);
  const stripped = strippedLabelCount(clipboard.nodes, created);
  if (stripped > 0) notifyStrippedLabels(stripped);
  else showToast(t.toasts.pasted(created.length));
}

export function selectAll(): void {
  const { doc } = docState();
  ui().setSelection(allElementRefs(doc).filter((r) => isSelectable(doc, r)));
}

export function selectLayer(layerId: Id): void {
  const { doc } = docState();
  ui().setSelection(
    allElementRefs(doc).filter((r) => elementLayerId(doc, r) === layerId && isSelectable(doc, r)),
  );
}

export function nudgeSelection(delta: Point): void {
  const refs = movableSelection();
  if (refs.length === 0) return;
  docState().moveElements(refs, delta);
}

export function reverseSelectedRelationships(): void {
  const ids = ui()
    .selection.filter((r) => r.kind === "relationship")
    .map((r) => r.id);
  if (ids.length > 0) docState().reverseRelationships(ids);
}

export function startEditingSelection(): void {
  const { selection, setEditing } = ui();
  const only = selection.length === 1 ? selection[0] : undefined;
  if (only && only.kind !== "image") setEditing(only);
}

export function fitToContent(viewportSize: Size): void {
  const bounds = contentBounds(docState().doc) ?? { x: 0, y: 0, w: 0, h: 0 };
  ui().setViewport(fitBoxInViewport(bounds, viewportSize, 60));
}

export function zoomBy(factor: number, viewportSize: Size): void {
  const { viewport, setViewport } = ui();
  setViewport(zoomAt(viewport, { x: viewportSize.w / 2, y: viewportSize.h / 2 }, factor));
}

export function resetZoom(viewportSize: Size): void {
  const { viewport, setViewport } = ui();
  setViewport(
    zoomAt(viewport, { x: viewportSize.w / 2, y: viewportSize.h / 2 }, 1 / viewport.zoom),
  );
}

/** Mittpunkten av synlig yta i canvas-koordinater – där nya element hamnar från knappar. */
export function viewportCenter(viewportSize: Size): Point {
  const { viewport } = ui();
  return {
    x: (viewportSize.w / 2 - viewport.x) / viewport.zoom,
    y: (viewportSize.h / 2 - viewport.y) / viewport.zoom,
  };
}

export const NEW_NODE_OFFSET = 40;

/**
 * Skapar en nod mitt i den synliga ytan (knappen "Add node"). Ligger det redan en nod där
 * förskjuts den nya snett nedåt så att noderna inte hamnar exakt ovanpå varandra.
 */
export function addNodeInView(viewportSize: Size): Id | null {
  const { doc } = docState();
  const position = viewportCenter(viewportSize);
  const taken = (p: Point) =>
    Object.values(doc.nodes).some(
      (n) => Math.abs(n.position.x - p.x) < 10 && Math.abs(n.position.y - p.y) < 10,
    );
  for (let i = 0; i < 50 && taken(position); i++) {
    position.x += NEW_NODE_OFFSET;
    position.y += NEW_NODE_OFFSET;
  }
  return createNodeAt(position);
}

/** Rensa markering/redigering som pekar på borttagna eller dolda element. */
export function syncSelectionWithDocument(): void {
  const { doc } = docState();
  ui().pruneSelection((ref) => getElement(doc, ref) !== undefined && isSelectable(doc, ref));
}
