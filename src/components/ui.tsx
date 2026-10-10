import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
  useState,
} from "react";
import { IconChevronDown, IconChevronUp } from "./icons";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";

export function Button({
  className,
  variant = "default",
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "strong" | "ghost" | "danger";
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 font-medium text-[0.94em] transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        FOCUS_RING,
        variant === "default" &&
          "border-border-strong bg-surface shadow-control hover:bg-surface-2 active:bg-surface-3",
        variant === "primary" &&
          "border-transparent bg-accent text-on-accent shadow-control hover:brightness-110 active:brightness-95",
        variant === "strong" &&
          "border-transparent bg-strong text-on-strong shadow-control hover:opacity-90",
        variant === "ghost" && "border-transparent hover:bg-surface-2 active:bg-surface-3",
        variant === "danger" &&
          "border-danger/35 bg-surface text-danger shadow-control hover:bg-danger/10",
        active && "border-accent bg-accent-soft text-accent hover:bg-accent-soft",
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  label,
  className,
  children,
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cx(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors",
        "hover:bg-surface-2 hover:text-text active:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent",
        FOCUS_RING,
        active && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "gb-control h-9 w-full min-w-0 rounded-lg px-2.5 text-[1em] placeholder:text-text-muted/70",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx("gb-control gb-select h-9 min-w-0 rounded-lg pl-2.5 text-[1em]", className)}
      {...props}
    />
  );
}

/** Grupp av val där exakt ett är aktivt (flikar, verktyg, format). */
export function Segmented({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("flex gap-0.5 rounded-[10px] bg-surface-2 p-[3px]", className)} {...props} />
  );
}

