/** Relativ ljushet (0–1) för en färg skriven som #rrggbb, enligt WCAG. */
export function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Kontrast mellan två färger (1–21). Under ca 3 är text svår att läsa. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

export const MIN_READABLE_CONTRAST = 3;

/**
 * Textfärg som går att läsa på `background`: `text` om den redan syns tydligt, annars svart
 * eller vitt beroende på vilket som syns bäst. Färgerna anges som #rrggbb.
 */
export function readableTextColor(background: string, text: string): string {
  if (contrast(background, text) >= MIN_READABLE_CONTRAST) return text;
  return contrast(background, "#000000") >= contrast(background, "#ffffff") ? "#000000" : "#ffffff";
}
