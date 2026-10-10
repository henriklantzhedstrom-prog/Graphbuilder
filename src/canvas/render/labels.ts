import type { Box, NodeStyle } from "@/model/types";
import { LABEL_PADDING_X, measureTextWidth } from "./text";

/** Labelns höjd i förhållande till textstorleken (luft över och under texten). */
export const LABEL_HEIGHT_FACTOR = 1.8;
/** Avstånd mellan två labels, och mellan labelraden och nodens kant (mätt från ytterkanterna). */
export const LABEL_GAP = 4;

export interface LabelBox {
  label: string;
  /** Labelns inre yta: texten plus luften runt den. Kanten ritas utanför den här ytan. */
  inner: Box;
}

/**
 * Placerar nodens labels i en rad ovanför noden. Labelns inre yta bestäms bara av texten; kanten
 * läggs utanpå, så en tjockare kant växer utåt och tar aldrig plats från texten.
 * `nodeTop` är y för nodens översta ytterkant.
 */
export function labelLayout(
  labels: readonly string[],
  style: Pick<NodeStyle, "labelFontSize" | "labelBorderWidth">,
  centerX: number,
  nodeTop: number,
): { boxes: LabelBox[]; outer: Box | null } {
  if (labels.length === 0) return { boxes: [], outer: null };
  const border = style.labelBorderWidth;
  const height = style.labelFontSize * LABEL_HEIGHT_FACTOR;
  const widths = labels.map((l) => measureTextWidth(l, style.labelFontSize) + LABEL_PADDING_X * 2);
  const total =
    widths.reduce((sum, w) => sum + w + border * 2, 0) + (labels.length - 1) * LABEL_GAP;
  const top = nodeTop - LABEL_GAP - border - height;
  let left = centerX - total / 2;
  const boxes = labels.map((label, i) => {
    const w = widths[i] ?? 0;
    const inner = { x: left + border, y: top, w, h: height };
    left += w + border * 2 + LABEL_GAP;
    return { label, inner };
  });
  return {
    boxes,
    outer: {
      x: centerX - total / 2,
      y: top - border,
      w: total,
      h: height + border * 2,
    },
  };
}
