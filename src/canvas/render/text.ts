import { wrapText } from "@/model/geometry";

/** Ungefärlig textbredd i px för system-sans. Tillräckligt för bakgrundsrutor och radbrytning. */
export const CHAR_WIDTH_FACTOR = 0.58;

export const estimateTextWidth = (text: string, fontSize: number): number =>
  text.length * fontSize * CHAR_WIDTH_FACTOR;

/** Samma typsnitt som ritytans text (`fontFamily` i vyerna). */
export const CANVAS_FONT_FAMILY = "system-ui, sans-serif";

let measureContext: CanvasRenderingContext2D | null | undefined;
const widthCache = new Map<string, number>();

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext !== undefined) return measureContext;
  try {
    measureContext =
      typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  } catch {
    measureContext = null;
  }
  return measureContext;
}

/**
 * Verklig textbredd i px, mätt av webbläsaren. Används för rutor runt text så att marginalen
 * blir lika stor oavsett vilka bokstäver texten består av. Faller tillbaka på uppskattning där
 * mätning saknas (t.ex. i enhetstester).
 */
export function measureTextWidth(text: string, fontSize: number): number {
  const key = `${fontSize}|${text}`;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  const ctx = getMeasureContext();
  let width = estimateTextWidth(text, fontSize);
  if (ctx) {
    ctx.font = `${fontSize}px ${CANVAS_FONT_FAMILY}`;
    const measured = ctx.measureText(text).width;
    if (Number.isFinite(measured) && (measured > 0 || text === "")) width = measured;
  }
  widthCache.set(key, width);
  return width;
}

/** Marginal mellan text och kant i rutor runt labels, relationstyper och egenskaper. */
export const LABEL_PADDING_X = 8;
export const TYPE_PADDING_X = 5;

export function wrapToWidth(text: string, maxWidth: number, fontSize: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxWidth / (fontSize * CHAR_WIDTH_FACTOR)));
  return wrapText(text, maxChars);
}

export const LINE_HEIGHT = 1.25;

export const propertyLines = (properties: Record<string, string>): string[] =>
  Object.entries(properties).map(([k, v]) => `${k}: ${v}`);
