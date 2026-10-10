import { describe, expect, it } from "vitest";
import { domToMarkup, markupToHtml } from "@/components/richText";
import { parseRuns } from "@/model/noteText";

const fromHtml = (html: string): string => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return domToMarkup(root);
};
const visible = (markup: string): string =>
  markup
    .split("\n")
    .map((line) =>
      parseRuns(line)
        .map((r) => `${r.bold ? "B" : ""}${r.italic ? "I" : ""}[${r.text}]`)
        .join(""),
    )
    .join("\n");

describe("textfält med fet och kursiv stil", () => {
  it("visar sparad text som fet och kursiv, utan märken", () => {
    expect(markupToHtml("En **fet** och *kursiv* rad\n***båda***")).toBe(
      "En <b>fet</b> och <i>kursiv</i> rad\n<b><i>båda</i></b>",
    );
    expect(markupToHtml("a < b & c")).toBe("a &lt; b &amp; c");
    expect(markupToHtml("")).toBe("");
  });

  it("läser tillbaka det som står i fältet till sparad text", () => {
    expect(fromHtml("En <b>fet</b> och <i>kursiv</i> rad")).toBe("En **fet** och *kursiv* rad");
    expect(fromHtml("<b><i>båda</i></b>")).toBe("***båda***");
    expect(fromHtml('<span style="font-weight: 700">fet</span> text')).toBe("**fet** text");
    expect(fromHtml("<strong>a</strong><em>b</em>")).toBe("**a**​*b*");
    // Mellanslag i kanten av det feta hamnar utanför märkena.
    expect(fromHtml("ett <b>två </b>tre")).toBe("ett **två** tre");
  });

  it("hanterar radbrytningar som webbläsare skapar på olika sätt", () => {
    expect(fromHtml("rad ett\nrad två")).toBe("rad ett\nrad två");
    expect(fromHtml("rad ett<br>rad två")).toBe("rad ett\nrad två");
    expect(fromHtml("rad ett<div>rad två</div><div>rad tre</div>")).toBe(
      "rad ett\nrad två\nrad tre",
    );
    expect(fromHtml("<div>rad ett</div><div><br></div><div>rad tre</div>")).toBe(
      "rad ett\n\nrad tre",
    );
    expect(fromHtml("")).toBe("");
  });

  it("det som sparas ser likadant ut när det öppnas igen", () => {
    for (const html of [
      "En <b>fet</b> och <i>kursiv</i> rad",
      "<b>fet <i>och kursiv</i> ihop</b> sedan",
      "<b>a</b><i>b</i><b><i>c</i></b>d",
      "rad <b>ett</b>\n<i>rad</i> två",
    ]) {
      const saved = fromHtml(html);
      expect(visible(fromHtml(markupToHtml(saved))), html).toBe(visible(saved));
    }
    // Två feta ord med kursiv emellan tolkas rätt, inte som ett enda fett stycke.
    expect(visible(fromHtml("<b>a</b><i>b</i><b><i>c</i></b>d"))).toBe("B[a]I[b]BI[c][d]");
  });
});
