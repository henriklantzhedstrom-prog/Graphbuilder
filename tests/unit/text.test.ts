import { describe, expect, it } from "vitest";
import { estimateTextWidth, measureTextWidth } from "@/canvas/render/text";

describe("measureTextWidth", () => {
  it("faller tillbaka på uppskattning utan textmätning och ger samma svar igen", () => {
    const w = measureTextWidth("Person", 14);
    expect(w).toBeCloseTo(estimateTextWidth("Person", 14));
    expect(measureTextWidth("Person", 14)).toBe(w);
    expect(measureTextWidth("", 14)).toBe(0);
  });
});
