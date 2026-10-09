import { z } from "zod";
import { t } from "@/i18n";
import { createLayer, DEFAULT_DIAGRAM_STYLE } from "./defaults";
import { DOCUMENT_VERSION, type GraphDocument } from "./types";

const point = z.object({ x: z.number(), y: z.number() });
const size = z.object({ w: z.number().positive(), h: z.number().positive() });
const stringRecord = z.record(z.string(), z.string());

const nodeStyle = z.object({
  radius: z.number().positive(),
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number().min(0),
  captionColor: z.string(),
  captionFontSize: z.number().positive(),
  labelColor: z.string(),
  labelBackground: z.string(),
  labelFontSize: z.number().positive(),
  propertyColor: z.string(),
  propertyFontSize: z.number().positive(),
});

const relationshipStyle = z.object({
  color: z.string(),
  width: z.number().min(0),
  arrowSize: z.number().min(0),
  dashed: z.boolean(),
  typeColor: z.string(),
  typeFontSize: z.number().positive(),
  typeBackground: z.string(),
  propertyColor: z.string(),
  propertyFontSize: z.number().positive(),
  directed: z.boolean(),
});

const layer = z.object({
  id: z.string().min(1),
  name: z.string(),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  opacity: z.number().min(0).max(1).default(1),
});

const graphNode = z.object({
  id: z.string().min(1),
  layerId: z.string().min(1),
  position: point,
  caption: z.string().default(""),
  labels: z.array(z.string()).default([]),
  properties: stringRecord.default({}),
  style: nodeStyle.partial().default({}),
});

const relationship = z.object({
  id: z.string().min(1),
  layerId: z.string().min(1),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  type: z.string().default(""),
  properties: stringRecord.default({}),
  style: relationshipStyle.partial().default({}),
});

const note = z.object({
  id: z.string().min(1),
  layerId: z.string().min(1),
  position: point,
  size,
  text: z.string().default(""),
  color: z.string(),
  textColor: z.string().default("#1b1f27"),
  fontSize: z.number().positive().default(14),
  align: z.enum(["left", "center"]).default("left"),
});

const backgroundImage = z.object({
  id: z.string().min(1),
  layerId: z.string().min(1),
  assetId: z.string().min(1),
  position: point,
  size,
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().default(false),
});

const asset = z.object({
  id: z.string().min(1),
  mime: z.string(),
  dataUrl: z.string().startsWith("data:"),
  width: z.number().positive(),
  height: z.number().positive(),
});

const diagramStyle = z.object({
  node: nodeStyle.partial().default({}),
  relationship: relationshipStyle.partial().default({}),
  background: z.string().default(DEFAULT_DIAGRAM_STYLE.background),
});

export const documentSchemaV1 = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().default(t.app.untitled),
  createdAt: z.string(),
  updatedAt: z.string(),
  layers: z.array(layer),
  nodes: z.record(z.string(), graphNode).default({}),
  relationships: z.record(z.string(), relationship).default({}),
  notes: z.record(z.string(), note).default({}),
  images: z.record(z.string(), backgroundImage).default({}),
  assets: z.record(z.string(), asset).default({}),
  style: diagramStyle.default({ node: {}, relationship: {}, background: "#ffffff" }),
});

export class DocumentParseError extends Error {
  constructor(
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
    this.name = "DocumentParseError";
  }
}

/**
 * Validerar och migrerar okänd JSON till ett GraphDocument i aktuell version.
 * Lagar inkonsekvenser som kan uppstå i filer: element i saknade lager flyttas
 * till första lagret, relationer utan båda ändnoder tas bort, bilder utan asset tas bort.
 */
export function parseDocument(input: unknown): GraphDocument {
  if (typeof input !== "object" || input === null) {
    throw new DocumentParseError(t.errors.notAModel);
  }
  const version = (input as { version?: unknown }).version;
  if (version !== DOCUMENT_VERSION) {
    throw new DocumentParseError(t.errors.wrongVersion(String(version), DOCUMENT_VERSION));
  }
  const result = documentSchemaV1.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new DocumentParseError(t.errors.invalidFormat, issues);
  }
  return repairDocument(result.data);
}

function repairDocument(doc: z.infer<typeof documentSchemaV1>): GraphDocument {
  const layers = doc.layers.length > 0 ? doc.layers : [createLayer(t.layers.defaultName(1))];
  const firstLayer = layers[0];
  if (!firstLayer) {
    throw new DocumentParseError(t.errors.noLayers);
  }
  const layerIds = new Set(layers.map((l) => l.id));
  const fixLayer = <T extends { layerId: string }>(el: T): T =>
    layerIds.has(el.layerId) ? el : { ...el, layerId: firstLayer.id };

  const nodes = Object.fromEntries(Object.entries(doc.nodes).map(([k, v]) => [k, fixLayer(v)]));
  const relationships = Object.fromEntries(
    Object.entries(doc.relationships)
      .filter(([, r]) => r.fromId in nodes && r.toId in nodes)
      .map(([k, v]) => [k, fixLayer(v)]),
  );
  const notes = Object.fromEntries(Object.entries(doc.notes).map(([k, v]) => [k, fixLayer(v)]));
  const images = Object.fromEntries(
    Object.entries(doc.images)
      .filter(([, im]) => im.assetId in doc.assets)
      .map(([k, v]) => [k, fixLayer(v)]),
  );
  const usedAssets = new Set(Object.values(images).map((im) => im.assetId));
  const assets = Object.fromEntries(
    Object.entries(doc.assets).filter(([id]) => usedAssets.has(id)),
  );

  return {
    version: DOCUMENT_VERSION,
    id: doc.id,
    name: doc.name,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    layers,
    nodes,
    relationships,
    notes,
    images,
    assets,
    style: {
      node: { ...DEFAULT_DIAGRAM_STYLE.node, ...doc.style.node },
      relationship: { ...DEFAULT_DIAGRAM_STYLE.relationship, ...doc.style.relationship },
      background: doc.style.background,
    },
  };
}
