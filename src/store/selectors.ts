import type { BundleInfo } from "@/model/geometry";
import { circleBox, rectBox, unionBoxes } from "@/model/geometry";
import type {
  BackgroundImage,
  Box,
  ElementRef,
  GraphDocument,
  GraphNode,
  Id,
  Layer,
  NodeStyle,
  Note,
  Relationship,
  RelationshipStyle,
} from "@/model/types";

export const refKey = (ref: ElementRef): string => `${ref.kind}:${ref.id}`;
export const parseRefKey = (key: string): ElementRef => {
  const [kind, id] = key.split(":") as [ElementRef["kind"], string];
  return { kind, id };
};

export const layerById = (doc: GraphDocument, id: Id): Layer | undefined =>
  doc.layers.find((l) => l.id === id);

export const layerIndex = (doc: GraphDocument, id: Id): number =>
  doc.layers.findIndex((l) => l.id === id);

export const isLayerVisible = (doc: GraphDocument, layerId: Id): boolean =>
  layerById(doc, layerId)?.visible ?? false;

export const isLayerLocked = (doc: GraphDocument, layerId: Id): boolean =>
  layerById(doc, layerId)?.locked ?? false;

export function getElement(
  doc: GraphDocument,
  ref: ElementRef,
): GraphNode | Relationship | Note | BackgroundImage | undefined {
  switch (ref.kind) {
    case "node":
      return doc.nodes[ref.id];
    case "relationship":
      return doc.relationships[ref.id];
    case "note":
      return doc.notes[ref.id];
    case "image":
      return doc.images[ref.id];
  }
}

export const isRelationshipVisible = (doc: GraphDocument, rel: Relationship): boolean => {
  const from = doc.nodes[rel.fromId];
  const to = doc.nodes[rel.toId];
  return (
    from !== undefined &&
    to !== undefined &&
    isLayerVisible(doc, from.layerId) &&
    isLayerVisible(doc, to.layerId) &&
    (rel.layerId === undefined || isLayerVisible(doc, rel.layerId))
  );
};

export function isElementVisible(doc: GraphDocument, ref: ElementRef): boolean {
  const el = getElement(doc, ref);
  if (!el) return false;
  if (ref.kind === "relationship") return isRelationshipVisible(doc, el as Relationship);
  return el.layerId !== undefined && isLayerVisible(doc, el.layerId);
}

/** Lagret som ett element ligger i. Relationer utan eget lager (standard) ger undefined. */
export function elementLayerId(doc: GraphDocument, ref: ElementRef): Id | undefined {
  return getElement(doc, ref)?.layerId;
}

/**
 * Låst = ligger i låst lager, eller är en låst bild. En relation utan eget lager är låst när
 * någon av dess ändnoder ligger i ett låst lager; en relation i ett lager följer det lagrets lås.
 * Låsta element kan inte markeras/flyttas.
 */
export function isElementLocked(doc: GraphDocument, ref: ElementRef): boolean {
  const el = getElement(doc, ref);
  if (!el) return true;
  if (ref.kind === "relationship") {
    const rel = el as Relationship;
    const from = doc.nodes[rel.fromId];
    const to = doc.nodes[rel.toId];
    if (!from || !to) return true;
    if (rel.layerId !== undefined) return isLayerLocked(doc, rel.layerId);
    return isLayerLocked(doc, from.layerId) || isLayerLocked(doc, to.layerId);
  }
  if (el.layerId === undefined || isLayerLocked(doc, el.layerId)) return true;
  if (ref.kind === "image") return (el as BackgroundImage).locked;
  return false;
}

export const isSelectable = (doc: GraphDocument, ref: ElementRef): boolean =>
  isElementVisible(doc, ref) && !isElementLocked(doc, ref);

export function allElementRefs(doc: GraphDocument): ElementRef[] {
  return [
    ...Object.keys(doc.images).map((id): ElementRef => ({ kind: "image", id })),
    ...Object.keys(doc.relationships).map((id): ElementRef => ({ kind: "relationship", id })),
    ...Object.keys(doc.nodes).map((id): ElementRef => ({ kind: "node", id })),
    ...Object.keys(doc.notes).map((id): ElementRef => ({ kind: "note", id })),
  ];
}

/** Element i ett lager: noder, anteckningar, bilder och de relationer som lagts i lagret. */
export const elementsInLayer = (doc: GraphDocument, layerId: Id): ElementRef[] =>
  allElementRefs(doc).filter((ref) => elementLayerId(doc, ref) === layerId);

