import { describe, expect, it } from "vitest";
import {
  boxContainsBox,
  boxFromPoints,
  circleIntersectsBox,
  fitBoxInViewport,
  PARALLEL_SPACING,
  relationshipGeometry,
  screenToCanvas,
  snapToPoints,
  unionBoxes,
  wrapText,
  zoomAt,
} from "@/model/geometry";

describe("boxar", () => {
  it("skapar box från två punkter oavsett ordning", () => {
    expect(boxFromPoints({ x: 10, y: 20 }, { x: 0, y: 5 })).toEqual({ x: 0, y: 5, w: 10, h: 15 });
  });
  it("union av boxar", () => {
    expect(
      unionBoxes([
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 5, y: 5, w: 10, h: 10 },
      ]),
    ).toEqual({ x: 0, y: 0, w: 15, h: 15 });
    expect(unionBoxes([])).toBeNull();
  });
  it("box-i-box och cirkel-mot-box", () => {
    expect(boxContainsBox({ x: 0, y: 0, w: 10, h: 10 }, { x: 1, y: 1, w: 2, h: 2 })).toBe(true);
    expect(boxContainsBox({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 1, w: 2, h: 2 })).toBe(false);
    expect(circleIntersectsBox({ x: 0, y: 0 }, 5, { x: 3, y: 3, w: 10, h: 10 })).toBe(true);
    expect(circleIntersectsBox({ x: 0, y: 0 }, 5, { x: 10, y: 10, w: 10, h: 10 })).toBe(false);
  });
});

describe("viewport", () => {
  it("zoomAt håller ankarpunkten stilla", () => {
    const vp = { x: 100, y: 50, zoom: 1 };
    const anchor = { x: 300, y: 200 };
    const before = screenToCanvas(vp, anchor);
    const after = screenToCanvas(zoomAt(vp, anchor, 2), anchor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
  it("zoomAt begränsas till min/max", () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, 1000).zoom).toBe(8);
    expect(zoomAt({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, 0.0001).zoom).toBe(0.1);
  });
  it("fitBoxInViewport centrerar innehållet", () => {
    const vp = fitBoxInViewport({ x: 0, y: 0, w: 200, h: 100 }, { w: 800, h: 600 }, 0);
    const center = screenToCanvas(vp, { x: 400, y: 300 });
    expect(center.x).toBeCloseTo(100);
    expect(center.y).toBeCloseTo(50);
  });
});

describe("relationsgeometri", () => {
  const ends = { from: { x: 0, y: 0 }, fromRadius: 50, to: { x: 300, y: 0 }, toRadius: 50 };
  it("rak linje startar på cirkelns kant och har pilspets", () => {
    const g = relationshipGeometry(
      ends,
      { index: 0, count: 1, reversed: false },
      { arrowSize: 8, directed: true },
    );
    expect(g.path.startsWith("M 50 0 L")).toBe(true);
    expect(g.arrow.startsWith("250,0")).toBe(true);
    expect(g.labelPosition).toEqual({ x: 150, y: 0 });
    expect(g.labelAngle).toBe(0);
  });
  it("oriktad relation saknar pil", () => {
    const g = relationshipGeometry(
      ends,
      { index: 0, count: 1, reversed: false },
      { arrowSize: 8, directed: false },
    );
    expect(g.arrow).toBe("");
  });
  it("parallella relationer böjs åt olika håll", () => {
    const a = relationshipGeometry(
      ends,
      { index: 0, count: 2, reversed: false },
      { arrowSize: 8, directed: true },
    );
    const b = relationshipGeometry(
      ends,
      { index: 1, count: 2, reversed: false },
      { arrowSize: 8, directed: true },
    );
    // Böj nära noderna, rak parallell mittdel.
    expect(a.path).toMatch(/C .* L .* C /);
    expect(Math.sign(a.labelPosition.y)).not.toBe(Math.sign(b.labelPosition.y));
    expect(Math.abs(a.labelPosition.y)).toBeCloseTo(PARALLEL_SPACING / 2);
    expect(a.labelAngle).toBe(0);
  });

  it("den raka mittdelen ligger på samma avstånd från mittlinjen hela vägen", () => {
    const g = relationshipGeometry(
      ends,
      { index: 0, count: 2, reversed: false },
      { arrowSize: 8, directed: true },
    );
    const nums = (g.path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    // M sx sy C 4 tal bendStart(x,y) L bendEnd(x,y) ...
    const bendStartY = nums[7];
    const bendEndY = nums[9];
    expect(bendStartY).toBeCloseTo(bendEndY ?? Number.NaN);
    expect(Math.abs(bendStartY ?? 0)).toBeCloseTo(PARALLEL_SPACING / 2);
    // Böjen sker nära noderna: rak del börjar senast 30 px utanför nodkanten.
    expect(nums[6]).toBeCloseTo(50 + 30);
  });

  it("noder nära varandra får en enkel båge", () => {
    const g = relationshipGeometry(
      { from: { x: 0, y: 0 }, fromRadius: 50, to: { x: 150, y: 0 }, toRadius: 50 },
      { index: 0, count: 2, reversed: false },
      { arrowSize: 8, directed: true },
    );
    expect(g.path).toContain("Q");
  });
  it("självloop ritas som kurva ovanför noden", () => {
    const g = relationshipGeometry(
      { from: { x: 0, y: 0 }, fromRadius: 50, to: { x: 0, y: 0 }, toRadius: 50 },
      { index: 0, count: 1, reversed: false },
      { arrowSize: 8, directed: true },
    );
    expect(g.path).toContain("C");
    expect(g.labelPosition.y).toBeLessThan(-50);
  });
});

describe("snap", () => {
  it("snappar till närmaste x och y inom tolerans", () => {
    const r = snapToPoints({ x: 103, y: 50 }, [{ x: 100, y: 200 }], 5);
    expect(r.position).toEqual({ x: 100, y: 50 });
    expect(r.guides).toEqual([{ axis: "x", value: 100 }]);
  });
});

describe("wrapText", () => {
  it("bryter rader på ordgräns och behåller radbrytningar", () => {
    expect(wrapText("hej på dig alla", 7)).toEqual(["hej på", "dig", "alla"]);
    expect(wrapText("a\n\nb", 10)).toEqual(["a", "", "b"]);
  });
});
