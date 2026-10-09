import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "@/App";
import { useDocumentStore } from "@/store/documentStore";
import {
  createAndOpenNewDocument,
  getLastOpenedId,
  listDocumentsLocally,
  loadDocumentLocally,
} from "@/store/persistence";

describe("appstart och nya modeller", () => {
  it("skapar och sparar en ny modell vid första start och pekar ut den som senast öppnad", async () => {
    render(<App />);
    await screen.findByLabelText("Modellens namn");
    const current = useDocumentStore.getState().doc;
    expect(await getLastOpenedId()).toBe(current.id);
    expect(await loadDocumentLocally(current.id)).not.toBeNull();
  });

  it("createAndOpenNewDocument sparar den NYA modellen, inte den gamla", async () => {
    const before = useDocumentStore.getState().doc.id;
    const id = await createAndOpenNewDocument("Ny");
    expect(id).not.toBe(before);
    expect(useDocumentStore.getState().doc.id).toBe(id);
    expect(await getLastOpenedId()).toBe(id);
    expect((await listDocumentsLocally()).some((d) => d.id === id && d.name === "Ny")).toBe(true);
  });
});
