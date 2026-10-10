import { type ReactNode, useEffect, useRef } from "react";
import { t } from "@/i18n";
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
        "gb-dialog m-auto w-[calc(100%-2rem)] overflow-hidden rounded-2xl bg-surface p-0 text-[15px] text-text shadow-dialog",
        width,
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-center justify-between gap-4 py-3 pr-3 pl-6">
            <h2 className="font-semibold text-[1.2em]">{title}</h2>
            <IconButton label={t.common.close} onClick={onClose}>
              <IconClose />
            </IconButton>
          </header>
          <div className="gb-scroll flex-1 overflow-auto px-6 pt-1 pb-6">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-2 border-border border-t bg-surface-2 px-6 py-3.5">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
