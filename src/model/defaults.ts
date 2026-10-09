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
  labelFontSize: 14,
  propertyColor: "#000000",
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
  propertyFontSize: 14,
  directed: true,
};

export const DEFAULT_DIAGRAM_STYLE: DiagramStyle = {
  node: DEFAULT_NODE_STYLE,
  relationship: DEFAULT_RELATIONSHIP_STYLE,
  background: "#ffffff",
};

export const NOTE_COLORS = [
  "#fff59d",
  "#ffcc80",
  "#f48fb1",
  "#ce93d8",
  "#90caf9",
  "#a5d6a7",
  "#e0e0e0",
  "#ffffff",
] as const;

export const NODE_PALETTE = [
  "#ffffff",
  "#fbe7a1",
  "#f7c59f",
  "#f4a6a6",
  "#d9b3e6",
  "#a9c9f5",
  "#a6e3c4",
  "#cfd8dc",
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
