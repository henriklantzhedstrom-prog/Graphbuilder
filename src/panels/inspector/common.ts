import { toHex } from "@/components/ui";
import { readableTextColor } from "@/model/color";

/**
 * När en nods fyllning ändras ska rubriken fortfarande gå att läsa. Ger den rubrikfärg som ska
 * sättas tillsammans med fyllningen, eller null om den nuvarande redan syns tydligt.
 */
export function captionColorFor(fill: string, captionColor: string): string | null {
  const current = toHex(captionColor);
  const readable = readableTextColor(toHex(fill), current);
  return readable === current ? null : readable;
}

/** Gränser för bredd och höjd på anteckningar och bilder i panelens reglage. */
export const MIN_ELEMENT_SIZE = 20;
export const MAX_ELEMENT_SIZE = 2000;

/** Gemensamt värde om alla är lika, annars null ("olika"). */
export function commonValue<T>(values: T[]): T | null {
  const first = values[0];
  if (first === undefined) return null;
  return values.every((v) => v === first) ? first : null;
}

export interface StyleFieldSpec<K extends string> {
  key: K;
  /** Tal ställs alltid in med skjutreglage mellan `min` och `max`. */
  type: "color" | "number" | "boolean";
  min?: number;
  max?: number;
  step?: number;
}

export const NODE_STYLE_FIELDS: StyleFieldSpec<
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "radius"
  | "captionColor"
  | "captionFontSize"
  | "labelColor"
  | "labelBackground"
  | "labelBorderColor"
  | "labelBorderWidth"
  | "labelFontSize"
  | "propertyColor"
  | "propertyBackground"
  | "propertyFontSize"
>[] = [
  { key: "fill", type: "color" },
  { key: "stroke", type: "color" },
  { key: "strokeWidth", type: "number", min: 0, max: 30 },
  { key: "radius", type: "number", min: 10, max: 250 },
  { key: "captionColor", type: "color" },
  { key: "captionFontSize", type: "number", min: 6, max: 100 },
  { key: "labelColor", type: "color" },
  { key: "labelBackground", type: "color" },
  { key: "labelBorderColor", type: "color" },
  { key: "labelBorderWidth", type: "number", min: 0, max: 10, step: 0.5 },
  { key: "labelFontSize", type: "number", min: 6, max: 60 },
  { key: "propertyColor", type: "color" },
  { key: "propertyBackground", type: "color" },
  { key: "propertyFontSize", type: "number", min: 6, max: 60 },
];

export const RELATIONSHIP_STYLE_FIELDS: StyleFieldSpec<
  | "color"
  | "width"
  | "arrowSize"
  | "dashed"
  | "directed"
  | "typeColor"
  | "typeFontSize"
  | "typeBackground"
  | "propertyColor"
  | "propertyBackground"
  | "propertyFontSize"
>[] = [
  { key: "color", type: "color" },
  { key: "width", type: "number", min: 0, max: 30 },
  { key: "arrowSize", type: "number", min: 0, max: 40 },
  { key: "dashed", type: "boolean" },
  { key: "directed", type: "boolean" },
  { key: "typeColor", type: "color" },
  { key: "typeFontSize", type: "number", min: 6, max: 60 },
  { key: "typeBackground", type: "color" },
  { key: "propertyColor", type: "color" },
  { key: "propertyBackground", type: "color" },
  { key: "propertyFontSize", type: "number", min: 6, max: 60 },
];
