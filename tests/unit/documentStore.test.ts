import { beforeEach, describe, expect, it } from "vitest";
import {
  beginHistoryGroup,
  clearHistory,
  endHistoryGroup,
  redo,
  undo,
  useDocumentStore,
} from "@/store/documentStore";
import {
  contentBounds,
  countElementsInLayer,
  elementsInLayer,
  isElementLocked,
  isElementVisible,
  isRelationshipVisible,
  relationshipBundles,
  renderGroups,
  resolvedNodeStyle,
  resolvedRelationshipStyle,
  visibleNotes,
  visibleRelationships,
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
    expect(store().doc.layers[0]?.name).toBe("Layer 1");
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
    const r = store().addRelationship(a, b);
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
    const r = store().addRelationship(a, b);
    store().setLayerVisible(l2, false);
    const doc = store().doc;
    expect(isElementVisible(doc, { kind: "node", id: b })).toBe(false);
    expect(isElementVisible(doc, { kind: "node", id: a })).toBe(true);
    const rel = doc.relationships[r];
    expect(rel && isRelationshipVisible(doc, rel)).toBe(false);
    const groups = renderGroups(doc);
    expect(groups).toHaveLength(1);
    expect(visibleRelationships(doc)).toHaveLength(0);
  });

  it("relationer har som standard inget lager: syns när båda ändnodernas lager syns", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const l3 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    const b = store().addNode(l2, { x: 100, y: 0 });
    const r = store().addRelationship(a, b);
    expect(store().doc.relationships[r]).not.toHaveProperty("layerId");
    expect(visibleRelationships(store().doc).map((x) => x.id)).toEqual([r]);
    // Ett lager utan någon av noderna påverkar inte relationen.
    store().setLayerVisible(l3, false);
    expect(visibleRelationships(store().doc)).toHaveLength(1);
    store().setLayerVisible(l1, false);
    expect(visibleRelationships(store().doc)).toHaveLength(0);
    store().setLayerVisible(l1, true);
    store().setLayerVisible(l2, false);
    expect(visibleRelationships(store().doc)).toHaveLength(0);
    store().setLayerVisible(l2, true);
    expect(isElementVisible(store().doc, { kind: "relationship", id: r })).toBe(true);
  });

  it("standardrelationer räknas inte till något lager och påverkas inte när noder flyttas", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    const b = store().addNode(l1, { x: 100, y: 0 });
    const r = store().addRelationship(a, b);
    expect(countElementsInLayer(store().doc, l1)).toBe(2);
    expect(elementsInLayer(store().doc, l1).some((ref) => ref.kind === "relationship")).toBe(false);
    store().moveElementsToLayer([{ kind: "node", id: a }], l2);
    expect(store().doc.nodes[a]?.layerId).toBe(l2);
    expect(store().doc.relationships[r]).not.toHaveProperty("layerId");
    // Att ta bort ett lager med flytt behåller relationen.
    store().removeLayer(l2, l1);
    expect(store().doc.relationships[r]).toBeDefined();
  });

  it("relation i ett lager: syns bara när lagret och båda ändnoderna syns, och räknas i lagret", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    const b = store().addNode(l1, { x: 100, y: 0 });
    const r = store().addRelationship(a, b);
    const ref = { kind: "relationship" as const, id: r };
    store().moveElementsToLayer([ref], l2);
    expect(store().doc.relationships[r]?.layerId).toBe(l2);
    expect(countElementsInLayer(store().doc, l2)).toBe(1);
    expect(isElementVisible(store().doc, ref)).toBe(true);

    // Eget lager dolt: relationen döljs fast noderna syns.
    store().setLayerVisible(l2, false);
    expect(visibleRelationships(store().doc)).toHaveLength(0);
    expect(visibleRelationships(store().doc, () => true)).toHaveLength(0);
    store().setLayerVisible(l2, true);
    // Nodernas lager dolt: relationen döljs fast dess eget lager syns.
    store().setLayerVisible(l1, false);
    expect(isElementVisible(store().doc, ref)).toBe(false);
    store().setLayerVisible(l1, true);
    // Filtret (t.ex. export av valda lager) gäller också relationens eget lager.
    expect(visibleRelationships(store().doc, (id) => id === l1)).toHaveLength(0);

    // Lagrets lås gäller relationen; nodernas lås gör det inte längre.
    store().setLayerLocked(l2, true);
    expect(isElementLocked(store().doc, ref)).toBe(true);
    store().setLayerLocked(l2, false);
    store().setLayerLocked(l1, true);
    expect(isElementLocked(store().doc, ref)).toBe(false);
    store().setLayerLocked(l1, false);

    // Tillbaka till standard: följer bara noderna igen.
    store().clearRelationshipLayer([r]);
    expect(store().doc.relationships[r]).not.toHaveProperty("layerId");
    store().setLayerVisible(l2, false);
    expect(isElementVisible(store().doc, ref)).toBe(true);
  });

  it("relation i ett lager följer lagrets innehåll när lagret tas bort", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const l3 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    const b = store().addNode(l1, { x: 100, y: 0 });
    const moved = store().addRelationship(a, b, { type: "MOVED" });
    const deleted = store().addRelationship(a, b, { type: "DELETED" });
    store().moveElementsToLayer([{ kind: "relationship", id: moved }], l2);
    store().moveElementsToLayer([{ kind: "relationship", id: deleted }], l3);
    store().removeLayer(l2, l1);
    expect(store().doc.relationships[moved]?.layerId).toBe(l1);
    store().removeLayer(l3);
    expect(store().doc.relationships[deleted]).toBeUndefined();
    expect(store().doc.nodes[a]).toBeDefined();
  });

  it("kopia av en relation i ett lager hamnar i mållagret; standardrelationer förblir standard", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    const b = store().addNode(l1, { x: 100, y: 0 });
    const plain = store().addRelationship(a, b, { type: "PLAIN" });
    const layered = store().addRelationship(a, b, { type: "LAYERED" });
    store().moveElementsToLayer([{ kind: "relationship", id: layered }], l1);
    const content = store().copyElements([
      { kind: "node", id: a },
      { kind: "node", id: b },
      { kind: "relationship", id: plain },
      { kind: "relationship", id: layered },
    ]);
    const created = store().pasteElements(content, l2);
    const copies = created
      .filter((ref) => ref.kind === "relationship")
      .flatMap((ref) => store().doc.relationships[ref.id] ?? []);
    expect(copies.find((r) => r.type === "PLAIN")).not.toHaveProperty("layerId");
    expect(copies.find((r) => r.type === "LAYERED")?.layerId).toBe(l2);
  });

  it("relation är låst när någon av ändnoderna ligger i låst lager", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    const b = store().addNode(l2, { x: 100, y: 0 });
    const r = store().addRelationship(a, b);
    const ref = { kind: "relationship", id: r } as const;
    expect(isElementLocked(store().doc, ref)).toBe(false);
    store().setLayerLocked(l2, true);
    expect(isElementLocked(store().doc, ref)).toBe(true);
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
});

