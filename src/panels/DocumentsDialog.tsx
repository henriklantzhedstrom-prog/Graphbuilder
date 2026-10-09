import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { IconPlus } from "@/components/icons";
import { Button, cx, TextInput } from "@/components/ui";
import { t } from "@/i18n/sv";
import { newId } from "@/model/ids";
import type { GraphDocument, Id } from "@/model/types";
import { clearHistory, useDocumentStore } from "@/store/documentStore";
import {
  type DocumentSummary,
  deleteDocumentLocally,
  listDocumentsLocally,
  loadDocumentLocally,
  saveDocumentLocally,
  setLastOpenedId,
} from "@/store/persistence";
import { useUiStore } from "@/store/uiStore";

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
};

async function openDocument(doc: GraphDocument) {
  useDocumentStore.getState().loadDocument(doc);
  clearHistory();
  await setLastOpenedId(doc.id);
}

export function DocumentsDialog() {
  const open = useUiStore((s) => s.dialog === "documents");
  const setDialog = useUiStore((s) => s.setDialog);
  const showToast = useUiStore((s) => s.showToast);
  const currentId = useDocumentStore((s) => s.doc.id);
  const currentDoc = useDocumentStore((s) => s.doc);
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [renaming, setRenaming] = useState<Id | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Id | null>(null);

  const refresh = useCallback(async () => {
    // Se till att den öppna modellen finns i listan även innan autospar hunnit köra.
    await saveDocumentLocally(useDocumentStore.getState().doc);
    setDocs(await listDocumentsLocally());
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const onOpen = async (id: Id) => {
    if (id === currentId) {
      setDialog(null);
      return;
    }
    await saveDocumentLocally(currentDoc);
    const doc = await loadDocumentLocally(id);
    if (!doc) return;
    await openDocument(doc);
    setDialog(null);
    showToast(t.toasts.opened(doc.name));
  };

  const onCreate = async () => {
    await saveDocumentLocally(currentDoc);
    const store = useDocumentStore.getState();
    store.newDocument();
    clearHistory();
    await saveDocumentLocally(store.doc);
    await setLastOpenedId(store.doc.id);
    setDialog(null);
  };

  const onDuplicate = async (id: Id) => {
    const source = id === currentId ? currentDoc : await loadDocumentLocally(id);
    if (!source) return;
    const now = new Date().toISOString();
    const copy: GraphDocument = {
      ...structuredClone(source),
      id: newId("d"),
      name: `${source.name}${t.documents.copySuffix}`,
      createdAt: now,
      updatedAt: now,
    };
    await saveDocumentLocally(copy);
    await refresh();
  };

  const onRename = async (id: Id) => {
    const name = draft.trim();
    setRenaming(null);
    if (!name) return;
    if (id === currentId) {
      useDocumentStore.getState().renameDocument(name);
      await saveDocumentLocally(useDocumentStore.getState().doc);
    } else {
      const doc = await loadDocumentLocally(id);
      if (doc) await saveDocumentLocally({ ...doc, name, updatedAt: new Date().toISOString() });
    }
    await refresh();
  };

  const onDelete = async (id: Id) => {
    setConfirmDelete(null);
    if (id === currentId) {
      // Byt modell FÖRE borttagningen så att en väntande autosparning inte återskapar den.
      const store = useDocumentStore.getState();
      store.newDocument();
      clearHistory();
      await saveDocumentLocally(store.doc);
      await setLastOpenedId(store.doc.id);
    }
    await deleteDocumentLocally(id);
    await refresh();
  };

  return (
    <Dialog
      title={t.documents.title}
      open={open}
      onClose={() => setDialog(null)}
      width="max-w-2xl"
      footer={
        <Button variant="primary" onClick={onCreate} data-testid="documents-create">
          <IconPlus size={16} />
          {t.documents.create}
        </Button>
      }
    >
      {docs.length === 0 ? (
        <p className="text-sm text-text-muted">{t.documents.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border" data-testid="documents-list">
          {docs.map((d) => (
            <li
              key={d.id}
              data-testid="document-row"
              className={cx(
                "flex items-center gap-2 py-2",
                d.id === currentId && "bg-accent-soft/40",
              )}
            >
              <div className="min-w-0 flex-1">
                {renaming === d.id ? (
                  <TextInput
                    aria-label={t.common.name}
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => onRename(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void onRename(d.id);
                      if (e.key === "Escape") setRenaming(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="block w-full truncate text-left font-medium text-sm hover:underline"
                    onClick={() => onOpen(d.id)}
                  >
                    {d.name}
                    {d.id === currentId && (
                      <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-white text-xs">
                        {t.documents.current}
                      </span>
                    )}
                  </button>
                )}
                <div className="text-text-muted text-xs">
                  {t.documents.updated} {formatDate(d.updatedAt)} ·{" "}
                  {t.documents.nodeCount(d.nodeCount)}
                </div>
              </div>
              {confirmDelete === d.id ? (
                <>
                  <span className="text-sm">{t.documents.removeConfirm(d.name)}</span>
                  <Button
                    variant="danger"
                    onClick={() => onDelete(d.id)}
                    data-testid="document-delete-confirm"
                  >
                    {t.common.yes}
                  </Button>
                  <Button onClick={() => setConfirmDelete(null)}>{t.common.no}</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => onOpen(d.id)}>
                    {t.documents.open}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDraft(d.name);
                      setRenaming(d.id);
                    }}
                  >
                    {t.documents.rename}
                  </Button>
                  <Button variant="ghost" onClick={() => onDuplicate(d.id)}>
                    {t.documents.duplicate}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-danger"
                    onClick={() => setConfirmDelete(d.id)}
                  >
                    {t.documents.remove}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
