import { addNodeInView } from "@/canvas/actions";
import { IconNode } from "@/components/icons";
import { Button, cx } from "@/components/ui";
import { t } from "@/i18n";
import type { Size } from "@/model/types";
import { type Panel, useUiStore } from "@/store/uiStore";
import { Inspector } from "./Inspector";
import { LayersPanel } from "./LayersPanel";

const TABS: { id: Panel; label: string }[] = [
  { id: "inspector", label: t.panels.inspector },
  { id: "layers", label: t.panels.layers },
];

export function SidePanel({ getViewportSize }: { getViewportSize: () => Size }) {
  const panel = useUiStore((s) => s.panel);
  const setPanel = useUiStore((s) => s.setPanel);
  return (
    <aside className="flex w-[23rem] shrink-0 flex-col border-border border-l bg-surface text-[17px]">
      <div className="flex flex-col gap-3 border-border border-b p-3">
        <Button
          variant="primary"
          data-testid="add-node"
          className="h-10 w-full justify-center rounded-[10px]"
          onClick={() => addNodeInView(getViewportSize())}
        >
          <IconNode size={16} />
          {t.tools.addNode}
        </Button>
        <div
          role="tablist"
          className="grid grid-cols-2 gap-0.5 rounded-[10px] bg-surface-2 p-[3px]"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={panel === tab.id}
              onClick={() => setPanel(tab.id)}
              className={cx(
                "h-8 rounded-lg px-3 text-[0.9em] transition-colors",
                "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
                panel === tab.id
                  ? "bg-surface font-medium text-text shadow-sm dark:bg-surface-3"
                  : "text-text-muted hover:text-text",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {panel === "inspector" ? <Inspector /> : <LayersPanel />}
      </div>
    </aside>
  );
}
