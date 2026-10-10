import { create } from "zustand";
import type { Viewport } from "@/model/geometry";
import type { Box, ElementRef, Id, Point } from "@/model/types";
import type { ClipboardContent } from "./documentStore";
import { refKey } from "./selectors";

export type Tool = "select" | "pan" | "note";
export type Panel = "inspector" | "layers";
export type DetailFocus = "caption" | "labels" | "properties";
export type Dialog = "export" | "documents" | "shortcuts" | null;

export type DragState =
  | { kind: "move"; delta: Point; guides: { axis: "x" | "y"; value: number }[] }
  | { kind: "resize"; ref: ElementRef; box: Box }
  | { kind: "relationship"; fromId: Id; to: Point; targetId: Id | null }
  | { kind: "marquee"; from: Point; to: Point }
  | { kind: "note"; from: Point; to: Point }
  | null;

export interface Toast {
  id: number;
  message: string;
  kind: "info" | "error";
}

export interface UiState {
  selection: ElementRef[];
  activeLayerId: Id | null;
  tool: Tool;
  viewport: Viewport;
  editing: ElementRef | null;
  /**
   * Nod eller relation vars labels och egenskaper redigeras direkt på ritytan (dubbelklick), och
   * vilken del markören ska börja i.
   */
  details: { ref: ElementRef; focus: DetailFocus } | null;
  /** Anteckningar som väntar på att användaren klickar på det de ska knytas till. */
  attachingNotes: Id[] | null;
  panel: Panel;
  dialog: Dialog;
  drag: DragState;
  hoverNodeId: Id | null;
  clipboard: ClipboardContent | null;
  toasts: Toast[];
  spacePressed: boolean;

  setSelection(refs: ElementRef[]): void;
  select(ref: ElementRef, additive?: boolean): void;
  toggleSelected(ref: ElementRef): void;
  clearSelection(): void;
  isSelected(ref: ElementRef): boolean;
  setActiveLayer(id: Id | null): void;
  setTool(tool: Tool): void;
  setViewport(vp: Viewport): void;
  setEditing(ref: ElementRef | null): void;
  setDetails(details: { ref: ElementRef; focus: DetailFocus } | null): void;
  setAttachingNotes(ids: Id[] | null): void;
  setPanel(panel: Panel): void;
  setDialog(dialog: Dialog): void;
  setDrag(drag: DragState): void;
  setHoverNode(id: Id | null): void;
  setClipboard(content: ClipboardContent | null): void;
  setSpacePressed(pressed: boolean): void;
  showToast(message: string, kind?: Toast["kind"]): void;
  dismissToast(id: number): void;
  /** Rensar markering/redigering som pekar på element som inte längre finns. */
  pruneSelection(exists: (ref: ElementRef) => boolean): void;
}

let toastCounter = 0;

export const useUiStore = create<UiState>()((set, get) => ({
  selection: [],
  activeLayerId: null,
  tool: "select",
  viewport: { x: 0, y: 0, zoom: 1 },
  editing: null,
  details: null,
  attachingNotes: null,
  panel: "inspector",
  dialog: null,
  drag: null,
  hoverNodeId: null,
  clipboard: null,
  toasts: [],
  spacePressed: false,

  setSelection: (refs) => {
    const seen = new Set<string>();
    const unique = refs.filter((r) => {
      const k = refKey(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    set({ selection: unique });
  },
  select: (ref, additive = false) => {
    const { selection, setSelection } = get();
    if (!additive) {
      setSelection([ref]);
      return;
    }
    if (selection.some((r) => refKey(r) === refKey(ref))) return;
    setSelection([...selection, ref]);
  },
  toggleSelected: (ref) => {
    const { selection, setSelection } = get();
    const key = refKey(ref);
    if (selection.some((r) => refKey(r) === key)) {
      setSelection(selection.filter((r) => refKey(r) !== key));
    } else {
      setSelection([...selection, ref]);
    }
  },
  clearSelection: () => set({ selection: [] }),
  isSelected: (ref) => get().selection.some((r) => refKey(r) === refKey(ref)),
  setActiveLayer: (id) => set({ activeLayerId: id }),
  setTool: (tool) => set({ tool }),
  setViewport: (viewport) => set({ viewport }),
  setEditing: (editing) => set({ editing }),
  setDetails: (details) => set({ details }),
  setAttachingNotes: (attachingNotes) => set({ attachingNotes }),
  setPanel: (panel) => set({ panel }),
  setDialog: (dialog) => set({ dialog }),
  setDrag: (drag) => set({ drag }),
  setHoverNode: (hoverNodeId) => set({ hoverNodeId }),
  setClipboard: (clipboard) => set({ clipboard }),
  setSpacePressed: (spacePressed) => set({ spacePressed }),
  showToast: (message, kind = "info") => {
    const id = ++toastCounter;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => get().dismissToast(id), 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  pruneSelection: (exists) => {
    const { selection, editing } = get();
    const next = selection.filter(exists);
    const nextEditing = editing && exists(editing) ? editing : null;
    if (next.length !== selection.length || nextEditing !== editing) {
      set({ selection: next, editing: nextEditing });
    }
  },
}));
