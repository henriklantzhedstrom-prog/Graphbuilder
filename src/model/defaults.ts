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
  labelBorderWidth: 4,
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

// Klara grundfärger med stor skillnad sinsemellan, alla ljusa nog för svart text
// (utom den svarta, som är till för ljus text).
export const NOTE_COLORS = [
  "#ffffff",
  "#ffd60a",
  "#ff9500",
  "#ff3b30",
  "#af52de",
  "#0a84ff",
  "#34c759",
  "#8e8e93",
] as const;

export const NODE_PALETTE = [
  "#ffffff",
  "#ff3b30",
  "#ff9500",
  "#ffd60a",
  "#34c759",
  "#0a84ff",
  "#af52de",
  "#8e8e93",
  "#000000",
] as const;

/** Minsta och största textstorlek i en anteckning. */
export const NOTE_FONT_MIN = 6;
export const NOTE_FONT_MAX = 80;

export const DEFAULT_NOTE: Omit<Note, "id" | "position" | "attachedTo"> = {
  size: { w: 200, h: 120 },
  text: "",
  // Vit med svart ram som standard.
  color: "#ffffff",
  borderColor: "#000000",
  borderWidth: 2,
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
    propertiesVisible: true,
    notesVisible: true,
    nodes: {},
    relationships: {},
    notes: {},
    images: {},
    assets: {},
    style: structuredClone(DEFAULT_DIAGRAM_STYLE),
  };
}
