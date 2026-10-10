import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { arrange, countCrossings, type LayoutEdge, type LayoutNode } from "@/model/autoLayout";

const node = (id: string): LayoutNode => ({ id, left: 54, right: 54, top: 54, bottom: 54 });
const edge = (from: string, to: string): LayoutEdge => ({ from, to });
const points = (entries: [string, number, number][]) =>
  new Map(entries.map(([id, x, y]) => [id, { x, y }]));

describe("räkna korsningar", () => {
  it("räknar par av relationer som korsar varandra", () => {
    const square = points([
      ["a", 0, 0],
      ["b", 100, 0],
      ["c", 100, 100],
      ["d", 0, 100],
    ]);
    expect(countCrossings(square, [edge("a", "c"), edge("b", "d")])).toBe(1);
    expect(countCrossings(square, [edge("a", "b"), edge("c", "d")])).toBe(0);
    // Relationer som delar en nod korsar inte varandra; parallella räknas som en; loopar inte alls.
    expect(countCrossings(square, [edge("a", "c"), edge("a", "b"), edge("a", "a")])).toBe(0);
    expect(countCrossings(square, [edge("a", "c"), edge("c", "a"), edge("b", "d")])).toBe(1);
  });
});

describe("automatisk placering", () => {
  const overlaps = (nodes: LayoutNode[], at: Map<string, { x: number; y: number }>) => {
    let count = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i] as LayoutNode;
        const b = nodes[j] as LayoutNode;
        const pa = at.get(a.id) as { x: number; y: number };
        const pb = at.get(b.id) as { x: number; y: number };
        const apart =
          pa.x + a.right <= pb.x - b.left ||
          pb.x + b.right <= pa.x - a.left ||
          pa.y + a.bottom <= pb.y - b.top ||
          pb.y + b.bottom <= pa.y - a.top;
        if (!apart) count++;
      }
    }
    return count;
  };

  it("löser upp en graf som går att rita utan korsningar", () => {
    // Två fyrkanter som delar en kant, med en nod i mitten av den ena: plan graf.
    const ids = ["a", "b", "c", "d", "e", "f", "g"];
    const nodes = ids.map(node);
    const edges = [
      edge("a", "b"),
      edge("b", "c"),
      edge("c", "d"),
      edge("d", "a"),
      edge("b", "e"),
      edge("e", "f"),
      edge("f", "c"),
      edge("g", "a"),
      edge("g", "c"),
    ];
    const result = arrange(nodes, edges);
    expect(result.size).toBe(7);
    expect(countCrossings(result, edges)).toBe(0);
    expect(overlaps(nodes, result)).toBe(0);
  });

  it("en ring med tio noder blir utan korsningar, och ett träd likaså", () => {
    const ring = Array.from({ length: 10 }, (_, i) => `n${i}`);
    const ringEdges = ring.map((id, i) => edge(id, ring[(i + 1) % ring.length] as string));
    expect(countCrossings(arrange(ring.map(node), ringEdges), ringEdges)).toBe(0);
    const tree = Array.from({ length: 15 }, (_, i) => `t${i}`);
    const treeEdges = tree.slice(1).map((id, i) => edge(tree[Math.floor(i / 2)] as string, id));
    expect(countCrossings(arrange(tree.map(node), treeEdges), treeEdges)).toBe(0);
  });

  it("K5 kan inte ritas utan korsning: resultatet har precis en", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const edges: LayoutEdge[] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) edges.push(edge(ids[i] as string, ids[j] as string));
    }
    expect(countCrossings(arrange(ids.map(node), edges), edges)).toBe(1);
  });

  it("ger plats åt höga noder (långa egenskapslistor) och är deterministisk", () => {
    const nodes: LayoutNode[] = [
      { id: "a", left: 54, right: 54, top: 54, bottom: 400 },
      { id: "b", left: 150, right: 150, top: 90, bottom: 60 },
      node("c"),
      node("d"),
    ];
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "d"), edge("d", "a")];
    const first = arrange(nodes, edges);
    expect(overlaps(nodes, first)).toBe(0);
    expect(countCrossings(first, edges)).toBe(0);
    expect([...arrange(nodes, edges)]).toEqual([...first]);
    // Bilden börjar i origo: inget ritas på negativa koordinater.
    for (const n of nodes) {
      const p = first.get(n.id) as { x: number; y: number };
      expect(p.x - n.left).toBeGreaterThanOrEqual(-1e-9);
      expect(p.y - n.top).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it("Northwind-modellen går att lägga upp helt utan korsningar", () => {
    const doc = JSON.parse(readFileSync("public/northwind.json", "utf8"));
    const nodes = Object.keys(doc.nodes).map(node);
    const edges = Object.values(
      doc.relationships as Record<string, { fromId: string; toId: string }>,
    ).map((r) => edge(r.fromId, r.toId));
    const result = arrange(nodes, edges);
    expect(countCrossings(result, edges)).toBe(0);
    expect(overlaps(nodes, result)).toBe(0);
  });

  it("klarar den stora testmodellen på rimlig tid och minskar korsningarna kraftigt", () => {
    const doc = JSON.parse(readFileSync("public/test-model-200.json", "utf8"));
    const before = new Map(
      Object.values(
        doc.nodes as Record<string, { id: string; position: { x: number; y: number } }>,
      ).map((n) => [n.id, n.position]),
    );
    const nodes = [...before.keys()].map(node);
    const edges = Object.values(
      doc.relationships as Record<string, { fromId: string; toId: string }>,
    ).map((r) => edge(r.fromId, r.toId));
    const started = performance.now();
    const result = arrange(nodes, edges, { current: before });
    const elapsed = performance.now() - started;
    expect(result.size).toBe(200);
    expect(overlaps(nodes, result)).toBe(0);
    expect(countCrossings(result, edges)).toBeLessThan(countCrossings(before, edges));
    expect(elapsed).toBeLessThan(8000);
  });
});
