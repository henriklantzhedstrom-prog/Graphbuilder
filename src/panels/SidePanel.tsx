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
    <aside className="flex w-80 shrink-0 flex-col border-border border-l bg-surface">
      <div className="border-border border-b p-3">
        <Button
          variant="primary"
          data-testid="add-node"
          className="w-full justify-center"
          onClick={() => addNodeInView(getViewportSize())}
        >
          <IconNode size={16} />
          {t.tools.addNode}
        </Button>
      </div>
      <div role="tablist" className="flex border-border border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={panel === tab.id}
            onClick={() => setPanel(tab.id)}
            className={cx(
              "flex-1 border-b-2 px-3 py-2 text-sm",
              panel === tab.id
                ? "border-accent font-medium text-text"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {panel === "inspector" ? <Inspector /> : <LayersPanel />}
      </div>
    </aside>
  );
}
