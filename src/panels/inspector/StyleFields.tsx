import { CheckboxField, ColorField, SliderField } from "@/components/ui";
import { commonValue, type StyleFieldSpec } from "./common";

/**
 * Renderar stilfält för en lista av objekt (noder eller relationer).
 * `values` är de upplösta stilarna; `onChange` sätter en nyckel på alla.
 */
export function StyleFields<K extends string, S extends Record<K, string | number | boolean>>({
  fields,
  labels,
  values,
  onChange,
}: {
  fields: StyleFieldSpec<K>[];
  labels: Record<K, string>;
  values: S[];
  onChange: (key: K, value: string | number | boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {fields.map((field) => {
        const common = commonValue(values.map((v) => v[field.key]));
        switch (field.type) {
          case "color":
            return (
              <ColorField
                key={field.key}
                label={labels[field.key]}
                value={typeof common === "string" ? common : null}
                onChange={(v) => onChange(field.key, v)}
              />
            );
          case "number":
            return (
              <SliderField
                key={field.key}
                label={labels[field.key]}
                value={typeof common === "number" ? common : (field.min ?? 0)}
                mixed={common === null}
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                onChange={(v) => onChange(field.key, v)}
              />
            );
          default:
            return (
              <CheckboxField
                key={field.key}
                label={labels[field.key]}
                checked={common === true}
                mixed={common === null}
                onChange={(v) => onChange(field.key, v)}
              />
            );
        }
      })}
    </div>
  );
}
