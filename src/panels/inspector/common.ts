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
  /**
   * Tal ställs alltid in med skjutreglage mellan `min` och `max`. Textfärger finns inte bland
   * fälten: text ritas i en färg som går att läsa mot sin bakgrund (`textOn` i `model/color`).
   * Egenskapernas bakgrund finns inte heller: den följer modellens bakgrundsfärg.
   */
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
  | "captionFontSize"
  | "labelBackground"
  | "labelBorderColor"
  | "labelBorderWidth"
  | "labelFontSize"
  | "propertyFontSize"
>[] = [
  { key: "radius", type: "number", min: 10, max: 250 },
  { key: "fill", type: "color" },
  { key: "stroke", type: "color" },
  { key: "strokeWidth", type: "number", min: 0, max: 30 },
  { key: "captionFontSize", type: "number", min: 6, max: 100 },
  { key: "labelBackground", type: "color" },
  { key: "labelBorderColor", type: "color" },
  { key: "labelBorderWidth", type: "number", min: 0, max: 10, step: 0.5 },
  { key: "labelFontSize", type: "number", min: 6, max: 60 },
  { key: "propertyFontSize", type: "number", min: 6, max: 60 },
];

export const RELATIONSHIP_STYLE_FIELDS: StyleFieldSpec<
  | "color"
  | "width"
  | "arrowSize"
  | "dashed"
  | "directed"
  | "typeFontSize"
  | "typeBackground"
  | "propertyFontSize"
>[] = [
  { key: "color", type: "color" },
  { key: "width", type: "number", min: 0, max: 30 },
  { key: "arrowSize", type: "number", min: 0, max: 40 },
  { key: "dashed", type: "boolean" },
  { key: "directed", type: "boolean" },
  { key: "typeFontSize", type: "number", min: 6, max: 60 },
  { key: "typeBackground", type: "color" },
  { key: "propertyFontSize", type: "number", min: 6, max: 60 },
];
