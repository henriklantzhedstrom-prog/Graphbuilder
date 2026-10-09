import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useId } from "react";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Button({
  className,
  variant = "default",
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger";
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[1em] transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
        variant === "default" && "border-border bg-surface hover:bg-surface-2 active:bg-surface-3",
        variant === "primary" && "border-accent bg-accent text-white hover:brightness-110",
        variant === "ghost" && "border-transparent hover:bg-surface-2 active:bg-surface-3",
        variant === "danger" && "border-danger/40 text-danger hover:bg-danger/10",
        active && "border-accent bg-accent-soft text-accent",
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
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition-colors",
        "hover:bg-surface-2 active:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
        active && "border-accent bg-accent-soft text-accent",
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
        "h-8 w-full rounded-md border border-border bg-surface px-2 text-[1em]",
        "focus:border-accent focus:outline-none",
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
    <div className={cx(inline ? "flex items-center justify-between gap-3" : "flex flex-col gap-1")}>
      <label htmlFor={id} className="text-[0.86em] text-text-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

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
  return (
    <Field label={label} inline>
      {(id) => (
        <input
          id={id}
          type="number"
          className="h-8 w-24 rounded-md border border-border bg-surface px-2 text-right text-[1em] focus:border-accent focus:outline-none"
          value={value ?? ""}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v) && e.target.value !== "") onChange(v);
          }}
        />
      )}
    </Field>
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
  return (
    <Field label={label} inline>
      {(id) => (
        <span className="flex items-center gap-1">
          {swatches?.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              title={c}
              onClick={() => onChange(c)}
              className={cx(
                "h-5 w-5 rounded-full border",
                value === c ? "border-accent ring-2 ring-accent/40" : "border-border",
              )}
              style={{ background: c }}
            />
          ))}
          <input
            id={id}
            type="color"
            className="h-7 w-9 cursor-pointer rounded-md border border-border bg-surface p-0.5"
            value={toHex(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        </span>
      )}
    </Field>
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
        <span className="flex items-center gap-2">
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <span className="w-14 text-right text-[0.86em] tabular-nums text-text-muted">
            {format(value)}
          </span>
        </span>
      )}
    </Field>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-[1em]">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-accent"
      />
      {label}
    </label>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-border border-b px-3 py-3">
      <h3 className="font-semibold text-[0.8em] text-text-muted uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}

/** Normaliserar färg till #rrggbb för <input type="color">. */
export function toHex(color: string | null): string {
  if (!color) return "#000000";
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#000000";
}

export { cx };
