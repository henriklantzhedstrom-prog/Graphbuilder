import { beforeEach, describe, expect, it } from "vitest";
import { clearHistory, redo, undo, useDocumentStore } from "@/store/documentStore";
import {
  contentBounds,
  isElementLocked,
  isElementVisible,
  isRelationshipVisible,
  relationshipBundles,
  renderGroups,
} from "@/store/selectors";

const store = () => useDocumentStore.getState();
const firstLayer = () => store().doc.layers[0]?.id ?? "";

beforeEach(() => {
  store().newDocument("Test");
  clearHistory();
});

describe("lager", () => {
  it("nytt dokument har ett lager", () => {
    expect(store().doc.layers).toHaveLength(1);
    expect(store().doc.layers[0]?.name).toBe("Lager 1");
  });

  it("lägger till, byter namn, flyttar och tar bort lager", () => {
    const l2 = store().addLayer();
    expect(store().doc.layers.map((l) => l.id)).toEqual([firstLayer(), l2]);
    store().renameLayer(l2, "Översikt");
    expect(store().doc.layers[1]?.name).toBe("Översikt");
    store().moveLayer(l2, 0);
    expect(store().doc.layers[0]?.id).toBe(l2);
    store().removeLayer(l2);
    expect(store().doc.layers).toHaveLength(1);
  });

  it("sista lagret kan inte tas bort", () => {
    store().removeLayer(firstLayer());
    expect(store().doc.layers).toHaveLength(1);
  });

  it("tar bort lager och flyttar innehåll till annat lager", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const n = store().addNode(l2, { x: 0, y: 0 });
    store().removeLayer(l2, l1);
    expect(store().doc.nodes[n]?.layerId).toBe(l1);
  });

  it("tar bort lager med innehåll, inklusive relationer till borttagna noder", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    const b = store().addNode(l2, { x: 100, y: 0 });
    const r = store().addRelationship(l1, a, b);
    store().removeLayer(l2);
    expect(store().doc.nodes[b]).toBeUndefined();
    expect(store().doc.relationships[r]).toBeUndefined();
    expect(store().doc.nodes[a]).toBeDefined();
  });

  it("dolt lager döljer element och relationer till dolda noder", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    const b = store().addNode(l2, { x: 100, y: 0 });
    const r = store().addRelationship(l1, a, b);
    store().setLayerVisible(l2, false);
    const doc = store().doc;
    expect(isElementVisible(doc, { kind: "node", id: b })).toBe(false);
    expect(isElementVisible(doc, { kind: "node", id: a })).toBe(true);
    const rel = doc.relationships[r];
    expect(rel && isRelationshipVisible(doc, rel)).toBe(false);
    const groups = renderGroups(doc);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.relationships).toHaveLength(0);
  });

  it("låst lager gör element olåsbara, låst bild likaså", () => {
    const l1 = firstLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    store().setLayerLocked(l1, true);
    expect(isElementLocked(store().doc, { kind: "node", id: a })).toBe(true);
    store().setLayerLocked(l1, false);
    expect(isElementLocked(store().doc, { kind: "node", id: a })).toBe(false);
    const asset = store().addAsset({ mime: "image/png", dataUrl: "data:,x", width: 2, height: 2 });
    const im = store().addImage(l1, asset, { x: 0, y: 0 }, { w: 2, h: 2 }, { locked: true });
    expect(isElementLocked(store().doc, { kind: "image", id: im })).toBe(true);
  });

  it("flyttar element till annat lager", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    store().moveElementsToLayer([{ kind: "node", id: a }], l2);
    expect(store().doc.nodes[a]?.layerId).toBe(l2);
  });

  it("ensureBackgroundLayer skapar understa lagret en gång", () => {
    const id = store().ensureBackgroundLayer();
    expect(store().doc.layers[0]?.id).toBe(id);
    expect(store().ensureBackgroundLayer()).toBe(id);
    expect(store().doc.layers).toHaveLength(2);
  });

  it("opacitet begränsas till 0–1", () => {
    store().setLayerOpacity(firstLayer(), 5);
    expect(store().doc.layers[0]?.opacity).toBe(1);
  });
});

