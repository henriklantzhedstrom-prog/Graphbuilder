export type Id = string;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layer {
  id: Id;
  name: string;
  visible: boolean;
  locked: boolean;
  /** 0–1 */
  opacity: number;
}

export interface NodeStyle {
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  captionColor: string;
  captionFontSize: number;
  labelColor: string;
  labelBackground: string;
  labelFontSize: number;
  propertyColor: string;
  propertyFontSize: number;
}

export interface RelationshipStyle {
  color: string;
  width: number;
  arrowSize: number;
  dashed: boolean;
  typeColor: string;
  typeFontSize: number;
  typeBackground: string;
  propertyColor: string;
  propertyFontSize: number;
  /** Rita pilspets? false = oriktad relation */
  directed: boolean;
}

export interface DiagramStyle {
  node: NodeStyle;
  relationship: RelationshipStyle;
  background: string;
}

export interface GraphNode {
  id: Id;
  layerId: Id;
  position: Point;
  caption: string;
  labels: string[];
  properties: Record<string, string>;
  style: Partial<NodeStyle>;
}

export interface Relationship {
  id: Id;
  layerId: Id;
  fromId: Id;
  toId: Id;
  type: string;
  properties: Record<string, string>;
  style: Partial<RelationshipStyle>;
}

export type NoteAlign = "left" | "center";

export interface Note {
  id: Id;
  layerId: Id;
  position: Point;
  size: Size;
  text: string;
  color: string;
  textColor: string;
  fontSize: number;
  align: NoteAlign;
}

export interface BackgroundImage {
  id: Id;
  layerId: Id;
  assetId: Id;
  position: Point;
  size: Size;
  /** 0–1 */
  opacity: number;
  locked: boolean;
}

export interface Asset {
  id: Id;
  mime: string;
  dataUrl: string;
  width: number;
  height: number;
}

export const DOCUMENT_VERSION = 1;

export interface GraphDocument {
  version: typeof DOCUMENT_VERSION;
  id: Id;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Ordnade botten → topp */
  layers: Layer[];
  nodes: Record<Id, GraphNode>;
  relationships: Record<Id, Relationship>;
  notes: Record<Id, Note>;
  images: Record<Id, BackgroundImage>;
  assets: Record<Id, Asset>;
  style: DiagramStyle;
}

export type ElementKind = "node" | "relationship" | "note" | "image";

export interface ElementRef {
  kind: ElementKind;
  id: Id;
}

export type AnyElement = GraphNode | Relationship | Note | BackgroundImage;