/** Antal egenskaper på noder och relationer: det som lagret "Properties" visar. */
export const countProperties = (doc: GraphDocument): number =>
  [...Object.values(doc.nodes), ...Object.values(doc.relationships)].reduce(
    (sum, el) => sum + Object.keys(el.properties).length,
    0,
  );

export const countElementsInLayer = (doc: GraphDocument, layerId: Id): number =>
  elementsInLayer(doc, layerId).length;

// ---------- Stil ----------

export const resolvedNodeStyle = (doc: GraphDocument, node: GraphNode): NodeStyle => ({
  ...doc.style.node,
  ...node.style,
});

export const resolvedRelationshipStyle = (
  doc: GraphDocument,
  rel: Relationship,
): RelationshipStyle => ({ ...doc.style.relationship, ...rel.style });

// ---------- Boxar ----------

export const nodeBox = (doc: GraphDocument, node: GraphNode): Box =>
  circleBox(node.position, resolvedNodeStyle(doc, node).radius);

export const noteBox = (note: Note): Box => rectBox(note.position, note.size);
export const imageBox = (image: BackgroundImage): Box => rectBox(image.position, image.size);

export function elementBox(doc: GraphDocument, ref: ElementRef): Box | null {
  const el = getElement(doc, ref);
  if (!el) return null;
  switch (ref.kind) {
    case "node":
      return nodeBox(doc, el as GraphNode);
    case "note":
      return noteBox(el as Note);
    case "image":
      return imageBox(el as BackgroundImage);
    case "relationship": {
      const rel = el as Relationship;
      const from = doc.nodes[rel.fromId];
      const to = doc.nodes[rel.toId];
      if (!from || !to) return null;
      return unionBoxes([nodeBox(doc, from), nodeBox(doc, to)]);
    }
  }
}

/** Omslutande box för allt innehåll (valfritt bara synliga lager). */
export function contentBounds(doc: GraphDocument, onlyVisible = true): Box | null {
  const boxes: Box[] = [];
  for (const ref of allElementRefs(doc)) {
    if (ref.kind === "relationship") continue;
    if (onlyVisible && !isElementVisible(doc, ref)) continue;
    const b = elementBox(doc, ref);
    if (b) boxes.push(b);
  }
  return unionBoxes(boxes);
}

// ---------- Parallella relationer ----------

/** Grupperar relationer per nodpar så att parallella relationer kan böjas isär. */
export function relationshipBundles(doc: GraphDocument): Map<Id, BundleInfo> {
  const groups = new Map<string, Relationship[]>();
  for (const rel of Object.values(doc.relationships)) {
    const key = rel.fromId < rel.toId ? `${rel.fromId}|${rel.toId}` : `${rel.toId}|${rel.fromId}`;
    const list = groups.get(key) ?? [];
    list.push(rel);
    groups.set(key, list);
  }
  const result = new Map<Id, BundleInfo>();
  for (const list of groups.values()) {
    list.sort((a, b) => (a.id < b.id ? -1 : 1));
    list.forEach((rel, index) => {
      result.set(rel.id, { index, count: list.length, reversed: rel.fromId > rel.toId });
    });
  }
  return result;
}

// ---------- Ritordning ----------

export interface LayerRenderGroup {
  layer: Layer;
  images: BackgroundImage[];
  nodes: GraphNode[];
  notes: Note[];
}

/** Lager i ritordning (botten → topp) med sina element i ritordning. Dolda lager utelämnas. */
export function renderGroups(doc: GraphDocument): LayerRenderGroup[] {
  const groups = new Map<Id, LayerRenderGroup>();
  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    groups.set(layer.id, { layer, images: [], nodes: [], notes: [] });
  }
  for (const im of Object.values(doc.images)) groups.get(im.layerId)?.images.push(im);
  for (const n of Object.values(doc.nodes)) groups.get(n.layerId)?.nodes.push(n);
  for (const n of Object.values(doc.notes)) groups.get(n.layerId)?.notes.push(n);
  return [...groups.values()];
}

/**
 * Relationer som syns: båda ändnoderna och relationens eventuella eget lager är synliga
 * (valfritt även godkända av filtret).
 */
export const visibleRelationships = (
  doc: GraphDocument,
  layerFilter?: (layerId: Id) => boolean,
): Relationship[] =>
  Object.values(doc.relationships).filter((rel) => {
    if (!isRelationshipVisible(doc, rel)) return false;
    if (!layerFilter) return true;
    const from = doc.nodes[rel.fromId];
    const to = doc.nodes[rel.toId];
    return (
      !!from &&
      !!to &&
      layerFilter(from.layerId) &&
      layerFilter(to.layerId) &&
      (rel.layerId === undefined || layerFilter(rel.layerId))
    );
  });
