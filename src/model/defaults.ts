import { t } from "@/i18n";
import { newId } from "./ids";
import {
  type DiagramStyle,
  DOCUMENT_VERSION,
  type GraphDocument,
  type Layer,
  type NodeStyle,
  type Note,
  type RelationshipStyle,
} from "./types";

export const DEFAULT_NODE_STYLE: NodeStyle = {
  radius: 50,
  fill: "#ffffff",
  stroke: "#000000",
  strokeWidth: 4,
  captionColor: "#000000",
  captionFontSize: 20,
  labelColor: "#000000",
  labelBackground: "#ffffff",
  labelBorderColor: "#000000",
  labelBorderWidth: 1,
  labelFontSize: 14,
  propertyColor: "#000000",
  propertyBackground: "#ffffff",
  propertyFontSize: 14,
};

export const DEFAULT_RELATIONSHIP_STYLE: RelationshipStyle = {
  color: "#000000",
  width: 5,
  arrowSize: 8,
  dashed: false,
  typeColor: "#000000",
  typeFontSize: 16,
  typeBackground: "#ffffff",
  propertyColor: "#000000",
  propertyBackground: "#ffffff",
  propertyFontSize: 14,
  directed: true,
};

export const DEFAULT_DIAGRAM_STYLE: DiagramStyle = {
  node: DEFAULT_NODE_STYLE,
  relationship: DEFAULT_RELATIONSHIP_STYLE,
  background: "#ffffff",
};

// Neutral, dämpad skala (sand, lera, salvia, skiffer, grått) i stället för klara pastellfärger.
export const NOTE_COLORS = [
  "#f4f1ea",
  "#e9e2d3",
  "#e3d2c8",
  "#d5d9cd",
  "#cfd8e0",
  "#dedee2",
  "#b9bec7",
  "#ffffff",
] as const;

export const NODE_PALETTE = [
  "#ffffff",
  "#f3f1ec",
  "#e4dfd5",
  "#d8c9bd",
  "#cdd3c6",
  "#c5ced8",
  "#d4d4d8",
  "#9ca3af",
  "#1b1f27",
] as const;

export const DEFAULT_NOTE: Omit<Note, "id" | "layerId" | "position"> = {
  size: { w: 200, h: 120 },
  text: "",
  color: NOTE_COLORS[0],
  textColor: "#1b1f27",
  fontSize: 14,
  align: "left",
};

export const BACKGROUND_LAYER_NAME = t.layers.backgroundName;

export function createLayer(name: string, overrides: Partial<Layer> = {}): Layer {
  return { id: newId("l"), name, visible: true, locked: false, ...overrides };
}

export function createEmptyDocument(name: string = t.app.untitled): GraphDocument {
  const now = new Date().toISOString();
  return {
    version: DOCUMENT_VERSION,
    id: newId("d"),
    name,
    createdAt: now,
    updatedAt: now,
    layers: [createLayer(t.layers.defaultName(1))],
    nodes: {},
    relationships: {},
    notes: {},
    images: {},
    assets: {},
    style: structuredClone(DEFAULT_DIAGRAM_STYLE),
  };
}
