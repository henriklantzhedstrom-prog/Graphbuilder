import { createStore, del, get, keys, set } from "idb-keyval";
import { DocumentParseError, parseDocument } from "@/model/schema";
import type { GraphDocument, Id } from "@/model/types";

const store = createStore("graphbuilder", "documents");

const DOC_PREFIX = "doc:";
const LAST_OPENED_KEY = "meta:lastOpened";

export interface DocumentSummary {
  id: Id;
  name: string;
  updatedAt: string;
  createdAt: string;
  nodeCount: number;
}

export async function saveDocumentLocally(doc: GraphDocument): Promise<void> {
  await set(`${DOC_PREFIX}${doc.id}`, doc, store);
}

export async function loadDocumentLocally(id: Id): Promise<GraphDocument | null> {
  const raw = await get(`${DOC_PREFIX}${id}`, store);
  if (!raw) return null;
  return parseDocument(raw);
}

export async function deleteDocumentLocally(id: Id): Promise<void> {
  await del(`${DOC_PREFIX}${id}`, store);
}

export async function listDocumentsLocally(): Promise<DocumentSummary[]> {
  const allKeys = (await keys(store)).filter(
    (k): k is string => typeof k === "string" && k.startsWith(DOC_PREFIX),
  );
  const summaries: DocumentSummary[] = [];
  for (const key of allKeys) {
    const raw = (await get(key, store)) as Partial<GraphDocument> | undefined;
    if (!raw || typeof raw.id !== "string") continue;
    summaries.push({
      id: raw.id,
      name: raw.name ?? "",
      updatedAt: raw.updatedAt ?? "",
      createdAt: raw.createdAt ?? "",
      nodeCount: Object.keys(raw.nodes ?? {}).length,
    });
  }
  return summaries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** Skapar en ny modell, sparar den och markerar den som senast öppnad. Returnerar dess id. */
export async function createAndOpenNewDocument(name?: string): Promise<Id> {
  const { useDocumentStore, clearHistory } = await import("./documentStore");
  useDocumentStore.getState().newDocument(name);
  clearHistory();
  // Läs dokumentet EFTER mutationen – en tidigare getState()-ögonblicksbild är inaktuell.
  const doc = useDocumentStore.getState().doc;
  await saveDocumentLocally(doc);
  await setLastOpenedId(doc.id);
  return doc.id;
}

export async function getLastOpenedId(): Promise<Id | null> {
  return ((await get(LAST_OPENED_KEY, store)) as Id | undefined) ?? null;
}

export async function setLastOpenedId(id: Id): Promise<void> {
  await set(LAST_OPENED_KEY, id, store);
}

// ---------- Filer ----------

export function serializeDocument(doc: GraphDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function deserializeDocument(text: string): GraphDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new DocumentParseError("Filen är inte giltig JSON.");
  }
  return parseDocument(raw);
}

export const safeFileName = (name: string): string =>
  (name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "modell").slice(0, 80);

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Sparar som nedladdning. Fungerar i alla webbläsare och kräver ingen dialog som kan fastna. */
export async function saveFile(blob: Blob, fileName: string): Promise<void> {
  downloadBlob(blob, fileName);
}

/** Öppnar en fil via ett dolt <input type="file">. */
export async function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    input.addEventListener("change", () => {
      resolve(input.files?.[0] ?? null);
      input.remove();
    });
    input.addEventListener("cancel", () => {
      resolve(null);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}
