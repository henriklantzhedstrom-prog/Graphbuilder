import { describe, expect, it } from "vitest";
import { fitWithin, imageFilesFrom, isAcceptedImage } from "@/canvas/images";

describe("bilder", () => {
  it("fitWithin skalar bara ner", () => {
    expect(fitWithin({ w: 8000, h: 4000 }, 4096)).toEqual({ w: 4096, h: 2048 });
    expect(fitWithin({ w: 100, h: 50 }, 4096)).toEqual({ w: 100, h: 50 });
  });
  it("accepterar bara bildformat", () => {
    expect(isAcceptedImage("image/png")).toBe(true);
    expect(isAcceptedImage("image/svg+xml")).toBe(true);
    expect(isAcceptedImage("application/pdf")).toBe(false);
  });
  it("plockar bildfiler ur DataTransfer", () => {
    const png = new File(["x"], "a.png", { type: "image/png" });
    const txt = new File(["x"], "a.txt", { type: "text/plain" });
    const dt = { items: [], files: [png, txt] } as unknown as DataTransfer;
    expect(imageFilesFrom(dt)).toEqual([png]);
    expect(imageFilesFrom(null)).toEqual([]);
  });
});