describe("element", () => {
  it("tar bort nod och dess relationer", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 });
    const b = store().addNode(l, { x: 1, y: 1 });
    const r = store().addRelationship(a, b);
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
    const r = store().addRelationship(a, b);
    store().moveElements([{ kind: "node", id: a }], { x: 5, y: 5 });
    expect(store().doc.nodes[a]?.position).toEqual({ x: 5, y: 5 });
    store().reverseRelationships([r]);
    expect(store().doc.relationships[r]?.fromId).toBe(b);
  });

  it("duplicerar noder med relationer emellan", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 }, { properties: { name: "A" }, captionKey: "name" });
    const b = store().addNode(l, { x: 10, y: 0 });
    store().addRelationship(a, b, { type: "KNOWS" });
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

  it("stil utan markering gäller allt som syns; dolda element behåller sitt utseende", () => {
    const shown = firstLayer();
    const hidden = store().addLayer();
    const plain = store().addNode(shown, { x: 0, y: 0 });
    const custom = store().addNode(shown, { x: 100, y: 0 });
    const hiddenPlain = store().addNode(hidden, { x: 200, y: 0 });
    const hiddenCustom = store().addNode(hidden, { x: 300, y: 0 });
    store().setNodeStyle([custom], { fill: "#ff0000", radius: 70 });
    store().setNodeStyle([hiddenCustom], { fill: "#00ff00" });
    const visibleRel = store().addRelationship(plain, custom);
    const hiddenRel = store().addRelationship(plain, hiddenPlain);
    store().setRelationshipStyle([visibleRel], { color: "#ff0000" });
    store().setLayerVisible(hidden, false);

    store().setDocumentStyle({ node: { fill: "#0000ff" }, relationship: { color: "#0000ff" } });
    const doc = store().doc;
    const fill = (id: string) => {
      const node = doc.nodes[id];
      return node ? resolvedNodeStyle(doc, node).fill : undefined;
    };
    // Synliga noder får den nya färgen, även den som hade en egen färg …
    expect(fill(plain)).toBe("#0000ff");
    expect(fill(custom)).toBe("#0000ff");
    // … men bara för det som ändrades: dess egen radie finns kvar.
    expect(doc.nodes[custom]?.style).toEqual({ radius: 70 });
    // Dolda noder ser ut som förut, och nya noder får den nya färgen.
    expect(fill(hiddenPlain)).toBe("#ffffff");
    expect(fill(hiddenCustom)).toBe("#00ff00");
    expect(doc.style.node.fill).toBe("#0000ff");
    const color = (id: string) => {
      const rel = doc.relationships[id];
      return rel ? resolvedRelationshipStyle(doc, rel).color : undefined;
    };
    expect(color(visibleRel)).toBe("#0000ff");
    expect(color(hiddenRel)).toBe("#000000");
  });

  it("en dragning i ett reglage blir ett enda steg att ångra", () => {
    const a = store().addNode(firstLayer(), { x: 0, y: 0 });
    clearHistory();
    beginHistoryGroup();
    for (let radius = 51; radius <= 120; radius++) store().setNodeStyle([a], { radius });
    endHistoryGroup();
    expect(store().doc.nodes[a]?.style.radius).toBe(120);
    expect(useDocumentStore.temporal.getState().pastStates).toHaveLength(1);
    undo();
    expect(store().doc.nodes[a]?.style.radius).toBeUndefined();
    redo();
    expect(store().doc.nodes[a]?.style.radius).toBe(120);
    // Efter gruppen spåras ändringar som vanligt igen, en i taget.
    store().setNodeStyle([a], { radius: 30 });
    store().setNodeStyle([a], { radius: 40 });
    expect(useDocumentStore.temporal.getState().pastStates).toHaveLength(3);
    // En grupp utan ändringar lämnar historiken orörd.
    beginHistoryGroup();
    endHistoryGroup();
    store().setNodeStyle([a], { radius: 45 });
    expect(useDocumentStore.temporal.getState().pastStates).toHaveLength(4);
  });

  it("visa och dölj alla lager i ett steg", () => {
    const l2 = store().addLayer();
    store().setPropertiesVisible(true);
    clearHistory();
    store().setAllLayersVisible(false);
    expect(store().doc.layers.every((l) => !l.visible)).toBe(true);
    expect(store().doc.propertiesVisible).toBe(true);
    expect(useDocumentStore.temporal.getState().pastStates).toHaveLength(1);
    // Redan dolt: ingenting ändras och inget nytt ångra-steg skapas.
    store().setAllLayersVisible(false);
    expect(useDocumentStore.temporal.getState().pastStates).toHaveLength(1);
    store().setLayerVisible(l2, true);
    store().setAllLayersVisible(true);
    expect(store().doc.layers.every((l) => l.visible)).toBe(true);
  });

  it("knuten anteckning följer med när noden eller relationens noder flyttas", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 });
    const b = store().addNode(l, { x: 200, y: 0 });
    const r = store().addRelationship(a, b);
    const onNode = store().addNote({ x: 50, y: 50 }, { attachedTo: { kind: "node", id: a } });
    const onRel = store().addNote(
      { x: 100, y: 80 },
      { attachedTo: { kind: "relationship", id: r } },
    );
    const free = store().addNote({ x: 500, y: 500 });
    const pos = (id: string) => store().doc.notes[id]?.position;

    // Noden flyttas: dess anteckning följer helt, relationens följer halva vägen (mitten flyttas
    // hälften när bara ena änden rör sig), den fria står kvar.
    store().moveElements([{ kind: "node", id: a }], { x: 100, y: 40 });
    expect(pos(onNode)).toEqual({ x: 150, y: 90 });
    expect(pos(onRel)).toEqual({ x: 150, y: 100 });
    expect(pos(free)).toEqual({ x: 500, y: 500 });
    // Båda ändnoderna flyttas: relationens anteckning följer hela vägen.
    store().moveElements(
      [
        { kind: "node", id: a },
        { kind: "node", id: b },
      ],
      { x: 10, y: 10 },
    );
    expect(pos(onRel)).toEqual({ x: 160, y: 110 });
    // Flyttas anteckningen tillsammans med sin nod flyttas den en gång, inte två.
    store().moveElements(
      [
        { kind: "node", id: a },
        { kind: "note", id: onNode },
      ],
      { x: 5, y: 5 },
    );
    expect(pos(onNode)).toEqual({ x: 165, y: 105 });
    // Anteckningen själv går att flytta fritt; den sitter kvar på sin nod.
    store().moveElements([{ kind: "note", id: onNode }], { x: 1, y: 1 });
    expect(store().doc.notes[onNode]?.attachedTo).toEqual({ kind: "node", id: a });
    // Lossa och knyt om.
    store().attachNote(onNode, null);
    expect(store().doc.notes[onNode]).not.toHaveProperty("attachedTo");
    store().attachNote(onNode, { kind: "node", id: "finns-inte" });
    expect(store().doc.notes[onNode]).not.toHaveProperty("attachedTo");
    store().attachNote(free, { kind: "node", id: b });
    expect(store().doc.notes[free]?.attachedTo).toEqual({ kind: "node", id: b });
  });

  it("anteckningar har ett eget lager och följer synligheten hos det de är knutna till", () => {
    const l1 = firstLayer();
    const l2 = store().addLayer();
    const a = store().addNode(l1, { x: 0, y: 0 });
    const b = store().addNode(l2, { x: 200, y: 0 });
    const r = store().addRelationship(a, b);
    const onA = store().addNote({ x: 0, y: 100 }, { attachedTo: { kind: "node", id: a } });
    const onR = store().addNote({ x: 0, y: 200 }, { attachedTo: { kind: "relationship", id: r } });
    const free = store().addNote({ x: 0, y: 300 });
    const shown = () => visibleNotes(store().doc).map((n) => n.id);
    expect(shown()).toEqual([onA, onR, free]);
    // Anteckningar räknas inte till något vanligt lager och är aldrig låsta av ett lager.
    expect(countElementsInLayer(store().doc, l1)).toBe(1);
    store().setLayerLocked(l1, true);
    expect(isElementLocked(store().doc, { kind: "note", id: onA })).toBe(false);
    store().setLayerLocked(l1, false);
    // Döljs nodens lager döljs anteckningen på noden och på relationen, men inte den fria.
    store().setLayerVisible(l1, false);
    expect(shown()).toEqual([free]);
    store().setLayerVisible(l1, true);
    // Lagret Notes döljer alla.
    store().setNotesVisible(false);
    expect(shown()).toEqual([]);
    expect(isElementVisible(store().doc, { kind: "note", id: free })).toBe(false);
    store().setNotesVisible(true);
    // Tas noden bort blir dess anteckningar fria men ligger kvar (relationen försvinner med noden).
    store().deleteElements([{ kind: "node", id: a }]);
    expect(store().doc.notes[onA]).toBeDefined();
    expect(store().doc.notes[onA]).not.toHaveProperty("attachedTo");
    expect(store().doc.notes[onR]).not.toHaveProperty("attachedTo");
    // Ett borttaget lager tar inte med sig några anteckningar.
    store().removeLayer(l2);
    expect(Object.keys(store().doc.notes)).toHaveLength(3);
  });

  it("kopierad anteckning följer med kopian av det den är knuten till", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 });
    const note = store().addNote({ x: 50, y: 50 }, { attachedTo: { kind: "node", id: a } });
    const both = store().pasteElements(
      store().copyElements([
        { kind: "node", id: a },
        { kind: "note", id: note },
      ]),
      l,
    );
    const newNode = both.find((ref) => ref.kind === "node")?.id;
    const newNote = both.find((ref) => ref.kind === "note")?.id ?? "";
    expect(store().doc.notes[newNote]?.attachedTo).toEqual({ kind: "node", id: newNode });
    // Kopieras bara anteckningen sitter kopian kvar på samma nod.
    const alone = store().pasteElements(store().copyElements([{ kind: "note", id: note }]), l);
    expect(store().doc.notes[alone[0]?.id ?? ""]?.attachedTo).toEqual({ kind: "node", id: a });
  });

  it("parallella relationer grupperas", () => {
    const l = firstLayer();
    const a = store().addNode(l, { x: 0, y: 0 });
    const b = store().addNode(l, { x: 10, y: 0 });
    const r1 = store().addRelationship(a, b);
    const r2 = store().addRelationship(b, a);
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
    // Radie 50 plus kanten (4 px) som ligger utanför den fyllda ytan.
    expect(contentBounds(store().doc)?.w).toBe(108);
    expect(contentBounds(store().doc, false)?.w).toBeGreaterThan(1000);
  });
});

describe("rubrik som egenskap", () => {
  it("setCaption skapar egenskapen name och markerar den som rubrik", () => {
    const n = store().addNode(firstLayer(), { x: 0, y: 0 });
    store().setCaption(n, "Alice");
    expect(store().doc.nodes[n]?.properties).toEqual({ name: "Alice" });
    expect(store().doc.nodes[n]?.captionKey).toBe("name");
    store().setCaption(n, "Bob");
    expect(store().doc.nodes[n]?.properties.name).toBe("Bob");
  });

  it("byte, namnbyte och borttagning av rubrikegenskap", () => {
    const n = store().addNode(firstLayer(), { x: 0, y: 0 }, { properties: { a: "1", b: "2" } });
    const ref = { kind: "node" as const, id: n };
    store().setCaptionKey([n], "b");
    expect(store().doc.nodes[n]?.captionKey).toBe("b");
    store().setCaptionKey([n], "saknas");
    expect(store().doc.nodes[n]?.captionKey).toBe("b");
    store().renameProperty([ref], "b", "title");
    expect(store().doc.nodes[n]?.captionKey).toBe("title");
    store().removeProperty([ref], "title");
    expect(store().doc.nodes[n]?.captionKey).toBeNull();
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
