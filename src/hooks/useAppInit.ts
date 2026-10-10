import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { conflictingNodeIds } from "@/model/labels";
import { startAutosave } from "@/store/autosave";
import { clearHistory, useDocumentStore } from "@/store/documentStore";
import {
  createAndOpenNewDocument,
  deserializeDocument,
  getLastOpenedId,
  isStorageBroken,
  listDocumentsLocally,
  loadDocumentLocally,
  saveDocumentLocally,
  setLastOpenedId,
} from "@/store/persistence";
import { getElement, isSelectable, layerById } from "@/store/selectors";
import { useUiStore } from "@/store/uiStore";

/** Laddar senast öppnade modellen (eller skapar en ny), startar autospar och håller UI-state i synk. */
/** Äldre filer och importer kan ha noder med samma labels; säg till, men ändra inget. */
function warnAboutLabelConflicts(): void {
  const count = conflictingNodeIds(useDocumentStore.getState().doc.nodes).size;
  if (count > 0) useUiStore.getState().showToast(t.toasts.labelConflictsInModel(count), "error");
}

/** Filnamn som får öppnas via länk: bara modeller som ligger bredvid appen (inga sökvägar). */
const LINKED_MODEL = /^[\w-]+\.json$/;
let fitRequested = false;

/** Sant en gång efter att en modell öppnats via länk, så att vyn kan anpassas till innehållet. */
export function consumeFitRequest(): boolean {
  const requested = fitRequested;
  fitRequested = false;
  return requested;
}

/**
 * Öppnar en modell som pekas ut i adressen, t.ex. `?open=test-model-200.json`. Modellen läggs
 * bland "My models" och adressen städas så att en omladdning inte öppnar den på nytt.
 */
async function openLinkedModel(): Promise<void> {
  const url = new URL(window.location.href);
  const name = url.searchParams.get("open");
  if (!name) return;
  url.searchParams.delete("open");
  window.history.replaceState(null, "", url);
  if (!LINKED_MODEL.test(name)) return;
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${name}`);
    if (!response.ok) throw new Error(String(response.status));
    const doc = deserializeDocument(await response.text());
    useDocumentStore.getState().loadDocument(doc);
    await saveDocumentLocally(doc);
    await setLastOpenedId(doc.id);
    fitRequested = true;
    useUiStore.getState().showToast(t.toasts.opened(doc.name));
  } catch (err) {
    useUiStore.getState().showToast(t.toasts.fileError((err as Error).message), "error");
  }
}

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
      await openLinkedModel();
      if (cancelled) return;
      clearHistory();
      if (isStorageBroken()) useUiStore.getState().showToast(t.toasts.storageUnavailable, "error");
      const top = useDocumentStore.getState().doc.layers.at(-1);
      useUiStore.getState().setActiveLayer(top?.id ?? null);
      warnAboutLabelConflicts();
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
          warnAboutLabelConflicts();
          ui.setActiveLayer(state.doc.layers.at(-1)?.id ?? null);
          ui.clearSelection();
          ui.setEditing(null);
        }
      }),
    [],
  );

  return ready;
}
