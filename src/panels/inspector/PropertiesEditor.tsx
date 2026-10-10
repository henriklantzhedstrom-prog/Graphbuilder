import { useState } from "react";
import { IconPlus, IconTrash } from "@/components/icons";
import { Button, IconButton, TextInput } from "@/components/ui";
import { t } from "@/i18n";
import type { ElementRef } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { commonValue } from "./common";

/** Nyckel/värde-tabell för egenskaper på noder och relationer (hanterar flera markerade). */
export function PropertiesEditor({
  refs,
  propertySets,
  caption,
}: {
  refs: ElementRef[];
  propertySets: Record<string, string>[];
  /** Endast noder: vilken egenskap som är rubrik, och hur man byter. */
  caption?: { keys: (string | null)[]; onToggle: (key: string, checked: boolean) => void };
}) {
  const setProperty = useDocumentStore((s) => s.setProperty);
  const renameProperty = useDocumentStore((s) => s.renameProperty);
  const removeProperty = useDocumentStore((s) => s.removeProperty);
  const [newKey, setNewKey] = useState("");
  const keys = [...new Set(propertySets.flatMap((p) => Object.keys(p)))];

  const addKey = () => {
    const key = newKey.trim();
    if (!key) return;
    setProperty(refs, key, "");
    setNewKey("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      {caption && keys.length > 0 && (
        <div className="flex items-center gap-1.5 text-[0.74em] text-text-muted">
          <span className="w-14 shrink-0">{t.inspector.captionColumn}</span>
          <span className="w-[32%] shrink-0">{t.inspector.propertyKey}</span>
          <span>{t.inspector.propertyValue}</span>
        </div>
      )}
      {keys.map((key) => {
        const common = commonValue(propertySets.map((p) => p[key] ?? ""));
        const isCaption = caption ? caption.keys.every((k) => k === key) : false;
        return (
          <div key={key} className="flex items-center gap-1.5">
            {caption && (
              <span className="flex w-14 shrink-0 pl-1">
                <input
                  type="checkbox"
                  data-testid="caption-toggle"
                  aria-label={t.inspector.captionToggleLabel(key)}
                  title={t.inspector.captionToggleLabel(key)}
                  className="gb-check"
                  checked={isCaption}
                  onChange={(e) => caption.onToggle(key, e.target.checked)}
                />
              </span>
            )}
            <TextInput
              aria-label={t.inspector.propertyKey}
              className={caption ? "max-w-[32%] shrink-0" : "max-w-[40%] shrink-0"}
              defaultValue={key}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== key) renameProperty(refs, key, next);
                else e.target.value = key;
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <TextInput
              aria-label={t.inspector.propertyValue}
              value={common ?? ""}
              placeholder={common === null ? t.inspector.mixed : ""}
              onChange={(e) => setProperty(refs, key, e.target.value)}
            />
            <IconButton
              label={t.inspector.removeProperty}
              onClick={() => removeProperty(refs, key)}
            >
              <IconTrash size={17} />
            </IconButton>
          </div>
        );
      })}
      <div className="flex items-center gap-1.5">
        <TextInput
          aria-label={t.inspector.addProperty}
          placeholder={t.inspector.propertyKey}
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addKey();
          }}
        />
        <Button
          onClick={addKey}
          disabled={!newKey.trim()}
          aria-label={t.inspector.addProperty}
          className="w-9 px-0"
        >
          <IconPlus size={16} />
        </Button>
      </div>
    </div>
  );
}
