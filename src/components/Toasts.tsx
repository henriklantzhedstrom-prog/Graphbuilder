import { useUiStore } from "@/store/uiStore";
import { cx } from "./ui";

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <button
          type="button"
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className={cx(
            "pointer-events-auto flex items-center gap-2.5 rounded-full bg-toast py-2.5 pr-5 pl-4 font-medium text-[15px] text-toast-text shadow-pop",
          )}
        >
          <span
            aria-hidden
            className={cx(
              "h-2 w-2 shrink-0 rounded-full",
              toast.kind === "error" ? "bg-[#ff6b6b]" : "bg-[#4ade80]",
            )}
          />
          {toast.message}
        </button>
      ))}
    </div>
  );
}
