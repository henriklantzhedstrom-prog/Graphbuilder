import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDocument } from "@/model/defaults";

describe("lagring utan IndexedDB", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("faller tillbaka på minnet när IndexedDB kastar SecurityError", async () => {
    const original = indexedDB.open.bind(indexedDB);
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    try {
      const p = await import("@/store/persistence");
      const doc = createEmptyDocument("Memory");
      await p.saveDocumentLocally(doc);
      await p.setLastOpenedId(doc.id);
      expect(p.isStorageBroken()).toBe(true);
      expect(await p.loadDocumentLocally(doc.id)).toEqual(doc);
      expect(await p.getLastOpenedId()).toBe(doc.id);
      expect((await p.listDocumentsLocally()).map((d) => d.id)).toEqual([doc.id]);
      await p.deleteDocumentLocally(doc.id);
      expect(await p.loadDocumentLocally(doc.id)).toBeNull();
      expect(await p.createAndOpenNewDocument("Still works")).toBeTruthy();
    } finally {
      vi.restoreAllMocks();
      indexedDB.open = original;
    }
  });
});
