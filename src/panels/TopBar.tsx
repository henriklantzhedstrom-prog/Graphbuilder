import { useEffect, useState } from "react";
import {
  IconDownload,
  IconFolder,
  IconHelp,
  IconLogo,
  IconMoon,
  IconRedo,
  IconSun,
  IconUndo,
} from "@/components/icons";
import { Button, Divider, IconButton } from "@/components/ui";
import { t } from "@/i18n";
import { redo, undo, useDocumentStore, useTemporal } from "@/store/documentStore";
import { useThemeStore } from "@/store/theme";
import { useUiStore } from "@/store/uiStore";

export interface TopBarProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onImportArrows: () => void;
}

export function TopBar({ onNew, onOpen, onSave, onImportArrows }: TopBarProps) {
  const name = useDocumentStore((s) => s.doc.name);
  const renameDocument = useDocumentStore((s) => s.renameDocument);
  const setDialog = useUiStore((s) => s.setDialog);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
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
    <header className="flex h-13 shrink-0 items-center gap-1 border-border border-b bg-surface px-3">
      <div className="mr-1 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-on-accent">
          <IconLogo size={16} />
        </span>
        <span className="font-semibold tracking-tight">{t.app.title}</span>
      </div>
      <span className="text-[18px] text-border-strong" aria-hidden>
        /
      </span>
      <input
        aria-label={t.topbar.documentName}
        className="field-sizing-content h-8 min-w-24 max-w-80 truncate rounded-lg border border-transparent bg-transparent px-2 font-medium hover:bg-surface-2 focus:border-accent focus:bg-surface focus:outline-none focus:ring-3 focus:ring-accent/15"
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
      <IconButton label={t.topbar.documents} onClick={() => setDialog("documents")}>
        <IconFolder />
      </IconButton>
      <div className="flex-1" />
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
              className="absolute top-10 right-0 z-40 w-64 rounded-xl border border-border bg-surface p-1 shadow-float"
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
                    className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface-2"
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
        label={theme === "dark" ? t.topbar.lightMode : t.topbar.darkMode}
        data-testid="theme-toggle"
        onClick={toggleTheme}
      >
        {theme === "dark" ? <IconSun /> : <IconMoon />}
      </IconButton>
      <IconButton label={t.topbar.shortcuts} onClick={() => setDialog("shortcuts")}>
        <IconHelp />
      </IconButton>
      <Button variant="strong" className="ml-1.5" onClick={() => setDialog("export")}>
        <IconDownload size={16} />
        {t.topbar.export}
      </Button>
    </header>
  );
}