export function SegmentedItem({
  selected,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 text-[0.94em] transition-colors",
        FOCUS_RING,
        selected
          ? "bg-surface font-medium text-text shadow-raised"
          : "text-text-muted hover:text-text",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  inline = false,
}: {
  label: string;
  children: (id: string) => ReactNode;
  inline?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={cx(
        inline ? "flex min-h-9 items-center justify-between gap-3" : "flex flex-col gap-1.5",
      )}
    >
      <label htmlFor={id} className="text-[0.88em] text-text-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

/** Bredd på kontrollen till höger i en rad, så att alla fält hamnar i samma kolumn. */
const CONTROL_WIDTH = "w-[7.25rem]";

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  // Fältet har en egen text medan man skriver, så att det går att tömma och skriva om. Ett värde
  // slår igenom direkt när det ligger inom gränserna; annars rättas det när man lämnar fältet.
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  const nudge = (direction: 1 | -1) => {
    setDraft(null);
    onChange(Math.round(clamp((value ?? min ?? 0) + direction * step) * 1000) / 1000);
  };
  return (
    <Field label={label} inline>
      {(id) => (
        <span
          className={cx(
            "gb-control group flex h-9 shrink-0 items-center rounded-lg",
            CONTROL_WIDTH,
          )}
        >
          <input
            id={id}
            type="number"
            className="gb-number h-full w-full min-w-0 rounded-lg bg-transparent pr-1 pl-2.5 text-[1em] tabular-nums outline-none"
            value={draft ?? value ?? ""}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              setDraft(e.target.value);
              const v = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(v) && v === clamp(v)) onChange(v);
            }}
            onBlur={() => {
              const v = Number(draft);
              if (draft !== null && draft !== "" && Number.isFinite(v) && v !== clamp(v)) {
                onChange(clamp(v));
              }
              setDraft(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
          <span className="flex h-full flex-col border-border border-l opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <StepButton direction={1} onClick={() => nudge(1)} />
            <StepButton direction={-1} onClick={() => nudge(-1)} />
          </span>
        </span>
      )}
    </Field>
  );
}

/** Stegknapp i ett sifferfält. Piltangenterna gör samma sak, därför utanför tabbordningen. */
function StepButton({ direction, onClick }: { direction: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={onClick}
      className={cx(
        "flex w-6 flex-1 items-center justify-center text-text-muted hover:bg-surface-2 hover:text-text",
        direction === 1 ? "rounded-tr-[7px]" : "rounded-br-[7px]",
      )}
    >
      {direction === 1 ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
    </button>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  swatches?: readonly string[];
}) {
  const id = useId();
  const hex = toHex(value);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <label htmlFor={id} className="text-[0.88em] text-text-muted">
          {label}
        </label>
        <span
          className={cx(
            "gb-control relative flex h-9 shrink-0 items-center gap-2 rounded-lg px-1.5",
            CONTROL_WIDTH,
          )}
        >
          <span
            aria-hidden
            className="h-6 w-6 shrink-0 rounded-md border border-black/15 dark:border-white/20"
            style={{ background: value === null ? "transparent" : hex }}
          />
          <span
            aria-hidden
            className="truncate text-[0.82em] text-text-muted uppercase tabular-nums"
          >
            {value === null ? "–" : hex.slice(1)}
          </span>
          <input
            id={id}
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={hex}
            onChange={(e) => onChange(e.target.value)}
          />
        </span>
      </div>
      {swatches && (
        <div className="flex flex-wrap gap-1.5">
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              title={c}
              onClick={() => onChange(c)}
              className={cx(
                "h-7 w-7 rounded-full border border-black/15 transition-transform hover:scale-110 dark:border-white/20",
                FOCUS_RING,
                value === c && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  format = (v: number) => `${Math.round(v * 100)} %`,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <Field label={label}>
      {(id) => (
        <span className="flex items-center gap-3">
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="gb-range w-full"
          />
          <span className="w-14 text-right text-[0.88em] tabular-nums text-text-muted">
            {format(value)}
          </span>
        </span>
      )}
    </Field>
  );
}

/** Av/på-val. `variant="check"` ger en kryssruta med texten till höger (för dialogrutor). */
export function CheckboxField({
  label,
  checked,
  onChange,
  variant = "switch",
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  variant?: "switch" | "check";
}) {
  const id = useId();
  const input = (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className={variant === "switch" ? "gb-switch" : "gb-check"}
    />
  );
  if (variant === "check") {
    return (
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-[1em]">
        {input}
        {label}
      </label>
    );
  }
  return (
    <label
      htmlFor={id}
      className="flex min-h-9 cursor-pointer items-center justify-between gap-3 text-[0.88em] text-text-muted"
    >
      {label}
      {input}
    </label>
  );
}

export function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  /** Litet innehåll till höger om rubriken, t.ex. en knapp. */
  aside?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 border-border border-b px-4 pt-4 pb-5 last:border-b-0">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <h3 className="font-semibold text-[0.74em] text-text-muted uppercase tracking-[0.08em]">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Divider() {
  return <span className="mx-1.5 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

/**
 * Normaliserar en färg till #rrggbb för <input type="color">. Klarar även färgnamn, rgb(), hsl()
 * och korta eller genomskinliga hexkoder (t.ex. från importerade modeller) via webbläsaren.
 */
export function toHex(color: string | null): string {
  if (!color) return "#000000";
  const value = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9a-f]{8}$/i.test(value)) return value.slice(0, 7).toLowerCase();
  return cssColorToHex(value) ?? "#000000";
}

let colorProbe: CanvasRenderingContext2D | null | undefined;

function cssColorToHex(color: string): string | null {
  if (colorProbe === undefined) {
    try {
      colorProbe = document.createElement("canvas").getContext("2d");
    } catch {
      colorProbe = null;
    }
  }
  if (!colorProbe) return null;
  // En ogiltig färg lämnar fillStyle orörd; två olika utgångsvärden avslöjar det.
  colorProbe.fillStyle = "#000000";
  colorProbe.fillStyle = color;
  const first = colorProbe.fillStyle;
  colorProbe.fillStyle = "#ffffff";
  colorProbe.fillStyle = color;
  if (first !== colorProbe.fillStyle) return null;
  if (/^#[0-9a-f]{6}$/i.test(first)) return first.toLowerCase();
  const rgba = first.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!rgba) return null;
  return `#${rgba
    .slice(1, 4)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

export { cx };
