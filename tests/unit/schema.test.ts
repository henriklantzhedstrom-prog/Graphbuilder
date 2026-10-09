import { describe, expect, it } from "vitest";
import { createEmptyDocument } from "@/model/defaults";
import { DocumentParseError, parseDocument } from "@/model/schema";

describe("parseDocument", () => {
  it("accepterar ett tomt dokument", () => {
    const doc = createEmptyDocument("Test");
    expect(parseDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
  });

  it("avvisar fel version med tydligt fel", () => {
    expect(() => parseDocument({ version: 99 })).toThrow(DocumentParseError);
    expect(() => parseDocument({ version: 99 })).toThrow(/version 99/);
    expect(() => parseDocument("nej")).toThrow(DocumentParseError);
  });

  it("fyller i standardvärden och lagar inkonsekvenser", () => {
    const base = createEmptyDocument("Test");
    const layerId = base.layers[0]?.id ?? "";
    const raw = {
      ...base,
      nodes: {
        a: { id: "a", layerId, position: { x: 0, y: 0 } },
        b: { id: "b", layerId: "saknas", position: { x: 1, y: 1 } },
      },
      relationships: {
        r1: { id: "r1", layerId, fromId: "a", toId: "b" },
        r2: { id: "r2", layerId, fromId: "a", toId: "borta" },
      },
      images: {
        i1: {
          id: "i1",
          layerId,
          assetId: "nope",
          position: { x: 0, y: 0 },
          size: { w: 10, h: 10 },
        },
      },
      assets: { x: { id: "x", mime: "image/png", dataUrl: "data:,", width: 1, height: 1 } },
      style: { node: { radius: 30 } },
    };
    const doc = parseDocument(raw);
    expect(doc.nodes.a?.captionKey).toBeNull();
    expect(doc.nodes.a?.labels).toEqual([]);
    expect(doc.nodes.b?.layerId).toBe(layerId);
    expect(Object.keys(doc.relationships)).toEqual(["r1"]);
    expect(Object.keys(doc.images)).toEqual([]);
    expect(Object.keys(doc.assets)).toEqual([]);
    expect(doc.style.node.radius).toBe(30);
    expect(doc.style.node.fill).toBe("#ffffff");
    expect(doc.style.relationship.directed).toBe(true);
  });

  it("läser version 2 där relationer hade lager och tar bort fältet", () => {
    const base = createEmptyDocument("Old");
    const layerId = base.layers[0]?.id ?? "";
    const raw = {
      ...JSON.parse(JSON.stringify(base)),
      version: 2,
      nodes: {
        a: { id: "a", layerId, position: { x: 0, y: 0 }, captionKey: null },
        b: { id: "b", layerId, position: { x: 1, y: 1 }, captionKey: null },
      },
      relationships: { r1: { id: "r1", layerId: "gammalt-lager", fromId: "a", toId: "b" } },
    };
    const doc = parseDocument(raw);
    expect(doc.version).toBe(3);
    expect(doc.relationships.r1).toBeDefined();
    expect(doc.relationships.r1).not.toHaveProperty("layerId");
  });

  it("läser äldre modeller med opacitet på lager och tar bort fältet", () => {
    const base = createEmptyDocument("Old");
    const raw = JSON.parse(JSON.stringify(base));
    raw.layers[0].opacity = 0.5;
    const doc = parseDocument(raw);
    expect(doc.layers[0]).not.toHaveProperty("opacity");
    expect(doc.layers[0]?.name).toBe(base.layers[0]?.name);
  });

  it("migrerar version 1: rubriken blir egenskapen name och markeras som rubrik", () => {
    const base = createEmptyDocument("V1");
    const layerId = base.layers[0]?.id ?? "";
    const raw = {
      ...JSON.parse(JSON.stringify(base)),
      version: 1,
      nodes: {
        a: { id: "a", layerId, position: { x: 0, y: 0 }, caption: "Alice", properties: {} },
        b: {
          id: "b",
          layerId,
          position: { x: 0, y: 0 },
          caption: "Bob",
          properties: { name: "X" },
        },
        c: { id: "c", layerId, position: { x: 0, y: 0 }, caption: "", properties: { k: "v" } },
      },
    };
    const doc = parseDocument(raw);
    expect(doc.version).toBe(3);
    expect(doc.nodes.a?.properties).toEqual({ name: "Alice" });
    expect(doc.nodes.a?.captionKey).toBe("name");
    expect(doc.nodes.b?.properties).toEqual({ name: "X", caption: "Bob" });
    expect(doc.nodes.b?.captionKey).toBe("caption");
    expect(doc.nodes.c?.captionKey).toBeNull();
    expect(doc.nodes.a).not.toHaveProperty("caption");
  });

  it("ger ett lager om listan är tom", () => {
    const doc = parseDocument({ ...createEmptyDocument(), layers: [] });
    expect(doc.layers).toHaveLength(1);
  });
});
