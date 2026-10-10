import { measureTextWidth } from "./text";

export const PROPERTY_PADDING_X = 6;
export const PROPERTY_PADDING_Y = 3;

/** Bredden på den längsta egenskapsraden (utan rutans marginal). */
export const propertyTextWidth = (lines: string[], fontSize: number): number =>
  lines.length === 0 ? 0 : Math.max(...lines.map((l) => measureTextWidth(l, fontSize)));

/**
 * Vänsterkanten för egenskapstexten. Rutan är centrerad kring `centerX` och lika bred som den
 * längsta raden; alla rader börjar vid samma vänsterkant (vänsterställda i rutan).
 */
export const propertyTextX = (lines: string[], centerX: number, fontSize: number): number =>
  centerX - propertyTextWidth(lines, fontSize) / 2;

/**
 * Bakgrundsruta bakom egenskapsrader. `centerX` är textens mittpunkt, `firstBaseline` första
 * radens baslinje. Ritas före texten; allt som ritats tidigare (t.ex. relationer) hamnar bakom.
 * Rutan hör till elementet: klick och dra på den markerar/flyttar noden eller relationen.
 */
export function PropertyBackground({
  lines,
  centerX,
  firstBaseline,
  fontSize,
  lineHeight,
  fill,
}: {
  lines: string[];
  centerX: number;
  firstBaseline: number;
  fontSize: number;
  lineHeight: number;
  fill: string;
}) {
  if (lines.length === 0) return null;
  const width = propertyTextWidth(lines, fontSize) + PROPERTY_PADDING_X * 2;
  const top = firstBaseline - fontSize * 0.9 - PROPERTY_PADDING_Y;
  const height = (lines.length - 1) * lineHeight + fontSize * 1.15 + PROPERTY_PADDING_Y * 2;
  return (
    <rect
      data-part="property-background"
      x={centerX - width / 2}
      y={top}
      width={width}
      height={height}
      rx={3}
      fill={fill}
    />
  );
}