describe("element", () => {
  it("tar bort nod och dess relationer", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 });
    const b = store().addNode(l, { x: 1, y: 1 });
    const r = store().addRelationship(l, a, b);
    store().deleteElements([{ kind: "node", id: a }]);
    expect(store().doc.relationships[r]).toBeUndefined();
    expect(store().doc.nodes[b]).toBeDefined();
  });

  it("tar bort bild och dess asset om ingen annan använder den", () => {
    const l = firstLayer();
    const asset = store().addAsset({ mime: "image/png", dataUrl: "data:,x", width: 2, height: 2 });
    const i1 = store().addImage(l, asset, { x: 0, y: 0 }, { w: 2, h: 2 });
    const i2 = store().addImage(l, asset, { x: 0, y: 0 }, { w: 2, h: 2 });
    store().deleteElements([{ kind: "image", id: i1 }]);
    expect(store().doc.assets[asset]).toBeDefined();
    store().deleteElements([{ kind: "image", id: i2 }]);
    expect(store().doc.assets[asset]).toBeUndefined();
  });

  it("delar asset vid dubbletter", () => {
    const a1 = store().addAsset({ mime: "image/png", dataUrl: "data:,x", width: 2, height: 2 });
    const a2 = store().addAsset({ mime: "image/png", dataUrl: "data:,x", width: 2, height: 2 });
    expect(a1).toBe(a2);
  });

  it("flyttar och vänder", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 });
    const b = store().addNode(l, { x: 10, y: 0 });
    const r = store().addRelationship(l, a, b);
    store().moveElements([{ kind: "node", id: a }], { x: 5, y: 5 });
    expect(store().doc.nodes[a]?.position).toEqual({ x: 5, y: 5 });
    store().reverseRelationships([r]);
    expect(store().doc.relationships[r]?.fromId).toBe(b);
  });

  it("duplicerar noder med relationer emellan", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 }, { caption: "A" });
    const b = store().addNode(l, { x: 10, y: 0 });
    store().addRelationship(l, a, b, { type: "KNOWS" });
    const created = store().duplicateElements([
      { kind: "node", id: a },
      { kind: "node", id: b },
    ]);
    expect(created.filter((c) => c.kind === "node")).toHaveLength(2);
    expect(created.filter((c) => c.kind === "relationship")).toHaveLength(1);
    expect(Object.keys(store().doc.nodes)).toHaveLength(4);
    const newNode = created.find((c) => c.kind === "node");
    expect(newNode && store().doc.nodes[newNode.id]?.position).toEqual({ x: 40, y: 40 });
  });

  it("klistrar in i angivet lager", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    const content = store().copyElements([{ kind: "node", id: a }]);
    const [pasted] = store().pasteElements(content, l2);
    expect(pasted && store().doc.nodes[pasted.id]?.layerId).toBe(l2);
  });

  it("egenskaper: sätt, byt namn, ta bort", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 });
    const ref = { kind: "node" as const, id: a };
    store().setProperty([ref], "name", "Alice");
    store().renameProperty([ref], "name", "namn");
    expect(store().doc.nodes[a]?.properties).toEqual({ namn: "Alice" });
    store().removeProperty([ref], "namn");
    expect(store().doc.nodes[a]?.properties).toEqual({});
  });

  it("stil: per element, återställ, dokument", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 });
    store().setNodeStyle([a], { fill: "#ff0000" });
    expect(store().doc.nodes[a]?.style.fill).toBe("#ff0000");
    store().resetElementStyle([{ kind: "node", id: a }]);
    expect(store().doc.nodes[a]?.style).toEqual({});
    store().setDocumentStyle({ node: { radius: 30 }, background: "#eee" });
    expect(store().doc.style.node.radius).toBe(30);
    expect(store().doc.style.background).toBe("#eee");
  });

  it("parallella relationer grupperas", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 });
    const b = store().addNode(l, { x: 10, y: 0 });
    const r1 = store().addRelationship(l, a, b);
    const r2 = store().addRelationship(l, b, a);
    const bundles = relationshipBundles(store().doc);
    expect(bundles.get(r1)?.count).toBe(2);
    expect(bundles.get(r2)?.count).toBe(2);
    expect(bundles.get(r1)?.index).not.toBe(bundles.get(r2)?.index);
  });

  it("contentBounds respekterar synlighet", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    store().addNode(l1, { x: 0, y: 0 });
    store().addNode(l2, { x: 1000, y: 0 });
    expect(contentBounds(store().doc)?.w).toBeGreaterThan(1000);
    store().setLayerVisible(l2, false);
    expect(contentBounds(store().doc)?.w).toBe(100);
    expect(contentBounds(store().doc, false)?.w).toBeGreaterThan(1000);
  });
});

describe("ångra/gör om", () => {
  it("ångrar och gör om alla slags ändringar", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 });
    const l2 = store().addLayer();
    store().setLayerVisible(l2, false);
    expect(store().doc.layers[1]?.visible).toBe(false);
    undo();
    expect(store().doc.layers[1]?.visible).toBe(true);
    undo();
    expect(store().doc.layers).toHaveLength(1);
    undo();
    expect(store().doc.nodes[a]).toBeUndefined();
    redo();
    expect(store().doc.nodes[a]).toBeDefined();
    redo();
    redo();
    expect(store().doc.layers[1]?.visible).toBe(false);
  });
});
