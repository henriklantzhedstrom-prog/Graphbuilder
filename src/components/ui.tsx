import {
  type ButtonHTMLAttributes,
  type ComponentProps,
  type HTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
  useState,
} from "react";
import { t } from "@/i18n";
import { beginHistoryGroup, endHistoryGroup } from "@/store/documentStore";

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

export function TextInput({ className, ...props }: ComponentProps<"input">) {
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

/** Tal i fältet bredvid ett skjutreglage: heltal utan decimaler, annars en decimal. */
export const formatNumber = (v: number): string => String(Math.round(v * 10) / 10);

/** Andel (0–1) som procent, för t.ex. genomskinlighet. */
export const formatPercent = (v: number): string => `${Math.round(v * 100)} %`;

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
            // Färgväljaren skickar ett värde för varje liten rörelse; tills den stängs (fältet
            // lämnas) räknas allt som ett enda steg att ångra.
            onClick={beginHistoryGroup}
            onBlur={endHistoryGroup}
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

/**
 * Skjutreglage med ett litet fält bredvid där samma tal kan skrivas in exakt. Med `format`
 * (t.ex. procent) visas värdet bara som text.
 */
export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  format,
  mixed = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Egen visning av värdet (t.ex. procent). Då går talet inte att skriva in. */
  format?: (v: number) => string;
  /** De markerade elementen har olika värden: visa det i stället för ett tal. */
  mixed?: boolean;
}) {
  const id = useId();
  const labelId = useId();
  // Fältet har en egen text medan man skriver, så att det går att tömma och skriva om. Ett tal
  // slår igenom direkt när det ligger inom gränserna; annars rättas det när fältet lämnas.
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const commitDraft = () => {
    const v = Number(draft);
    if (draft !== null && draft !== "" && Number.isFinite(v) && v !== clamp(v)) onChange(clamp(v));
    setDraft(null);
  };
  return (
    <div className="flex flex-col gap-0.5" data-field={label}>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <label id={labelId} htmlFor={id} className="text-[0.88em] text-text-muted">
          {label}
        </label>
        {format ? (
          <output htmlFor={id} className="text-[0.88em] text-text tabular-nums">
            {mixed ? t.inspector.mixed : format(value)}
          </output>
        ) : (
          <input
            type="number"
            aria-label={t.common.typeNumber}
            aria-describedby={labelId}
            title={t.common.typeNumber}
            className="gb-control gb-number h-8 w-[4.5rem] shrink-0 rounded-lg px-2 text-right text-[0.94em] tabular-nums"
            value={draft ?? (mixed ? "" : formatNumber(value))}
            placeholder={mixed ? "–" : undefined}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              setDraft(e.target.value);
              const v = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(v) && v === clamp(v)) onChange(v);
            }}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        )}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          setDraft(null);
          onChange(Number(e.target.value));
        }}
        // En hel dragning (eller en nedhållen piltangent) blir ett enda steg att ångra.
        onPointerDown={beginHistoryGroup}
        onPointerUp={endHistoryGroup}
        onPointerCancel={endHistoryGroup}
        onKeyDown={beginHistoryGroup}
        onKeyUp={endHistoryGroup}
        onBlur={endHistoryGroup}
        className="gb-range w-full"
      />
    </div>
  );
}

/**
 * Av/på-val. `variant="check"` ger en kryssruta med texten till höger (för dialogrutor).
 * `mixed` visar ett mellanläge när de markerade elementen har olika värden; ett klick slår då
 * på valet för alla.
 */
export function CheckboxField({
  label,
  checked,
  onChange,
  variant = "switch",
  mixed = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  variant?: "switch" | "check";
  mixed?: boolean;
}) {
  const id = useId();
  const input = (
    <input
      id={id}
      type="checkbox"
      ref={(el) => {
        // Mellanläget finns bara som egenskap på elementet, inte som attribut.
        if (el) el.indeterminate = mixed;
      }}
      aria-checked={mixed ? "mixed" : undefined}
      title={mixed ? t.inspector.mixed : undefined}
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
