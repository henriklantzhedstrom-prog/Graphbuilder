import type { GraphDocument } from "@/model/types";
import { useDocumentStore } from "./documentStore";
import { saveDocumentLocally } from "./persistence";

export const AUTOSAVE_DELAY_MS = 500;

/**
 * Sparar dokumentet till IndexedDB efter varje ändring (debounce).
 * Sätter inte "senast öppnad" – det görs där modeller öppnas/skapas, annars kan en
 * fördröjd sparning peka ut en modell som hunnit tas bort.
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
    void save(doc);
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
