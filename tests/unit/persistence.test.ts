import { describe, expect, it, vi } from "vitest";
import { createEmptyDocument } from "@/model/defaults";
import { startAutosave } from "@/store/autosave";
import { useDocumentStore } from "@/store/documentStore";
import {
  deleteDocumentLocally,
  deserializeDocument,
  getLastOpenedId,
  listDocumentsLocally,
  loadDocumentLocally,
  safeFileName,
  saveDocumentLocally,
  serializeDocument,
} from "@/store/persistence";

describe("lokal lagring", () => {
  it("sparar, listar, laddar och tar bort", async () => {
    const doc = createEmptyDocument("Första");
    await saveDocumentLocally(doc);
    const list = await listDocumentsLocally();
    expect(list.some((d) => d.id === doc.id && d.name === "Första")).toBe(true);
    expect(await loadDocumentLocally(doc.id)).toEqual(doc);
    await deleteDocumentLocally(doc.id);
    expect(await loadDocumentLocally(doc.id)).toBeNull();
  });
});

describe("filer", () => {
  it("serialiserar och läser tillbaka", () => {
    const doc = createEmptyDocument("Fil");
    expect(deserializeDocument(serializeDocument(doc))).toEqual(doc);
    expect(() => deserializeDocument("{nej")).toThrow(/JSON/);
  });
  it("gör filnamn säkra", () => {
    expect(safeFileName("  a/b:c  ")).toBe("a-b-c");
    expect(safeFileName("   ")).toBe("modell");
  });
});

describe("autospar", () => {
  it("sparar efter ändring med debounce utan att röra senast öppnad", async () => {
    vi.useFakeTimers();
    const saved: string[] = [];
    const save = vi.fn(async (doc: { name: string }) => {
      saved.push(doc.name);
    });
    const stop = startAutosave(save, 100);
    useDocumentStore.getState().newDocument("Auto");
    const lastBefore = await getLastOpenedId();
    useDocumentStore.getState().renameDocument("Auto 2");
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(150);
    expect(save).toHaveBeenCalledTimes(1);
    expect(saved).toEqual(["Auto 2"]);
    stop();
    vi.useRealTimers();
    expect(await getLastOpenedId()).toBe(lastBefore);
  });
});
