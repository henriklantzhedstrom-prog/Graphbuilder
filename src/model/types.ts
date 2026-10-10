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
  labelBorderColor: string;
  labelBorderWidth: number;
  labelFontSize: number;
  propertyColor: string;
  /** Bakgrund bakom egenskapsraderna; relationer som passerar hamnar bakom den. */
  propertyBackground: string;
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
  /** Bakgrund bakom egenskapsraderna; relationer som passerar hamnar bakom den. */
  propertyBackground: string;
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
  /** Nyckeln till den egenskap som visas som nodens rubrik, eller null. */
  captionKey: string | null;
  labels: string[];
  properties: Record<string, string>;
  style: Partial<NodeStyle>;
}

/**
 * En relation har som standard inget eget lager (`layerId` saknas): den syns när båda ändnoderna
 * ligger i synliga lager. Den kan läggas i ett lager; då måste dessutom det lagret vara synligt,
 * och lagrets lås gäller för relationen.
 */
export interface Relationship {
  id: Id;
  layerId?: Id;
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

export const DOCUMENT_VERSION = 4;

export interface GraphDocument {
  version: typeof DOCUMENT_VERSION;
  id: Id;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Ordnade botten → topp */
  layers: Layer[];
  /**
   * Det fasta lagret "Properties": visar eller döljer egenskapsraderna under alla noder och
   * relationer. Raderna syns ändå bara för element som själva syns.
   */
  propertiesVisible: boolean;
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
