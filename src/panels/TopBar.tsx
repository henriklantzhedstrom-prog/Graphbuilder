import { type ReactNode, useEffect, useState } from "react";
import { fitToContent, resetZoom, zoomBy } from "@/canvas/actions";
import {
  IconChevronDown,
  IconCursor,
  IconExport,
  IconFilePlus,
  IconFit,
  IconFolder,
  IconFolderOpen,
  IconHand,
  IconHelp,
  IconImage,
  IconImport,
  IconMinus,
  IconMoon,
  IconNote,
  IconPlus,
  IconRedo,
  IconSave,
  IconSun,
  IconUndo,
} from "@/components/icons";
import { Button, cx, Divider, IconButton } from "@/components/ui";
import { t } from "@/i18n";
import type { Size } from "@/model/types";
import { redo, undo, useDocumentStore, useTemporal } from "@/store/documentStore";
import { useThemeStore } from "@/store/theme";
import { useUiStore } from "@/store/uiStore";

/** Tangenten för kortkommandon skrivs som på användarens dator. */
const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? t.keys.modMac : t.keys.modOther;

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
    <header className="relative z-20 flex h-[52px] shrink-0 items-center gap-1 border-border border-b bg-surface px-3 text-[15px]">
      <IconButton label={t.topbar.documents} onClick={() => setDialog("documents")}>
        <IconFolder size={20} />
      </IconButton>
      <input
        aria-label={t.topbar.documentName}
        className="field-sizing-content h-9 min-w-24 max-w-80 truncate rounded-lg border border-transparent bg-transparent px-2 font-semibold text-[1.04em] transition-colors hover:bg-surface-2 focus:border-accent focus:bg-surface focus:outline-none"
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
              className="gb-menu absolute top-[42px] left-0 z-40 w-72 rounded-xl bg-surface p-1.5 shadow-pop"
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
        <IconUndo size={20} />
      </IconButton>
      <IconButton label={t.topbar.redo} onClick={redo} disabled={!canRedo}>
        <IconRedo size={20} />
      </IconButton>
      <Divider />
      <div className="flex gap-0.5 rounded-[10px] bg-surface-2 p-[3px]">
        <ToolButton
          label={t.tools.select}
          active={tool === "select"}
          onClick={() => setTool("select")}
        >
          <IconCursor size={20} />
        </ToolButton>
        <ToolButton label={t.tools.pan} active={tool === "pan"} onClick={() => setTool("pan")}>
          <IconHand size={20} />
        </ToolButton>
        <ToolButton label={t.tools.note} active={tool === "note"} onClick={() => setTool("note")}>
          <IconNote size={20} />
        </ToolButton>
        <ToolButton label={t.tools.image} onClick={onAddImage}>
          <IconImage size={20} />
        </ToolButton>
      </div>
      <div className="flex-1" />
      <div className="flex items-center rounded-[10px] border border-border">
        <IconButton
          label={t.topbar.zoomOut}
          className="h-[34px] rounded-r-none"
          onClick={() => zoomBy(1 / 1.2, getViewportSize())}
        >
          <IconMinus />
        </IconButton>
        <button
          type="button"
          className="h-[34px] w-16 whitespace-nowrap text-center text-[0.94em] tabular-nums hover:bg-surface-2"
          title={t.topbar.zoomReset}
          onClick={() => resetZoom(getViewportSize())}
        >
          {Math.round(zoom * 100)} %
        </button>
        <IconButton
          label={t.topbar.zoomIn}
          className="h-[34px] rounded-none"
          onClick={() => zoomBy(1.2, getViewportSize())}
        >
          <IconPlus />
        </IconButton>
        <IconButton
          label={t.topbar.zoomFit}
          className="h-[34px] rounded-l-none border-border border-l"
          onClick={() => fitToContent(getViewportSize())}
        >
          <IconFit />
        </IconButton>
      </div>
      <Divider />
      <IconButton
        label={theme === "dark" ? t.topbar.lightMode : t.topbar.darkMode}
        data-testid="theme-toggle"
        onClick={toggleTheme}
      >
        {theme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
      </IconButton>
      <IconButton label={t.topbar.shortcuts} onClick={() => setDialog("shortcuts")}>
        <IconHelp size={20} />
      </IconButton>
      <Button variant="primary" className="ml-1.5" onClick={() => setDialog("export")}>
        <IconExport size={17} />
        {t.topbar.export}
      </Button>
    </header>
  );
}

interface MenuEntry {
  label: string;
  icon: ReactNode;
  action: () => void;
  keys?: string;
}

/** Verktygsknapp i verktygsgruppen: det valda verktyget lyfts fram som en vit bricka. */
function ToolButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      onClick={onClick}
      className={cx(
        "inline-flex h-8 w-9 items-center justify-center rounded-[7px] transition-colors",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        active ? "bg-surface text-accent shadow-raised" : "text-text-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
