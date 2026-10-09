import type { GraphDocument } from "@/model/types";
import { useDocumentStore } from "./documentStore";
import { saveDocumentLocally, setLastOpenedId } from "./persistence";

export const AUTOSAVE_DELAY_MS = 500;

/**
 * Sparar dokumentet till IndexedDB efter varje ändring (debounce).
 * Returnerar en funktion som stänger av autospar.
 */
export function startAutosave(
  save: (doc: GraphDocument) => Promise<void> = saveDocumentLocally,
  delay = AUTOSAVE_DELAY_MS,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: GraphDocument | null = null;

  const flush = () => {
    timer = null;
    if (!pending) return;
    const doc = pending;
    pending = null;
    void save(doc).then(() => setLastOpenedId(doc.id));
  };

  const unsubscribe = useDocumentStore.subscribe((state, prev) => {
    if (state.doc === prev.doc) return;
    pending = state.doc;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delay);
  });

  return () => {
    unsubscribe();
    if (timer) {
      clearTimeout(timer);
      flush();
    }
  };
}
