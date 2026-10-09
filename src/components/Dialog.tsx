import { type ReactNode, useEffect, useRef } from "react";
import { t } from "@/i18n/sv";
import { IconClose } from "./icons";
import { cx, IconButton } from "./ui";

export function Dialog({
  title,
  open,
  onClose,
  children,
  footer,
  width = "max-w-lg",
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Klick på bakgrunden (själva <dialog>-elementet) stänger. Esc hanteras av onClose.
        if (e.target === ref.current) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.stopPropagation();
      }}
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-xl border border-border bg-surface p-0 text-text shadow-2xl",
        "backdrop:bg-black/40",
        width,
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-center justify-between border-border border-b px-4 py-3">
            <h2 className="font-semibold text-base">{title}</h2>
            <IconButton label={t.common.close} onClick={onClose}>
              <IconClose />
            </IconButton>
          </header>
          <div className="flex-1 overflow-auto px-4 py-3">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-2 border-border border-t px-4 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
