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

/**
 * Normaliserar en färg till #rrggbb för <input type="color">. Klarar även färgnamn, rgb(), hsl()
 * och korta eller genomskinliga hexkoder (t.ex. från importerade modeller) via webbläsaren.
 */
export function toHex(color: string | null): string {
  if (!color) return "#000000";
  const value = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9a-f]{8}$/i.test(value)) return value.slice(0, 7).toLowerCase();
  return cssColorToHex(value) ?? "#000000";
}

let colorProbe: CanvasRenderingContext2D | null | undefined;

function cssColorToHex(color: string): string | null {
  if (colorProbe === undefined) {
    try {
      colorProbe = document.createElement("canvas").getContext("2d");
    } catch {
      colorProbe = null;
    }
  }
  if (!colorProbe) return null;
  // En ogiltig färg lämnar fillStyle orörd; två olika utgångsvärden avslöjar det.
  colorProbe.fillStyle = "#000000";
  colorProbe.fillStyle = color;
  const first = colorProbe.fillStyle;
  colorProbe.fillStyle = "#ffffff";
  colorProbe.fillStyle = color;
  if (first !== colorProbe.fillStyle) return null;
  if (/^#[0-9a-f]{6}$/i.test(first)) return first.toLowerCase();
  const rgba = first.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!rgba) return null;
  return `#${rgba
    .slice(1, 4)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Textfärgen som ska ritas på `background`: den sparade färgen `preferred` om den går att läsa
 * där, annars svart eller vitt. Textfärger väljs inte av användaren; de följer bakgrunden.
 */
export function textOn(background: string, preferred: string): string {
  const wanted = toHex(preferred);
  const readable = readableTextColor(toHex(background), wanted);
  return readable === wanted ? preferred : readable;
}
