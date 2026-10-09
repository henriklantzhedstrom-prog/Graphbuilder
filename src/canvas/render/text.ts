import { wrapText } from "@/model/geometry";

/** Ungefärlig textbredd i px för system-sans. Tillräckligt för bakgrundsrutor och radbrytning. */
export const CHAR_WIDTH_FACTOR = 0.58;

export const estimateTextWidth = (text: string, fontSize: number): number =>
  text.length * fontSize * CHAR_WIDTH_FACTOR;

export function wrapToWidth(text: string, maxWidth: number, fontSize: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxWidth / (fontSize * CHAR_WIDTH_FACTOR)));
  return wrapText(text, maxChars);
}

export const LINE_HEIGHT = 1.25;

export const propertyLines = (properties: Record<string, string>): string[] =>
  Object.entries(properties).map(([k, v]) => `${k}: ${v}`);
