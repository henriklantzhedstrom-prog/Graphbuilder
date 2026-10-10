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
  Point,
  Relationship,
  RelationshipStyle,
} from "@/model/types";

/** Standardvärdet för egenskapernas bakgrund; betyder "följ modellens bakgrund". */
const DEFAULT_PROPERTY_BACKGROUND = "#ffffff";

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

/**
 * En anteckning syns när det fasta lagret "Notes" är synligt och, om den är knuten till en nod
 * eller relation, när den noden eller relationen syns.
 */
export const isNoteVisible = (doc: GraphDocument, note: Note): boolean =>
  doc.notesVisible && (!note.attachedTo || isElementVisible(doc, note.attachedTo));

export function isElementVisible(doc: GraphDocument, ref: ElementRef): boolean {
  const el = getElement(doc, ref);
  if (!el) return false;
  if (ref.kind === "relationship") return isRelationshipVisible(doc, el as Relationship);
  if (ref.kind === "note") return isNoteVisible(doc, el as Note);
  const { layerId } = el as GraphNode | BackgroundImage;
  return isLayerVisible(doc, layerId);
}

/**
 * Lagret som ett element ligger i. Relationer utan eget lager (standard) och anteckningar (som
 * har det fasta lagret "Notes") ger undefined.
 */
export function elementLayerId(doc: GraphDocument, ref: ElementRef): Id | undefined {
  if (ref.kind === "note") return undefined;
  return (getElement(doc, ref) as GraphNode | Relationship | BackgroundImage | undefined)?.layerId;
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
  // Anteckningar ligger inte i något låsbart lager.
  if (ref.kind === "note") return false;
  if (isLayerLocked(doc, (el as GraphNode | BackgroundImage).layerId)) return true;
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

/**
 * Bakgrunden bakom egenskapsraderna väljs inte av användaren: den följer modellens bakgrundsfärg,
 * så att rutan smälter in och bara döljer linjer som passerar bakom. En annan sparad färg (från
 * en äldre modell) behålls.
 */
const propertyBackgroundFor = (doc: GraphDocument, stored: string): string =>
  stored.toLowerCase() === DEFAULT_PROPERTY_BACKGROUND ? doc.style.background : stored;

export const resolvedNodeStyle = (doc: GraphDocument, node: GraphNode): NodeStyle => {
  const style = { ...doc.style.node, ...node.style };
  return { ...style, propertyBackground: propertyBackgroundFor(doc, style.propertyBackground) };
};

export const resolvedRelationshipStyle = (
  doc: GraphDocument,
  rel: Relationship,
): RelationshipStyle => {
  const style = { ...doc.style.relationship, ...rel.style };
  return { ...style, propertyBackground: propertyBackgroundFor(doc, style.propertyBackground) };
};

// ---------- Boxar ----------

/**
 * Nodens ytterradie. `radius` är den fyllda ytans radie; kanten ritas utanför den, så en
 * tjockare kant växer utåt och tar aldrig plats från rubriken.
 */
export const nodeOuterRadius = (style: Pick<NodeStyle, "radius" | "strokeWidth">): number =>
  style.radius + style.strokeWidth;

export const nodeBox = (doc: GraphDocument, node: GraphNode): Box =>
  circleBox(node.position, nodeOuterRadius(resolvedNodeStyle(doc, node)));

export const noteBox = (note: Note): Box => rectBox(note.position, note.size);

/** Punkten en anteckning är knuten till: nodens mitt, eller mitt emellan relationens noder. */
export function noteAnchorPoint(doc: GraphDocument, note: Note): Point | null {
  const anchor = note.attachedTo;
  if (!anchor) return null;
  if (anchor.kind === "node") return doc.nodes[anchor.id]?.position ?? null;
  const rel = doc.relationships[anchor.id];
  const from = rel ? doc.nodes[rel.fromId] : undefined;
  const to = rel ? doc.nodes[rel.toId] : undefined;
  if (!from || !to) return null;
  return { x: (from.position.x + to.position.x) / 2, y: (from.position.y + to.position.y) / 2 };
}

/**
 * Hur mycket knutna anteckningar ska flytta sig när noderna `movedNodeIds` flyttas `delta`.
 * En anteckning på en nod följer noden helt; en anteckning på en relation följer relationens
 * mitt, alltså halva sträckan per flyttad ändnod. Anteckningar i `excluded` (de som själva
 * flyttas) tas inte med.
 */
export function attachedNoteMoves(
  doc: GraphDocument,
  movedNodeIds: ReadonlySet<Id>,
  delta: Point,
  excluded: ReadonlySet<Id> = new Set(),
): Map<Id, Point> {
  const moves = new Map<Id, Point>();
  if (movedNodeIds.size === 0) return moves;
  for (const note of Object.values(doc.notes)) {
    const anchor = note.attachedTo;
    if (!anchor || excluded.has(note.id)) continue;
    let share = 0;
    if (anchor.kind === "node") {
      share = movedNodeIds.has(anchor.id) ? 1 : 0;
    } else {
      const rel = doc.relationships[anchor.id];
      if (rel) {
        share = (movedNodeIds.has(rel.fromId) ? 0.5 : 0) + (movedNodeIds.has(rel.toId) ? 0.5 : 0);
      }
    }
    if (share > 0) moves.set(note.id, { x: delta.x * share, y: delta.y * share });
  }
  return moves;
}
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
}

/** Lager i ritordning (botten → topp) med sina element i ritordning. Dolda lager utelämnas. */
export function renderGroups(doc: GraphDocument): LayerRenderGroup[] {
  const groups = new Map<Id, LayerRenderGroup>();
  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    groups.set(layer.id, { layer, images: [], nodes: [] });
  }
  for (const im of Object.values(doc.images)) groups.get(im.layerId)?.images.push(im);
  for (const n of Object.values(doc.nodes)) groups.get(n.layerId)?.nodes.push(n);
  return [...groups.values()];
}

/** Anteckningar som syns (det fasta lagret "Notes" och det de är knutna till). */
export const visibleNotes = (doc: GraphDocument): Note[] =>
  Object.values(doc.notes).filter((note) => isNoteVisible(doc, note));

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
