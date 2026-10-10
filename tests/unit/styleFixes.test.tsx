import { describe, expect, it } from "vitest";
import { drawnBounds } from "@/canvas/render/bounds";
import { labelLayout } from "@/canvas/render/labels";
import { computeRelationshipGeometry } from "@/canvas/render/Scene";
import { toHex } from "@/components/ui";
import { exportSvg } from "@/export/svg";
import { contrast, readableTextColor } from "@/model/color";
import { createEmptyDocument } from "@/model/defaults";
import { shortcutLabel } from "@/model/shortcutLabel";
import type { GraphDocument } from "@/model/types";
import { captionColorFor } from "@/panels/inspector/common";
import { relationshipBundles } from "@/store/selectors";

function twoNodes(): GraphDocument {
  const doc = createEmptyDocument("Stil");
  const layerId = doc.layers[0]?.id ?? "";
  const node = (id: string, x: number) => ({
    id,
    layerId,
    position: { x, y: 0 },
    captionKey: null,
    labels: [] as string[],
    properties: {} as Record<string, string>,
    style: {},
  });
  doc.nodes.a = node("a", 0);
  doc.nodes.b = node("b", 400);
  doc.relationships.r = { id: "r", fromId: "a", toId: "b", type: "", properties: {}, style: {} };
  return doc;
}

describe("färger", () => {
  it("toHex normaliserar hexkoder i alla längder", () => {
    expect(toHex("#ABCDEF")).toBe("#abcdef");
    expect(toHex("#fc0")).toBe("#ffcc00");
    expect(toHex("#11223380")).toBe("#112233");
    expect(toHex(null)).toBe("#000000");
  });

  it("rubriken byter färg när den inte går att läsa mot fyllningen", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    // Svart rubrik på svart nod: byt till vitt. Och tillbaka på en vit nod.
    expect(captionColorFor("#000000", "#000000")).toBe("#ffffff");
    expect(captionColorFor("#ffffff", "#ffffff")).toBe("#000000");
    // Paletten med klara färger går att läsa med svart text: ingen ändring.
    for (const fill of ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#af52de"]) {
      expect(captionColorFor(fill, "#000000")).toBeNull();
    }
    // En egen rubrikfärg som syns behålls.
    expect(readableTextColor("#000000", "#ffd60a")).toBe("#ffd60a");
  });
});

describe("kortkommandon", () => {
  it("visas med ⌘ på Mac och Ctrl annars", () => {
    expect(shortcutLabel("Ctrl+Z", true)).toBe("⌘Z");
    expect(shortcutLabel("Ctrl+Shift+Z / Ctrl+Y", true)).toBe("⇧⌘Z / ⌘Y");
    expect(shortcutLabel("Ctrl+Z", false)).toBe("Ctrl+Z");
    expect(shortcutLabel("Delete / Backspace", true)).toBe("Delete / Backspace");
  });
});

describe("ritade mått", () => {
  it("export och anpassad vy rymmer långa egenskapslistor och tjocka kanter", () => {
    const doc = twoNodes();
    const plain = drawnBounds(doc);
    const a = doc.nodes.a;
    if (!a || !plain) throw new Error("nod saknas");
    a.properties = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`key${i}`, "value"]));
    a.labels = ["A very long label that is wider than the node itself"];
    const withText = drawnBounds(doc);
    if (!withText) throw new Error("mått saknas");
    // 40 rader à 17,5 px under noden, och en label som sticker ut åt sidorna.
    expect(withText.h - plain.h).toBeGreaterThan(40 * 17);
    expect(withText.x).toBeLessThan(plain.x);
    // Dolt Properties-lager: listan räknas inte.
    expect(drawnBounds({ ...doc, propertiesVisible: false })?.h).toBeLessThan(plain.h + 60);
    // Den exporterade bilden är lika hög som innehållet plus luft, så inget klipps.
    const svg = exportSvg(doc, { onlyVisible: true, transparent: false });
    expect(svg?.height).toBeGreaterThan(withText.h);
    expect(svg?.svg).toContain("key39: value");

    // Tjock kant flyttar labels och egenskaper utåt med halva kantbredden.
    const thin = drawnBounds(doc);
    a.style = { strokeWidth: 30 };
    const thick = drawnBounds(doc);
    if (!thin || !thick) throw new Error("mått saknas");
    expect(thin.y - thick.y).toBeCloseTo(13, 5);
  });

  it("labelns kant växer utåt och tar aldrig plats från texten", () => {
    const style = { labelFontSize: 14, labelBorderWidth: 4 };
    const thin = labelLayout(["Person", "Employee"], { ...style, labelBorderWidth: 0 }, 0, 0);
    const normal = labelLayout(["Person", "Employee"], style, 0, 0);
    const thick = labelLayout(["Person", "Employee"], { ...style, labelBorderWidth: 10 }, 0, 0);
    for (const layout of [thin, normal, thick]) {
      // Den inre ytan (text + luft) är densamma oavsett kantens tjocklek …
      expect(layout.boxes.map((b) => b.inner.w)).toEqual(thin.boxes.map((b) => b.inner.w));
      expect(layout.boxes[0]?.inner.h).toBe(14 * 1.8);
      // … och raden slutar alltid 4 px ovanför noden, räknat från kantens ytterkant.
      expect((layout.outer?.y ?? 0) + (layout.outer?.h ?? 0)).toBeCloseTo(-4, 6);
    }
    // Tjockare kant gör hela labeln större utåt, och labels överlappar inte varandra.
    expect(thick.outer?.w ?? 0).toBeGreaterThan(normal.outer?.w ?? 0);
    expect(thick.outer?.h).toBe(14 * 1.8 + 20);
    const [first, second] = thick.boxes;
    if (!first || !second) throw new Error("labels saknas");
    expect(second.inner.x - 10 - (first.inner.x + first.inner.w + 10)).toBeCloseTo(4, 6);
    // Nya modeller har 4 px kant som standard.
    expect(createEmptyDocument().style.node.labelBorderWidth).toBe(4);
  });

  it("pilspetsen är aldrig smalare än en tjock linje", () => {
    const doc = twoNodes();
    const rel = doc.relationships.r;
    if (!rel) throw new Error("relation saknas");
    const arrowHeight = () => {
      const geometry = computeRelationshipGeometry(doc, rel, relationshipBundles(doc));
      const ys = (geometry?.arrow ?? "").split(" ").map((p) => Number(p.split(",")[1]));
      return Math.max(...ys) - Math.min(...ys);
    };
    // Standard: pilstorlek 8 ger en 16 px bred spets.
    expect(arrowHeight()).toBeCloseTo(16, 5);
    rel.style = { width: 30 };
    expect(arrowHeight()).toBeGreaterThanOrEqual(30);
    // Pilstorlek 0 betyder ingen spets, även med tjock linje.
    rel.style = { width: 30, arrowSize: 0 };
    expect(arrowHeight()).toBe(0);
  });
});
