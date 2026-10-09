import { describe, expect, it } from "vitest";
import { importArrowsJson } from "@/export/arrowsImport";
import { cypherValue, exportCypher } from "@/export/cypher";
import { visibleDocument } from "@/export/filter";
import { exportJson } from "@/export/json";
import { exportSvg } from "@/export/svg";
import { createEmptyDocument, createLayer } from "@/model/defaults";
import { parseDocument } from "@/model/schema";
import type { GraphDocument } from "@/model/types";

function sampleDoc(): GraphDocument {
  const doc = createEmptyDocument("Prov");
  const l1 = doc.layers[0]?.id ?? "";
  const l2 = createLayer("Dolt", { visible: false });
  doc.layers.push(l2);
  doc.nodes.a = {
    id: "a",
    layerId: l1,
    position: { x: 0, y: 0 },
    caption: "Alice Andersson",
    labels: ["Person"],
    properties: { name: "Alice", age: "42", vip: "true", note: 'säger "hej"' },
    style: {},
  };
  doc.nodes.b = {
    id: "b",
    layerId: l1,
    position: { x: 300, y: 0 },
    caption: "",
    labels: ["Company", "Legal Entity"],
    properties: {},
    style: {},
  };
  doc.nodes.c = {
    id: "c",
    layerId: l2.id,
    position: { x: 600, y: 0 },
    caption: "Hidden",
    labels: [],
    properties: {},
    style: {},
  };
  doc.relationships.r1 = {
    id: "r1",
    layerId: l1,
    fromId: "a",
    toId: "b",
    type: "WORKS AT",
    properties: { since: "2020" },
    style: {},
  };
  doc.relationships.r2 = {
    id: "r2",
    layerId: l1,
    fromId: "a",
    toId: "c",
    type: "",
    properties: {},
    style: { directed: false },
  };
  doc.notes.t1 = {
    id: "t1",
    layerId: l1,
    position: { x: 0, y: 200 },
    size: { w: 100, h: 50 },
    text: "Hej",
    color: "#fff59d",
    textColor: "#000",
    fontSize: 14,
    align: "left",
  };
  return doc;
}

describe("Cypher", () => {
  it("skriver CREATE-satser med variabelnamn från rubriken", () => {
    const out = exportCypher(sampleDoc(), { onlyVisible: true });
    expect(out).toContain(
      'CREATE (AliceAndersson:Person {name: "Alice", age: 42, vip: true, note: "säger \\"hej\\""})',
    );
    expect(out).toContain("CREATE (n1:Company:`Legal Entity`)");
    expect(out).toContain("CREATE (AliceAndersson)-[:`WORKS AT` {since: 2020}]->(n1)");
    expect(out).not.toContain("Hidden");
  });
  it("tar med dolda lager när det begärs, oriktad relation utan pil", () => {
    const out = exportCypher(sampleDoc(), { onlyVisible: false });
    expect(out).toContain("CREATE (Hidden)");
    expect(out).toContain("-[:RELATED]-(Hidden)");
  });
  it("cypherValue", () => {
    expect(cypherValue("12")).toBe("12");
    expect(cypherValue(" 12")).toBe('" 12"');
    expect(cypherValue("a\nb")).toBe('"a\\nb"');
  });
});

describe("JSON", () => {
  it("export med bara synliga lager går att öppna igen", () => {
    const text = exportJson(sampleDoc(), { onlyVisible: true });
    const doc = parseDocument(JSON.parse(text));
    expect(doc.layers).toHaveLength(1);
    expect(Object.keys(doc.nodes)).toEqual(["a", "b"]);
    expect(Object.keys(doc.relationships)).toEqual(["r1"]);
  });
  it("visibleDocument rensar bort assets som inte används", () => {
    const doc = sampleDoc();
    const hidden = doc.layers[1]?.id ?? "";
    doc.assets.x = { id: "x", mime: "image/png", dataUrl: "data:,", width: 1, height: 1 };
    doc.images.i = {
      id: "i",
      layerId: hidden,
      assetId: "x",
      position: { x: 0, y: 0 },
      size: { w: 1, h: 1 },
      opacity: 1,
      locked: false,
    };
    expect(Object.keys(visibleDocument(doc).assets)).toEqual([]);
  });
});

