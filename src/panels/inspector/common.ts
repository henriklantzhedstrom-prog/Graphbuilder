/** Gemensamt värde om alla är lika, annars null ("olika"). */
export function commonValue<T>(values: T[]): T | null {
  const first = values[0];
  if (first === undefined) return null;
  return values.every((v) => v === first) ? first : null;
}

export interface StyleFieldSpec<K extends string> {
  key: K;
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
  | "labelFontSize"
  | "propertyColor"
  | "propertyFontSize"
>[] = [
  { key: "fill", type: "color" },
  { key: "stroke", type: "color" },
  { key: "strokeWidth", type: "number", min: 0, max: 30 },
  { key: "radius", type: "number", min: 10, max: 400 },
  { key: "captionColor", type: "color" },
  { key: "captionFontSize", type: "number", min: 6, max: 100 },
  { key: "labelColor", type: "color" },
  { key: "labelBackground", type: "color" },
  { key: "labelFontSize", type: "number", min: 6, max: 60 },
  { key: "propertyColor", type: "color" },
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
  { key: "propertyFontSize", type: "number", min: 6, max: 60 },
];
