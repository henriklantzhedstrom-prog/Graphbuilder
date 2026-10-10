import { Dialog } from "@/components/Dialog";
import { t } from "@/i18n";
import { isMac, shortcutLabel } from "@/model/shortcutLabel";
import { useUiStore } from "@/store/uiStore";

const GROUPS: Record<keyof typeof t.shortcuts.groups, (keyof typeof t.shortcuts.items)[]> = {
  create: ["createNode", "createRelationship", "addNote", "noteTool", "arrange"],
  edit: ["edit", "delete", "undo", "redo", "duplicate", "copyPaste", "nudge", "reverse"],
  select: ["selectAll", "marquee", "marqueeAdd", "multi", "deselect"],
  view: ["pan", "zoom", "zoomKeys", "fit", "layersPanel"],
  file: ["save", "open", "exportKey", "help"],
};

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.dialog === "shortcuts");
  const setDialog = useUiStore((s) => s.setDialog);
  const mac = isMac();
  return (
    <Dialog title={t.shortcuts.title} open={open} onClose={() => setDialog(null)} width="max-w-4xl">
      <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((group) => (
          <section key={group}>
            <h3 className="mb-2 font-semibold text-[0.78em] text-text-muted uppercase tracking-[0.08em]">
              {t.shortcuts.groups[group]}
            </h3>
            <dl className="flex flex-col">
              {GROUPS[group].map((item) => {
                const [keys, desc] = t.shortcuts.items[item];
                return (
                  <div
                    key={item}
                    className="flex items-baseline justify-between gap-4 border-border border-b py-2 last:border-b-0"
                  >
                    <dd className="order-1">{desc}</dd>
                    <dt className="order-2 shrink-0 text-right">
                      <kbd className="rounded-md border border-border border-b-2 bg-surface-2 px-1.5 py-0.5 font-sans text-[0.84em] text-text-muted">
                        {shortcutLabel(keys, mac)}
                      </kbd>
                    </dt>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
