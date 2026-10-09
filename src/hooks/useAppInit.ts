import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { startAutosave } from "@/store/autosave";
import { clearHistory, useDocumentStore } from "@/store/documentStore";
import {
  createAndOpenNewDocument,
  getLastOpenedId,
  isStorageBroken,
  listDocumentsLocally,
  loadDocumentLocally,
  setLastOpenedId,
} from "@/store/persistence";
import { getElement, isSelectable, layerById } from "@/store/selectors";
import { useUiStore } from "@/store/uiStore";

/** Laddar senast öppnade modellen (eller skapar en ny), startar autospar och håller UI-state i synk. */
export function useAppInit(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const store = useDocumentStore.getState();
      let loaded = false;
      try {
        const lastId = await getLastOpenedId();
        const candidate = lastId ?? (await listDocumentsLocally())[0]?.id;
        if (candidate) {
          const doc = await loadDocumentLocally(candidate);
          if (doc) {
            store.loadDocument(doc);
            await setLastOpenedId(doc.id);
            loaded = true;
          }
        }
      } catch (err) {
        console.error("Could not read the saved model", err);
      }
      if (cancelled) return;
      if (!loaded) {
        try {
          await createAndOpenNewDocument();
        } catch (err) {
          console.error("Could not create a new model", err);
          store.newDocument();
        }
      }
      clearHistory();
      if (isStorageBroken()) useUiStore.getState().showToast(t.toasts.storageUnavailable, "error");
      const top = useDocumentStore.getState().doc.layers.at(-1);
      useUiStore.getState().setActiveLayer(top?.id ?? null);
      setReady(true);
    })();
    const stopAutosave = startAutosave();
    return () => {
      cancelled = true;
      stopAutosave();
    };
  }, []);

  // Håll markering och aktivt lager giltiga när dokumentet ändras (t.ex. ångra, lager döljs).
  useEffect(
    () =>
      useDocumentStore.subscribe((state, prev) => {
        if (state.doc === prev.doc) return;
        const ui = useUiStore.getState();
        ui.pruneSelection(
          (ref) => getElement(state.doc, ref) !== undefined && isSelectable(state.doc, ref),
        );
        if (!ui.activeLayerId || !layerById(state.doc, ui.activeLayerId)) {
          ui.setActiveLayer(state.doc.layers.at(-1)?.id ?? null);
        }
        if (state.doc.id !== prev.doc.id) {
          ui.setActiveLayer(state.doc.layers.at(-1)?.id ?? null);
          ui.clearSelection();
          ui.setEditing(null);
        }
      }),
    [],
  );

  return ready;
}
