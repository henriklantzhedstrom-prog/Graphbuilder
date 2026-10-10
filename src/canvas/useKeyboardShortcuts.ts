import { useEffect } from "react";
import type { Size } from "@/model/types";
import { redo, undo } from "@/store/documentStore";
import { useUiStore } from "@/store/uiStore";
import {
  copySelection,
  cutSelection,
  deleteSelection,
  duplicateSelection,
  fitToContent,
  nudgeSelection,
  pasteClipboard,
  reverseSelectedRelationships,
  selectAll,
  startEditingSelection,
  zoomBy,
} from "./actions";

const isTextInput = (el: Element | null): boolean =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement ||
  (el instanceof HTMLElement && el.isContentEditable);

export interface ShortcutHandlers {
  getViewportSize: () => Size;
  onSave: () => void;
  onOpen: () => void;
  onExport: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ui = useUiStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      // e.target i stället för activeElement: ett fält som avmonteras på Enter har redan tappat fokus.
      const inText = isTextInput(e.target instanceof Element ? e.target : document.activeElement);

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handlers.onSave();
        return;
      }
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handlers.onOpen();
        return;
      }
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handlers.onExport();
        return;
      }
      if (inText) return;
      if (ui.dialog) {
        if (e.key === "Escape") ui.setDialog(null);
        return;
      }

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAll();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        copySelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "x") {
        cutSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        pasteClipboard();
        return;
      }
      if (mod) return;

      switch (e.key) {
        case "Delete":
        case "Backspace":
          e.preventDefault();
          deleteSelection();
          return;
        case "Escape":
          ui.setDrag(null);
          ui.setEditing(null);
          ui.setDetails(null);
          ui.setAttachingNotes(null);
          if (ui.tool !== "select") ui.setTool("select");
          else ui.clearSelection();
          return;
        case "Enter":
          e.preventDefault();
          startEditingSelection();
          return;
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown": {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const delta = {
            ArrowLeft: { x: -step, y: 0 },
            ArrowRight: { x: step, y: 0 },
            ArrowUp: { x: 0, y: -step },
            ArrowDown: { x: 0, y: step },
          }[e.key];
          nudgeSelection(delta);
          return;
        }
        case " ":
          if (!ui.spacePressed) ui.setSpacePressed(true);
          e.preventDefault();
          return;
        case "+":
        case "=":
          zoomBy(1.2, handlers.getViewportSize());
          return;
        case "-":
          zoomBy(1 / 1.2, handlers.getViewportSize());
          return;
        case "0":
          fitToContent(handlers.getViewportSize());
          return;
        case "?":
          ui.setDialog("shortcuts");
          return;
      }
      switch (e.key.toLowerCase()) {
        case "v":
          ui.setTool("select");
          return;
        case "h":
          ui.setTool("pan");
          return;
        case "n":
          ui.setTool("note");
          return;
        case "r":
          reverseSelectedRelationships();
          return;
        case "l":
          ui.setPanel(ui.panel === "layers" ? "inspector" : "layers");
          return;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") useUiStore.getState().setSpacePressed(false);
    };
    const onBlur = () => useUiStore.getState().setSpacePressed(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [handlers]);
}