describe("SVG", () => {
  it("renderar noder, relationer och anteckningar med viewBox runt innehållet", () => {
    const result = exportSvg(sampleDoc(), { onlyVisible: true, transparent: false });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.svg.startsWith("<svg xmlns=")).toBe(true);
    expect(result.svg).toContain("Alice");
    expect(result.svg).toContain("WORKS AT");
    expect(result.svg).toContain("Hej");
    expect(result.svg).not.toContain("Hidden");
    expect(result.svg).not.toContain("data-ref");
    expect(result.svg).toContain('fill="#ffffff"');
    expect(result.width).toBeGreaterThan(400);
  });
  it("transparent utelämnar bakgrundsrektangeln och tomt dokument ger null", () => {
    const result = exportSvg(sampleDoc(), { onlyVisible: true, transparent: true });
    expect(result?.svg.match(/<rect/g)?.length ?? 0).toBeLessThan(
      exportSvg(sampleDoc(), { onlyVisible: true, transparent: false })?.svg.match(/<rect/g)
        ?.length ?? 0,
    );
    expect(exportSvg(createEmptyDocument(), { onlyVisible: true, transparent: false })).toBeNull();
  });
});

describe("arrows.app-import", () => {
  const arrows = JSON.stringify({
    style: {
      "background-color": "#f0f0f0",
      "node-color": "#ffcc00",
      "border-width": 2,
      radius: 40,
      "arrow-width": 3,
      directionality: "directed",
    },
    nodes: [
      {
        id: "n0",
        position: { x: 10, y: 20 },
        caption: "Alice",
        labels: ["Person"],
        properties: { age: 30 },
        style: { "node-color": "#ff0000" },
      },
      {
        id: "n1",
        position: { x: 200, y: 20 },
        caption: "Bob",
        labels: [],
        properties: {},
        style: {},
      },
    ],
    relationships: [
      {
        id: "r0",
        fromId: "n0",
        toId: "n1",
        type: "KNOWS",
        properties: {},
        style: { directionality: "undirected" },
      },
      { id: "r1", fromId: "n0", toId: "saknas", type: "X", properties: {}, style: {} },
    ],
  });

  it("mappar noder, relationer och stil", () => {
    const doc = importArrowsJson(arrows, "Importerad");
    expect(doc.name).toBe("Importerad");
    expect(doc.layers).toHaveLength(1);
    const nodes = Object.values(doc.nodes);
    expect(nodes).toHaveLength(2);
    const alice = nodes.find((n) => n.caption === "Alice");
    expect(alice?.labels).toEqual(["Person"]);
    expect(alice?.properties).toEqual({ age: "30" });
    expect(alice?.style.fill).toBe("#ff0000");
    expect(alice?.position).toEqual({ x: 10, y: 20 });
    const rels = Object.values(doc.relationships);
    expect(rels).toHaveLength(1);
    expect(rels[0]?.type).toBe("KNOWS");
    expect(rels[0]?.style.directed).toBe(false);
    expect(doc.style.node.fill).toBe("#ffcc00");
    expect(doc.style.node.strokeWidth).toBe(2);
    expect(doc.style.node.radius).toBe(40);
    expect(doc.style.relationship.width).toBe(3);
    expect(doc.style.background).toBe("#f0f0f0");
    expect(parseDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
  });

  it("avvisar ogiltiga filer", () => {
    expect(() => importArrowsJson("{", "x")).toThrow(/JSON/);
    expect(() => importArrowsJson('{"nodes": "nej"}', "x")).toThrow(/arrows/);
  });
});
