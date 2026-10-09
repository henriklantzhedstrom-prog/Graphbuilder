import { useEffect, useState } from "react";
import { fitToContent, resetZoom, zoomBy } from "@/canvas/actions";
import {
  IconCursor,
  IconDownload,
  IconFit,
  IconFolder,
  IconHand,
  IconHelp,
  IconImage,
  IconMinus,
  IconMoon,
  IconNote,
  IconPlus,
  IconRedo,
  IconSun,
  IconUndo,
} from "@/components/icons";
import { Button, Divider, IconButton, TextInput } from "@/components/ui";
import { t } from "@/i18n";
import type { Size } from "@/model/types";
import { redo, undo, useDocumentStore, useTemporal } from "@/store/documentStore";
import { useThemeStore } from "@/store/theme";
import { useUiStore } from "@/store/uiStore";

export interface TopBarProps {
  getViewportSize: () => Size;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onImportArrows: () => void;
  onAddImage: () => void;
}

export function TopBar({
  getViewportSize,
  onNew,
  onOpen,
  onSave,
  onImportArrows,
  onAddImage,
}: TopBarProps) {
  const name = useDocumentStore((s) => s.doc.name);
  const renameDocument = useDocumentStore((s) => s.renameDocument);
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  const setDialog = useUiStore((s) => s.setDialog);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const zoom = useUiStore((s) => s.viewport.zoom);
  const canUndo = useTemporal((s) => s.pastStates.length > 0);
  const canRedo = useTemporal((s) => s.futureStates.length > 0);
  const [draftName, setDraftName] = useState(name);
  useEffect(() => setDraftName(name), [name]);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);

  const commitName = () => {
    const next = draftName.trim() || t.app.untitled;
    if (next !== name) renameDocument(next);
    setDraftName(next);
  };

  return (
    <header className="flex h-12 items-center gap-1 border-border border-b bg-surface px-2">
      <IconButton label={t.topbar.documents} onClick={() => setDialog("documents")}>
        <IconFolder />
      </IconButton>
      <TextInput
        aria-label={t.topbar.documentName}
        className="font-medium"
        style={{ width: 224 }}
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraftName(name);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <div className="relative">
        <Button
          variant="ghost"
          aria-haspopup="menu"
          aria-expanded={fileMenuOpen}
          onClick={() => setFileMenuOpen((o) => !o)}
        >
          {t.topbar.file}
        </Button>
        {fileMenuOpen && (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setFileMenuOpen(false)}
            />
            <div
              role="menu"
              className="absolute top-9 left-0 z-40 w-64 rounded-md border border-border bg-surface py-1 shadow-xl"
            >
              {[
                [t.topbar.new, onNew],
                [t.topbar.open, onOpen],
                [t.topbar.save, onSave],
                [t.topbar.importArrows, onImportArrows],
                [t.topbar.export, () => setDialog("export")],
              ].map(([label, action]) => (
                <div key={label as string} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2"
                    onClick={() => {
                      setFileMenuOpen(false);
                      (action as () => void)();
                    }}
                  >
                    {label as string}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Divider />
      <IconButton label={t.topbar.undo} onClick={undo} disabled={!canUndo}>
        <IconUndo />
      </IconButton>
      <IconButton label={t.topbar.redo} onClick={redo} disabled={!canRedo}>
        <IconRedo />
      </IconButton>
      <Divider />
      <IconButton
        label={t.tools.select}
        active={tool === "select"}
        onClick={() => setTool("select")}
      >
        <IconCursor />
      </IconButton>
      <IconButton label={t.tools.pan} active={tool === "pan"} onClick={() => setTool("pan")}>
        <IconHand />
      </IconButton>
      <IconButton label={t.tools.note} active={tool === "note"} onClick={() => setTool("note")}>
        <IconNote />
      </IconButton>
      <IconButton label={t.tools.image} onClick={onAddImage}>
        <IconImage />
      </IconButton>
      <div className="flex-1" />
      <IconButton label={t.topbar.zoomOut} onClick={() => zoomBy(1 / 1.2, getViewportSize())}>
        <IconMinus />
      </IconButton>
      <button
        type="button"
        className="w-16 whitespace-nowrap rounded-md px-1 text-center text-sm tabular-nums hover:bg-surface-2"
        title={t.topbar.zoomReset}
        onClick={() => resetZoom(getViewportSize())}
      >
        {Math.round(zoom * 100)} %
      </button>
      <IconButton label={t.topbar.zoomIn} onClick={() => zoomBy(1.2, getViewportSize())}>
        <IconPlus />
      </IconButton>
      <IconButton label={t.topbar.zoomFit} onClick={() => fitToContent(getViewportSize())}>
        <IconFit />
      </IconButton>
      <Divider />
      <Button variant="primary" onClick={() => setDialog("export")}>
        <IconDownload size={16} />
        {t.topbar.export}
      </Button>
      <IconButton
        label={theme === "dark" ? t.topbar.lightMode : t.topbar.darkMode}
        data-testid="theme-toggle"
        onClick={toggleTheme}
      >
        {theme === "dark" ? <IconSun /> : <IconMoon />}
      </IconButton>
      <IconButton label={t.topbar.shortcuts} onClick={() => setDialog("shortcuts")}>
        <IconHelp />
      </IconButton>
    </header>
  );
}
