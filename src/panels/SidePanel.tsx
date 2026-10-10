import type { ReactNode } from "react";
import { addNodeInView } from "@/canvas/actions";
import { IconLayers, IconPalette, IconPlus } from "@/components/icons";
import { Button, Segmented, SegmentedItem } from "@/components/ui";
import { t } from "@/i18n";
import type { Size } from "@/model/types";
import { type Panel, useUiStore } from "@/store/uiStore";
import { Inspector } from "./Inspector";
import { LayersPanel } from "./LayersPanel";

const TABS: { id: Panel; label: string; icon: ReactNode }[] = [
  { id: "inspector", label: t.panels.inspector, icon: <IconPalette size={17} /> },
  { id: "layers", label: t.panels.layers, icon: <IconLayers size={17} /> },
];

export function SidePanel({ getViewportSize }: { getViewportSize: () => Size }) {
  const panel = useUiStore((s) => s.panel);
  const setPanel = useUiStore((s) => s.setPanel);
  return (
    <aside className="flex w-[23rem] shrink-0 flex-col border-border border-l bg-surface text-[17px]">
      <div className="flex flex-col gap-3 border-border border-b p-4">
        <Button
          variant="primary"
          data-testid="add-node"
          className="h-11 w-full text-[1em]"
          onClick={() => addNodeInView(getViewportSize())}
        >
          <IconPlus size={18} />
          {t.tools.addNode}
        </Button>
        <Segmented role="tablist">
          {TABS.map((tab) => (
            <SegmentedItem
              key={tab.id}
              role="tab"
              aria-selected={panel === tab.id}
              selected={panel === tab.id}
              className="h-9"
              onClick={() => setPanel(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </SegmentedItem>
          ))}
        </Segmented>
      </div>
      <div className="gb-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {panel === "inspector" ? <Inspector /> : <LayersPanel />}
      </div>
    </aside>
  );
}
