import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findLabelConflict } from "@/model/labels";
import { parseDocument } from "@/model/schema";

/** Testmodellen i public/ (skapas av scripts/generate-test-model.mjs) ska hålla det den lovar. */
describe("testmodellen med 200 noder", () => {
  const doc = parseDocument(JSON.parse(readFileSync("public/test-model-200.json", "utf8")));
  const nodes = Object.values(doc.nodes);
  const relationships = Object.values(doc.relationships);

  it("har 200 noder med 10–50 egenskaper var", () => {
    expect(nodes).toHaveLength(200);
    const counts = nodes.map((n) => Object.keys(n.properties).length);
    expect(Math.min(...counts)).toBe(10);
    expect(Math.max(...counts)).toBe(50);
  });

  it("är fördelad på tio lager med 7–20 noder i varje", () => {
    expect(doc.layers).toHaveLength(10);
    for (const layer of doc.layers) {
      const count = nodes.filter((n) => n.layerId === layer.id).length;
      expect(count).toBeGreaterThanOrEqual(7);
      expect(count).toBeLessThanOrEqual(20);
    }
  });

  it("de flesta sammankopplade par har en relation, som mest tio", () => {
    const perPair = new Map<string, number>();
    for (const r of relationships) {
      const key = [r.fromId, r.toId].sort().join("|");
      perPair.set(key, (perPair.get(key) ?? 0) + 1);
    }
    const sizes = [...perPair.values()];
    expect(sizes.filter((n) => n === 1).length).toBeGreaterThan(sizes.length / 2);
    expect(Math.max(...sizes)).toBe(10);
    // Inget tappades vid inläsningen, och varje nod har en egen labelkombination.
    expect(relationships.every((r) => r.fromId in doc.nodes && r.toId in doc.nodes)).toBe(true);
    expect(
      findLabelConflict(
        {},
        nodes.map((n) => ({ id: n.id, labels: n.labels })),
      ),
    ).toBeNull();
  });
});
