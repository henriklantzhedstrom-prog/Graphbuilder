import { useUiStore } from "@/store/uiStore";
import { cx } from "./ui";

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <button
          type="button"
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className={cx(
            "pointer-events-auto rounded-xl border px-3.5 py-2 text-sm shadow-float",
            toast.kind === "error"
              ? "border-danger/50 bg-surface text-danger"
              : "border-border bg-surface text-text",
          )}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
