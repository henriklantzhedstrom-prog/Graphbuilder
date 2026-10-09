import { useCallback, useMemo, useRef } from "react";
import { viewportCenter } from "@/canvas/actions";
import { Canvas } from "@/canvas/Canvas";
import { ACCEPTED_IMAGE_TYPES, addImageFromFile } from "@/canvas/images";
import { useKeyboardShortcuts } from "@/canvas/useKeyboardShortcuts";
import { Toasts } from "@/components/Toasts";
import { importArrowsJson } from "@/export/arrowsImport";
import { useAppInit } from "@/hooks/useAppInit";
import { t } from "@/i18n/sv";
import type { Size } from "@/model/types";
import { DocumentsDialog } from "@/panels/DocumentsDialog";
import { ExportDialog } from "@/panels/ExportDialog";
import { ShortcutsDialog } from "@/panels/ShortcutsDialog";
import { SidePanel } from "@/panels/SidePanel";
import { TopBar } from "@/panels/TopBar";
import { clearHistory, useDocumentStore } from "@/store/documentStore";
import {
  deserializeDocument,
  pickFile,
  safeFileName,
  saveFile,
  serializeDocument,
  setLastOpenedId,
} from "@/store/persistence";
import { useUiStore } from "@/store/uiStore";

export function App() {
  const ready = useAppInit();
  const canvasHostRef = useRef<HTMLDivElement>(null);

  const getViewportSize = useCallback((): Size => {
    const rect = canvasHostRef.current?.getBoundingClientRect();
    return { w: rect?.width ?? 0, h: rect?.height ?? 0 };
  }, []);

  const onNew = useCallback(async () => {
    const store = useDocumentStore.getState();
    store.newDocument();
    clearHistory();
    await setLastOpenedId(store.doc.id);
  }, []);

  const onSave = useCallback(async () => {
    const doc = useDocumentStore.getState().doc;
    const blob = new Blob([serializeDocument(doc)], { type: "application/json" });
    await saveFile(blob, `${safeFileName(doc.name)}.json`);
    useUiStore.getState().showToast(t.toasts.saved);
  }, []);

  const onOpen = useCallback(async () => {
    const file = await pickFile(".json");
    if (!file) return;
    try {
      const doc = deserializeDocument(await file.text());
      useDocumentStore.getState().loadDocument(doc);
      clearHistory();
      await setLastOpenedId(doc.id);
      useUiStore.getState().showToast(t.toasts.opened(doc.name));
    } catch (err) {
      useUiStore.getState().showToast(t.toasts.fileError((err as Error).message), "error");
    }
  }, []);

  const onImportArrows = useCallback(async () => {
    const file = await pickFile(".json");
    if (!file) return;
    try {
      const doc = importArrowsJson(await file.text(), file.name.replace(/\.json$/i, ""));
      useDocumentStore.getState().loadDocument(doc);
      clearHistory();
      await setLastOpenedId(doc.id);
      useUiStore
        .getState()
        .showToast(
          t.importDialog.arrowsSuccess(
            Object.keys(doc.nodes).length,
            Object.keys(doc.relationships).length,
          ),
        );
    } catch (err) {
      useUiStore.getState().showToast(t.toasts.fileError((err as Error).message), "error");
    }
  }, []);
  const onAddImage = useCallback(async () => {
    const file = await pickFile(ACCEPTED_IMAGE_TYPES.join(","));
    if (!file) return;
    await addImageFromFile(file, viewportCenter(getViewportSize()));
  }, [getViewportSize]);

  const shortcutHandlers = useMemo(
    () => ({
      getViewportSize,
      onSave,
      onOpen,
      onExport: () => useUiStore.getState().setDialog("export"),
    }),
    [getViewportSize, onSave, onOpen],
  );
  useKeyboardShortcuts(shortcutHandlers);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted">{t.app.loading}</div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar
        getViewportSize={getViewportSize}
        onNew={onNew}
        onOpen={onOpen}
        onSave={onSave}
        onImportArrows={onImportArrows}
        onAddImage={onAddImage}
      />
      <div className="relative flex min-h-0 flex-1">
        <div ref={canvasHostRef} className="min-w-0 flex-1">
          <Canvas />
        </div>
        <SidePanel />
        <Toasts />
      </div>
      <ShortcutsDialog />
      <ExportDialog />
      <DocumentsDialog />
    </div>
  );
}
