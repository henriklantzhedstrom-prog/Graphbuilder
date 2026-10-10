import { unionBoxes } from "@/model/geometry";
import type { Box, GraphDocument, GraphNode, Relationship } from "@/model/types";
import {
  imageBox,
  isElementVisible,
  noteBox,
  relationshipBundles,
  resolvedNodeStyle,
  resolvedRelationshipStyle,
} from "@/store/selectors";
import { labelLayout } from "./labels";
import { PROPERTY_PADDING_X, PROPERTY_PADDING_Y, propertyTextWidth } from "./PropertyBackground";
import { computeRelationshipGeometry } from "./Scene";
import { LINE_HEIGHT, measureTextWidth, propertyLines, TYPE_PADDING_X } from "./text";

/** Allt som ritas för en nod: cirkeln med kant, labels ovanför och egenskapsrutan under. */
export function drawnNodeBoxes(doc: GraphDocument, node: GraphNode): Box[] {
  const style = resolvedNodeStyle(doc, node);
  const { x, y } = node.position;
  const outerR = style.radius + style.strokeWidth / 2;
  const boxes: Box[] = [{ x: x - outerR, y: y - outerR, w: outerR * 2, h: outerR * 2 }];
  const labels = labelLayout(node.labels, style, x, y - outerR).outer;
  if (labels) boxes.push(labels);
  const lines = doc.propertiesVisible ? propertyLines(node.properties) : [];
  if (lines.length > 0) {
    const fontSize = style.propertyFontSize;
    const width = propertyTextWidth(lines, fontSize) + PROPERTY_PADDING_X * 2;
    const firstBaseline = y + outerR + 6 + fontSize;
    boxes.push({
      x: x - width / 2,
      y: firstBaseline - fontSize * 0.9 - PROPERTY_PADDING_Y,
      w: width,
      h: (lines.length - 1) * fontSize * LINE_HEIGHT + fontSize * 1.15 + PROPERTY_PADDING_Y * 2,
    });
  }
  return boxes;
}

/**
 * Ytan som relationens typ och egenskaper kan uppta. Texten följer linjens lutning, så rutan är
 * en kvadrat kring textens fästpunkt som rymmer den oavsett vinkel.
 */
function drawnRelationshipLabelBox(
  doc: GraphDocument,
  rel: Relationship,
  bundles: ReturnType<typeof relationshipBundles>,
): Box | null {
  const geometry = computeRelationshipGeometry(doc, rel, bundles);
  if (!geometry) return null;
  const style = resolvedRelationshipStyle(doc, rel);
  const typeWidth = rel.type
    ? measureTextWidth(rel.type, style.typeFontSize) + TYPE_PADDING_X * 2
    : 0;
  const typeHeight = rel.type ? style.typeFontSize * 1.4 : 0;
  const lines = doc.propertiesVisible ? propertyLines(rel.properties) : [];
  const fontSize = style.propertyFontSize;
  const propsWidth =
    lines.length > 0 ? propertyTextWidth(lines, fontSize) + PROPERTY_PADDING_X * 2 : 0;
  const propsHeight =
    lines.length > 0
      ? 2 + (lines.length - 1) * fontSize * LINE_HEIGHT + fontSize * 1.25 + PROPERTY_PADDING_Y * 2
      : 0;
  const reach = Math.hypot(
    Math.max(typeWidth, propsWidth) / 2,
    typeHeight / 2 + propsHeight,
    style.width,
  );
  if (reach === 0) return null;
  const { x, y } = geometry.labelPosition;
  return { x: x - reach, y: y - reach, w: reach * 2, h: reach * 2 };
}

/**
 * Omslutande ruta för allt som faktiskt ritas: noder med kant, labels och egenskaper,
 * relationernas texter, anteckningar och bilder. Används för export och "Fit to content" så att
 * långa egenskapslistor inte hamnar utanför.
 */
export function drawnBounds(doc: GraphDocument, onlyVisible = true): Box | null {
  const boxes: Box[] = [];
  const shown = (kind: "node" | "relationship" | "note" | "image", id: string) =>
    !onlyVisible || isElementVisible(doc, { kind, id });
  for (const image of Object.values(doc.images)) {
    if (shown("image", image.id)) boxes.push(imageBox(image));
  }
  for (const note of Object.values(doc.notes)) {
    if (shown("note", note.id)) boxes.push(noteBox(note));
  }
  for (const node of Object.values(doc.nodes)) {
    if (shown("node", node.id)) boxes.push(...drawnNodeBoxes(doc, node));
  }
  const bundles = relationshipBundles(doc);
  for (const rel of Object.values(doc.relationships)) {
    if (!shown("relationship", rel.id)) continue;
    const box = drawnRelationshipLabelBox(doc, rel, bundles);
    if (box) boxes.push(box);
  }
  return unionBoxes(boxes);
}
