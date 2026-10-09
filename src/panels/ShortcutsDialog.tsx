import { Dialog } from "@/components/Dialog";
import { t } from "@/i18n/sv";
import { useUiStore } from "@/store/uiStore";

const GROUPS: Record<keyof typeof t.shortcuts.groups, (keyof typeof t.shortcuts.items)[]> = {
  create: ["createNode", "createRelationship", "noteTool"],
  edit: ["edit", "delete", "undo", "redo", "duplicate", "copyPaste", "nudge", "reverse"],
  select: ["selectAll", "marquee", "multi", "deselect"],
  view: ["pan", "zoom", "zoomKeys", "fit", "layersPanel"],
  file: ["save", "open", "exportKey", "help"],
};

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.dialog === "shortcuts");
  const setDialog = useUiStore((s) => s.setDialog);
  return (
    <Dialog title={t.shortcuts.title} open={open} onClose={() => setDialog(null)} width="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((group) => (
          <section key={group}>
            <h3 className="mb-1 font-semibold text-text-muted text-xs uppercase tracking-wide">
              {t.shortcuts.groups[group]}
            </h3>
            <dl className="text-sm">
              {GROUPS[group].map((item) => {
                const [keys, desc] = t.shortcuts.items[item];
                return (
                  <div key={item} className="flex gap-2 py-0.5">
                    <dt className="w-44 shrink-0">
                      <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5 text-xs">
                        {keys}
                      </kbd>
                    </dt>
                    <dd className="text-text-muted">{desc}</dd>
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
