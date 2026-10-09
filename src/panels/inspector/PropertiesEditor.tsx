import { useState } from "react";
import { IconPlus, IconTrash } from "@/components/icons";
import { Button, IconButton, TextInput } from "@/components/ui";
import { t } from "@/i18n/sv";
import type { ElementRef } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { commonValue } from "./common";

/** Nyckel/värde-tabell för egenskaper på noder och relationer (hanterar flera markerade). */
export function PropertiesEditor({
  refs,
  propertySets,
}: {
  refs: ElementRef[];
  propertySets: Record<string, string>[];
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
    <div className="flex flex-col gap-1">
      {keys.map((key) => {
        const common = commonValue(propertySets.map((p) => p[key] ?? ""));
        return (
          <div key={key} className="flex items-center gap-1">
            <TextInput
              aria-label={t.inspector.propertyKey}
              className="w-2/5"
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
              <IconTrash size={16} />
            </IconButton>
          </div>
        );
      })}
      <div className="flex items-center gap-1">
        <TextInput
          aria-label={t.inspector.addProperty}
          placeholder={t.inspector.propertyKey}
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addKey();
          }}
        />
        <Button onClick={addKey} disabled={!newKey.trim()} aria-label={t.inspector.addProperty}>
          <IconPlus size={16} />
        </Button>
      </div>
    </div>
  );
}
