import { z } from "zod";
import { t } from "@/i18n";
import { captionKeyFor } from "@/model/caption";
import { createEmptyDocument } from "@/model/defaults";
import { newId } from "@/model/ids";
import { DocumentParseError } from "@/model/schema";
import type { GraphDocument, NodeStyle, RelationshipStyle } from "@/model/types";

/** arrows.app:s JSON-format (export → JSON). Okända fält ignoreras. */
const arrowsStyle = z.record(z.string(), z.unknown()).default({});
const arrowsNode = z.object({
  id: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  caption: z.string().default(""),
  labels: z.array(z.string()).default([]),
  properties: z.record(z.string(), z.unknown()).default({}),
  style: arrowsStyle,
});
const arrowsRelationship = z.object({
  id: z.string(),
  fromId: z.string(),
  toId: z.string(),
  type: z.string().default(""),
  properties: z.record(z.string(), z.unknown()).default({}),
  style: arrowsStyle,
});
export const arrowsSchema = z.object({
  style: arrowsStyle,
  nodes: z.array(arrowsNode).default([]),
  relationships: z.array(arrowsRelationship).default([]),
});

const NODE_STYLE_KEYS: Record<string, keyof NodeStyle> = {
  "node-color": "fill",
  "border-color": "stroke",
  "border-width": "strokeWidth",
  radius: "radius",
  "caption-color": "captionColor",
  "caption-font-size": "captionFontSize",
  "label-color": "labelColor",
  "label-background-color": "labelBackground",
  "label-font-size": "labelFontSize",
  "property-color": "propertyColor",
  "property-font-size": "propertyFontSize",
};

const RELATIONSHIP_STYLE_KEYS: Record<string, keyof RelationshipStyle> = {
  "arrow-color": "color",
  "arrow-width": "width",
  "type-color": "typeColor",
  "type-background-color": "typeBackground",
  "type-font-size": "typeFontSize",
  "property-color": "propertyColor",
  "property-font-size": "propertyFontSize",
};

function mapStyle<K extends string>(
  style: Record<string, unknown>,
  keys: Record<string, K>,
): Partial<Record<K, string | number | boolean>> {
  const out: Partial<Record<K, string | number | boolean>> = {};
  for (const [arrowsKey, ourKey] of Object.entries(keys)) {
    const v = style[arrowsKey];
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[ourKey] = v;
  }
  return out;
}

const mapNodeStyle = (style: Record<string, unknown>): Partial<NodeStyle> =>
  mapStyle(style, NODE_STYLE_KEYS) as Partial<NodeStyle>;

function mapRelationshipStyle(style: Record<string, unknown>): Partial<RelationshipStyle> {
  const out = mapStyle(style, RELATIONSHIP_STYLE_KEYS) as Partial<RelationshipStyle>;
  if (style.directionality === "undirected") out.directed = false;
  if (style.directionality === "directed") out.directed = true;
  return out;
}

/** arrows.app har rubriken som eget fält; här blir den en egenskap som markeras som rubrik. */
function captionAsProperty(properties: Record<string, string>, caption: string) {
  if (!caption) return { properties, captionKey: null };
  const key = captionKeyFor(properties, caption);
  return { properties: { ...properties, [key]: caption }, captionKey: key };
}

const stringProps = (props: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(props).map(([k, v]) => [k, v == null ? "" : String(v)]));

export function importArrowsJson(text: string, name: string): GraphDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new DocumentParseError(t.errors.invalidJson);
  }
  const parsed = arrowsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DocumentParseError(
      t.errors.notArrows,
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  }
  const doc = createEmptyDocument(name);
  const layerId = doc.layers[0]?.id ?? "";
  Object.assign(doc.style.node, mapNodeStyle(parsed.data.style));
  Object.assign(doc.style.relationship, mapRelationshipStyle(parsed.data.style));
  const bg = parsed.data.style["background-color"];
  if (typeof bg === "string") doc.style.background = bg;

  const idMap = new Map<string, string>();
  for (const n of parsed.data.nodes) {
    const id = newId("n");
    idMap.set(n.id, id);
    doc.nodes[id] = {
      id,
      layerId,
      position: n.position,
      ...captionAsProperty(stringProps(n.properties), n.caption),
      labels: n.labels,
      style: mapNodeStyle(n.style),
    };
  }
  for (const r of parsed.data.relationships) {
    const fromId = idMap.get(r.fromId);
    const toId = idMap.get(r.toId);
    if (!fromId || !toId) continue;
    const id = newId("r");
    doc.relationships[id] = {
      id,
      layerId,
      fromId,
      toId,
      type: r.type,
      properties: stringProps(r.properties),
      style: mapRelationshipStyle(r.style),
    };
  }
  return doc;
}
