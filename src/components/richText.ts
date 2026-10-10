import { parseRuns, type TextRun } from "@/model/noteText";

/**
 * Översätter mellan anteckningens sparade text (med märkena `**fet**` och `*kursiv*`) och det
 * som visas i ett redigerbart fält, där texten syns fet och kursiv utan märken.
 */

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Sparad text → HTML för fältet. Radbrytningar är vanliga radbrytningstecken (pre-wrap). */
export function markupToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      parseRuns(line)
        .map((run) => {
          let html = escapeHtml(run.text);
          if (run.italic) html = `<i>${html}</i>`;
          if (run.bold) html = `<b>${html}</b>`;
          return html;
        })
        .join(""),
    )
    .join("\n");
}

const BLOCKS = new Set(["DIV", "P", "LI"]);

const isBold = (el: HTMLElement): boolean => {
  if (el.tagName === "B" || el.tagName === "STRONG") return true;
  const weight = el.style.fontWeight;
  return weight === "bold" || Number(weight) >= 600;
};
const isItalic = (el: HTMLElement): boolean =>
  el.tagName === "I" || el.tagName === "EM" || el.style.fontStyle === "italic";

/** Det som står i fältet → rader av textstycken med stil. */
function readLines(root: Node): TextRun[][] {
  const lines: TextRun[][] = [[]];
  const current = () => lines[lines.length - 1] as TextRun[];
  const walk = (node: Node, bold: boolean, italic: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      (node.textContent ?? "").split("\n").forEach((part, i) => {
        if (i > 0) lines.push([]);
        if (part) current().push({ text: part, bold, italic });
      });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      // Webbläsaren lägger en tom <br> sist i ett block för att raden ska få höjd; den är ingen
      // radbrytning i texten.
      if (node.nextSibling || !node.parentElement || node.parentElement === root) lines.push([]);
      return;
    }
    const block = BLOCKS.has(node.tagName);
    if (block && current().length > 0) lines.push([]);
    for (const child of node.childNodes) {
      walk(child, bold || isBold(node), italic || isItalic(node));
    }
    if (block && node.nextSibling) lines.push([]);
  };
  for (const child of root.childNodes) walk(child, false, false);
  return lines;
}

/** Osynligt tecken som skiljer två stycken med stil som står direkt intill varandra. */
const SEPARATOR = "​";

/** Det som står i fältet → sparad text med märken. */
export function domToMarkup(root: Node): string {
  const lines = readLines(root).map((runs) => {
    // Slå ihop grannar med samma stil, och låt mellanslag i kanterna hamna utanför märkena.
    const merged: TextRun[] = [];
    for (const run of runs) {
      const last = merged[merged.length - 1];
      if (last && last.bold === run.bold && last.italic === run.italic) last.text += run.text;
      else merged.push({ ...run });
    }
    let out = "";
    let previousStyled = false;
    for (const run of merged) {
      const marker = run.bold && run.italic ? "***" : run.bold ? "**" : run.italic ? "*" : "";
      const core = run.text.trim();
      if (!marker || !core) {
        out += run.text;
        previousStyled = false;
        continue;
      }
      const lead = run.text.slice(0, run.text.indexOf(core));
      const trail = run.text.slice(lead.length + core.length);
      if (previousStyled && !lead) out += SEPARATOR;
      out += `${lead}${marker}${core}${marker}${trail}`;
      previousStyled = !trail;
    }
    return out;
  });
  // Ett tomt fält kan innehålla en ensam tom rad sist.
  while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}
