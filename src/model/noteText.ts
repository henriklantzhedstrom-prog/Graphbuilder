/**
 * Text i anteckningar kan ha fet och kursiv stil på delar av texten. Stilen skrivs med märken i
 * själva texten, som i Markdown: `**fet**`, `*kursiv*` och `***båda***`. Märkena syns när man
 * redigerar och ritas inte ut på ritytan. Ett märke utan avslutning på samma rad är vanlig text.
 */
export interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

/** Delar en rad (utan radbrytningar) i stycken med var sin stil. */
export function parseRuns(line: string): TextRun[] {
  // Dela raden i text och stjärnrader. En, två eller tre stjärnor i följd är ett märke
  // (kursiv, fet, båda); fler än tre är vanlig text.
  // Ett osynligt skiljetecken kan stå mellan två stycken med stil; det ritas aldrig.
  const tokens = line.split(/(\*+|\u200B)/).filter((part) => part !== "" && part !== "\u200B");
  const isMarker = (token: string) => /^\*{1,3}$/.test(token);
  const runs: TextRun[] = [];
  let bold = false;
  let italic = false;
  tokens.forEach((token, index) => {
    if (isMarker(token)) {
      const setsBold = token.length >= 2;
      const setsItalic = token.length !== 2;
      const closes = (!setsBold || bold) && (!setsItalic || italic);
      // Ett märke öppnar bara en stil om den avslutas längre fram på raden.
      const opens =
        (!setsBold || !bold) &&
        (!setsItalic || !italic) &&
        tokens
          .slice(index + 1)
          .some(
            (later) => isMarker(later) && (later.length === token.length || later.length === 3),
          );
      if (closes || opens) {
        if (setsBold) bold = !bold;
        if (setsItalic) italic = !italic;
        return;
      }
    }
    const last = runs[runs.length - 1];
    if (last && last.bold === bold && last.italic === italic) last.text += token;
    else runs.push({ text: token, bold, italic });
  });
  return runs;
}

/** Texten som den ser ut på ritytan, utan märken. */
export const plainText = (text: string): string =>
  text
    .split("\n")
    .map((line) =>
      parseRuns(line)
        .map((run) => run.text)
        .join(""),
    )
    .join("\n");

/**
 * Bryter texten i rader som ryms på `maxChars` tecken (märkena räknas inte), ord för ord, och
 * behåller stilen på varje ord. En tom rad i texten ger en tom rad.
 */
export function layoutRichText(text: string, maxChars: number): TextRun[][] {
  const lines: TextRun[][] = [];
  const limit = Math.max(1, maxChars);
  for (const paragraph of text.split("\n")) {
    // Dela styckena i ord som bär med sig sin stil; mellanslag skiljer ord åt.
    const words: TextRun[][] = [];
    let word: TextRun[] = [];
    for (const run of parseRuns(paragraph)) {
      const parts = run.text.split(/(\s+)/);
      for (const part of parts) {
        if (part === "") continue;
        if (/^\s+$/.test(part)) {
          if (word.length > 0) words.push(word);
          word = [];
        } else {
          word.push({ ...run, text: part });
        }
      }
    }
    if (word.length > 0) words.push(word);
    if (words.length === 0) {
      lines.push([]);
      continue;
    }
    const length = (runs: TextRun[]) => runs.reduce((sum, r) => sum + r.text.length, 0);
    let current: TextRun[] = [];
    for (const next of words) {
      if (current.length > 0 && length(current) + 1 + length(next) > limit) {
        lines.push(current);
        current = [];
      }
      if (current.length > 0) {
        // Mellanslaget får samma stil som ordet före, så att en fet fras hänger ihop.
        const last = current[current.length - 1] as TextRun;
        current.push({ ...last, text: " " });
      }
      current.push(...next);
    }
    lines.push(current);
  }
  return lines.map(mergeRuns);
}

/** Slår ihop intilliggande stycken med samma stil. */
function mergeRuns(runs: TextRun[]): TextRun[] {
  const merged: TextRun[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && last.bold === run.bold && last.italic === run.italic) last.text += run.text;
    else merged.push({ ...run });
  }
  return merged;
}
