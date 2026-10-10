import type { ReactNode } from "react";
import { fitToContent, resetZoom, zoomBy } from "@/canvas/actions";
import { arrangeAutomatically } from "@/canvas/arrange";
import {
  IconArrange,
  IconCursor,
  IconFit,
  IconHand,
  IconImage,
  IconMinus,
  IconNote,
  IconPlus,
} from "@/components/icons";
import { cx, Divider, IconButton } from "@/components/ui";
import { t } from "@/i18n";
import type { Size } from "@/model/types";
import { useUiStore } from "@/store/uiStore";

/** Flytande list ovanpå ritytan; släpper igenom pekaren utanför själva knapparna. */
function FloatingBar({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        "pointer-events-auto absolute z-10 flex items-center gap-0.5 rounded-xl border border-border bg-surface p-1 shadow-float",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ToolBar({
  onAddImage,
  getViewportSize,
}: {
  onAddImage: () => void;
  getViewportSize: () => Size;
}) {
  const arranging = useUiStore((s) => s.arranging);
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  return (
    <FloatingBar className="top-3 left-1/2 -translate-x-1/2">
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
      <Divider />
      {/* Med text, inte bara en ikon: det är en handling man ska hitta, inte ett verktyg. */}
      <button
        type="button"
        data-testid="arrange"
        title={t.tools.arrangeHint}
        disabled={arranging}
        onClick={() => arrangeAutomatically(getViewportSize())}
        className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[14px] text-text transition-colors hover:bg-surface-2 disabled:cursor-wait disabled:opacity-60"
      >
        <IconArrange size={18} />
        {arranging ? t.tools.arranging : t.tools.arrange}
      </button>
    </FloatingBar>
  );
}

export function ZoomControls({ getViewportSize }: { getViewportSize: () => Size }) {
  const zoom = useUiStore((s) => s.viewport.zoom);
  return (
    <FloatingBar className="bottom-3 left-3">
      <IconButton label={t.topbar.zoomOut} onClick={() => zoomBy(1 / 1.2, getViewportSize())}>
        <IconMinus />
      </IconButton>
      <button
        type="button"
        className="h-9 w-16 whitespace-nowrap rounded-lg text-center text-[14px] text-text-muted tabular-nums hover:bg-surface-2 hover:text-text"
        title={t.topbar.zoomReset}
        onClick={() => resetZoom(getViewportSize())}
      >
        {Math.round(zoom * 100)} %
      </button>
      <IconButton label={t.topbar.zoomIn} onClick={() => zoomBy(1.2, getViewportSize())}>
        <IconPlus />
      </IconButton>
      <Divider />
      <IconButton label={t.topbar.zoomFit} onClick={() => fitToContent(getViewportSize())}>
        <IconFit />
      </IconButton>
    </FloatingBar>
  );
}
