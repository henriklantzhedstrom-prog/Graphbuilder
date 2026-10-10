import { describe, expect, it } from "vitest";
import { easeFraction, stepViewport } from "@/canvas/viewportAnimation";
import { screenToCanvas, type Viewport } from "@/model/geometry";

describe("mjuk zoom", () => {
  it("närmar sig målet i många små steg och landar exakt på det", () => {
    const anchor = { x: 400, y: 300 };
    const fixed = screenToCanvas({ x: 0, y: 0, zoom: 1 }, anchor);
    let vp: Viewport = { x: 0, y: 0, zoom: 1 };
    const zooms: number[] = [];
    let done = false;
    for (let i = 0; i < 200 && !done; i++) {
      const next = stepViewport(vp, { kind: "zoom", zoom: 2, anchor }, easeFraction(16));
      // Inget enskilt steg är ett hopp: högst ca 20 % per bildruta på väg mot dubbla storleken.
      expect(next.viewport.zoom / vp.zoom).toBeLessThan(1.2);
      expect(next.viewport.zoom).toBeGreaterThanOrEqual(vp.zoom);
      vp = next.viewport;
      done = next.done;
      zooms.push(vp.zoom);
      // Punkten under muspekaren ligger still hela vägen.
      const now = screenToCanvas(vp, anchor);
      expect(now.x).toBeCloseTo(fixed.x, 6);
      expect(now.y).toBeCloseTo(fixed.y, 6);
    }
    expect(done).toBe(true);
    expect(zooms.length).toBeGreaterThan(8);
    expect(vp.zoom).toBeCloseTo(2, 10);
  });

  it("glider till en hel vy och respekterar zoomgränserna", () => {
    const goal: Viewport = { x: 120, y: -80, zoom: 0.5 };
    let vp: Viewport = { x: 0, y: 0, zoom: 2 };
    let done = false;
    for (let i = 0; i < 200 && !done; i++) {
      ({ viewport: vp, done } = stepViewport(vp, { kind: "viewport", viewport: goal }, 0.25));
    }
    expect(vp).toEqual(goal);
    // Utan animation (fraction 1) tas hela steget direkt, och zoomAt klämmer till maxgränsen.
    const jump = stepViewport(
      { x: 0, y: 0, zoom: 1 },
      { kind: "zoom", zoom: 8, anchor: { x: 0, y: 0 } },
      1,
    );
    expect(jump).toEqual({ viewport: { x: 0, y: 0, zoom: 8 }, done: true });
  });
});
