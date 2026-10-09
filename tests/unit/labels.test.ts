import { beforeEach, describe, expect, it } from "vitest";
import { conflictingNodeIds, findLabelConflict, labelKey } from "@/model/labels";
import { clearHistory, useDocumentStore } from "@/store/documentStore";

const store = () => useDocumentStore.getState();
const layer = () => store().doc.layers[0]?.id ?? "";

beforeEach(() => {
  store().newDocument("Labels");
  clearHistory();
});

describe("labelKey", () => {
  it("är ordningsoberoende, trimmar och skiljer på stavning", () => {
    expect(labelKey(["Person", "Employee"])).toBe(labelKey(["Employee", " Person "]));
    expect(labelKey(["Person"])).not.toBe(labelKey(["person"]));
    expect(labelKey([])).toBe("");
  });
});

describe("unika labels", () => {
  it("tillåter flera noder utan labels och olika kombinationer", () => {
    const a = store().addNode(layer(), { x: 0, y: 0 });
    const b = store().addNode(layer(), { x: 0, y: 0 });
    expect(store().setNodeLabels([{ id: a, labels: ["Person"] }]).ok).toBe(true);
    expect(store().setNodeLabels([{ id: b, labels: ["Person", "Employee"] }]).ok).toBe(true);
    expect(conflictingNodeIds(store().doc.nodes).size).toBe(0);
  });

  it("stoppar samma label och samma kombination i annan ordning", () => {
    const a = store().addNode(layer(), { x: 0, y: 0 });
    const b = store().addNode(layer(), { x: 0, y: 0 });
    store().setNodeLabels([{ id: a, labels: ["Person", "Employee"] }]);
    const r = store().setNodeLabels([{ id: b, labels: ["Employee", "Person"] }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.conflict).toEqual({ nodeId: b, otherId: a });
    expect(store().doc.nodes[b]?.labels).toEqual([]);
  });

  it("stoppar borttagning som skulle skapa en krock", () => {
    const a = store().addNode(layer(), { x: 0, y: 0 });
    const b = store().addNode(layer(), { x: 0, y: 0 });
    store().setNodeLabels([{ id: a, labels: ["Person", "Employee"] }]);
    store().setNodeLabels([{ id: b, labels: ["Person"] }]);
    expect(store().setNodeLabels([{ id: a, labels: ["Person"] }]).ok).toBe(false);
    expect(store().doc.nodes[a]?.labels).toEqual(["Person", "Employee"]);
  });

  it("stoppar när flera markerade noder skulle få samma labels", () => {
    const a = store().addNode(layer(), { x: 0, y: 0 });
    const b = store().addNode(layer(), { x: 0, y: 0 });
    const r = store().setNodeLabels([
      { id: a, labels: ["X"] },
      { id: b, labels: ["X"] },
    ]);
    expect(r.ok).toBe(false);
    expect(store().doc.nodes[a]?.labels).toEqual([]);
  });

  it("updateNode och addNode kan inte kringgå regeln", () => {
    const a = store().addNode(layer(), { x: 0, y: 0 }, { labels: ["Person"] });
    const b = store().addNode(layer(), { x: 0, y: 0 }, { labels: ["Person"] });
    expect(store().doc.nodes[a]?.labels).toEqual(["Person"]);
    expect(store().doc.nodes[b]?.labels).toEqual([]);
    store().updateNode(b, { labels: ["Person"] });
    expect(store().doc.nodes[b]?.labels).toEqual([]);
  });

  it("kopior tappar labels som redan finns, men behåller dem efter klipp ut", () => {
    const a = store().addNode(layer(), { x: 0, y: 0 }, { labels: ["Person"] });
    const [copy] = store().duplicateElements([{ kind: "node", id: a }]);
    expect(copy && store().doc.nodes[copy.id]?.labels).toEqual([]);
    const content = store().copyElements([{ kind: "node", id: a }]);
    store().deleteElements([{ kind: "node", id: a }]);
    const [pasted] = store().pasteElements(content, layer());
    expect(pasted && store().doc.nodes[pasted.id]?.labels).toEqual(["Person"]);
  });

  it("befintliga krockar hindrar inte ändringar på andra noder", () => {
    const nodes = {
      a: { id: "a", labels: ["P"] },
      b: { id: "b", labels: ["P"] },
      c: { id: "c", labels: [] },
    };
    expect(findLabelConflict(nodes, [{ id: "c", labels: ["Q"] }])).toBeNull();
    expect(conflictingNodeIds(nodes)).toEqual(new Set(["a", "b"]));
  });
});
