import { useEffect, useRef, useState } from "react";
import { IconPlus, IconTrash } from "@/components/icons";
import { Button, IconButton, TextInput } from "@/components/ui";
import { t } from "@/i18n";
import type { ElementRef } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { commonValue } from "./common";

/** Varför ett egenskapsnamn inte går att använda, eller null om det går bra. */
export function propertyKeyProblem(key: string): string | null {
  if (!key) return t.inspector.propertyKeyEmpty;
  // Namn som bara är siffror sorteras alltid först av webbläsaren och hamnar på fel plats.
  if (/^\d+$/.test(key)) return t.inspector.propertyKeyNumeric;
  return null;
}

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

  const [error, setError] = useState<string | null>(null);
  const [focusValueOf, setFocusValueOf] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const newKeyRef = useRef<HTMLInputElement>(null);

  // Efter att en egenskap lagts till flyttas markören till dess värdefält.
  useEffect(() => {
    if (focusValueOf === null) return;
    const rows = rootRef.current?.querySelectorAll<HTMLInputElement>("[data-property-value]");
    const input = [...(rows ?? [])].find((el) => el.dataset.propertyValue === focusValueOf);
    input?.focus();
    input?.select();
    setFocusValueOf(null);
  }, [focusValueOf]);

  /**
   * Sparar det som står i fältet för ny egenskap. Skrivs "nyckel: värde" sparas båda på en gång;
   * skrivs bara nyckeln skapas egenskapen och markören flyttas till värdet (om `moveFocus`).
   */
  const addKey = (moveFocus: boolean) => {
    const text = newKey.trim();
    if (!text) return;
    const colon = text.indexOf(":");
    const key = (colon > 0 ? text.slice(0, colon) : text).trim();
    const value = colon > 0 ? text.slice(colon + 1).trim() : null;
    const problem = propertyKeyProblem(key);
    if (problem) {
      setError(problem);
      return;
    }
    // En nyckel som redan finns får inte tömmas: behåll värdet om inget nytt skrevs.
    if (value !== null || !keys.includes(key)) setProperty(refs, key, value ?? "");
    setNewKey("");
    setError(null);
    if (moveFocus && value === null) setFocusValueOf(key);
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-1.5">
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
        // Rubrik för några av de markerade noderna men inte alla: visa mellanläge.
        const partlyCaption = !isCaption && (caption?.keys.some((k) => k === key) ?? false);
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
                  ref={(el) => {
                    if (el) el.indeterminate = partlyCaption;
                  }}
                  aria-checked={partlyCaption ? "mixed" : undefined}
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
                // Ett namn som redan används, eller ett ogiltigt namn, skulle skriva över en
                // annan egenskap: behåll det gamla namnet och säg varför.
                const problem =
                  next && next !== key
                    ? keys.includes(next)
                      ? t.inspector.propertyKeyExists(next)
                      : propertyKeyProblem(next)
                    : null;
                setError(problem);
                if (next && next !== key && !problem) renameProperty(refs, key, next);
                else e.target.value = key;
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <TextInput
              aria-label={t.inspector.propertyValue}
              data-property-value={key}
              value={common ?? ""}
              placeholder={common === null ? t.inspector.mixed : ""}
              onChange={(e) => setProperty(refs, key, e.target.value)}
              // Värdet sparas medan man skriver; Enter bekräftar och går vidare till nästa egenskap.
              onKeyDown={(e) => {
                if (e.key === "Enter") newKeyRef.current?.focus();
              }}
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
          ref={newKeyRef}
          title={t.inspector.addPropertyHint}
          value={newKey}
          onChange={(e) => {
            setNewKey(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") addKey(true);
          }}
          // Det som står i fältet sparas även när man klickar någon annanstans.
          onBlur={() => addKey(false)}
        />
        <Button
          onClick={() => addKey(true)}
          disabled={!newKey.trim()}
          aria-label={t.inspector.addProperty}
          className="w-9 px-0"
        >
          <IconPlus size={16} />
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          data-testid="property-error"
          className="rounded-lg bg-danger/10 px-3 py-2 text-[0.88em] text-danger leading-snug"
        >
          {error}
        </p>
      )}
    </div>
  );
}
