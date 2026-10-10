import { type ReactNode, useEffect, useState } from "react";
import {
  IconChevronDown,
  IconExport,
  IconFilePlus,
  IconFolder,
  IconFolderOpen,
  IconHelp,
  IconImport,
  IconLogo,
  IconMoon,
  IconRedo,
  IconSave,
  IconSun,
  IconUndo,
} from "@/components/icons";
import { Button, cx, Divider, IconButton } from "@/components/ui";
import { t } from "@/i18n";
import { isMac } from "@/model/shortcutLabel";
import { redo, undo, useDocumentStore, useTemporal } from "@/store/documentStore";
import { useThemeStore } from "@/store/theme";
import { useUiStore } from "@/store/uiStore";

/** Tangenten för kortkommandon skrivs som på användarens dator. */
const MOD = isMac() ? t.keys.modMac : t.keys.modOther;

interface MenuEntry {
  label: string;
  icon: ReactNode;
  action: () => void;
  keys?: string;
}

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

  const fileMenu: MenuEntry[][] = [
    [
      { label: t.topbar.new, icon: <IconFilePlus />, action: onNew },
      { label: t.topbar.open, icon: <IconFolderOpen />, action: onOpen, keys: `${MOD}O` },
    ],
    [
      { label: t.topbar.save, icon: <IconSave />, action: onSave, keys: `${MOD}S` },
      { label: t.topbar.importArrows, icon: <IconImport />, action: onImportArrows },
      {
        label: t.topbar.export,
        icon: <IconExport />,
        action: () => setDialog("export"),
        keys: `${MOD}E`,
      },
    ],
  ];

  return (
    <header className="relative z-20 flex h-13 shrink-0 items-center gap-1 border-border border-b bg-surface px-3 text-[15px]">
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
          className={cx("gap-1 px-2.5 font-normal", fileMenuOpen && "bg-surface-2")}
          onClick={() => setFileMenuOpen((o) => !o)}
          onKeyDown={(e) => e.key === "Escape" && setFileMenuOpen(false)}
        >
          {t.topbar.file}
          <IconChevronDown size={14} className="text-text-muted" />
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
              className="gb-menu absolute top-[42px] right-0 z-40 w-72 origin-top-right rounded-xl bg-surface p-1.5 shadow-pop"
              onKeyDown={(e) => e.key === "Escape" && setFileMenuOpen(false)}
            >
              {fileMenu.map((group, groupIndex) => (
                <div
                  key={group[0]?.label}
                  role="none"
                  className={cx(groupIndex > 0 && "mt-1.5 border-border border-t pt-1.5")}
                >
                  {group.map((entry) => (
                    <button
                      key={entry.label}
                      type="button"
                      role="menuitem"
                      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
                      onClick={() => {
                        setFileMenuOpen(false);
                        entry.action();
                      }}
                    >
                      <span className="text-text-muted">{entry.icon}</span>
                      <span className="flex-1">{entry.label}</span>
                      {entry.keys && (
                        <span aria-hidden className="text-[0.86em] text-text-muted tabular-nums">
                          {entry.keys}
                        </span>
                      )}
                    </button>
                  ))}
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
        <IconExport size={17} />
        {t.topbar.export}
      </Button>
    </header>
  );
}
