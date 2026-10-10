import { type CSSProperties, useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import { nodeCaption } from "@/model/caption";
import type { Viewport } from "@/model/geometry";
import type { ElementRef, GraphNode } from "@/model/types";
import { propertyKeyProblem } from "@/panels/inspector/PropertiesEditor";
import { useDocumentStore } from "@/store/documentStore";
import {
  nodeOuterRadius,
  relationshipBundles,
  resolvedNodeStyle,
  resolvedRelationshipStyle,
} from "@/store/selectors";
import { useUiStore } from "@/store/uiStore";
import { LABEL_GAP, LABEL_HEIGHT_FACTOR } from "./render/labels";
import { PROPERTY_PADDING_X, PROPERTY_PADDING_Y } from "./render/PropertyBackground";
import { computeRelationshipGeometry } from "./render/Scene";
import { CANVAS_FONT_FAMILY, LABEL_PADDING_X, LINE_HEIGHT } from "./render/text";

/**
 * Redigering direkt på ritytan (dubbelklick). Nodens labels och egenskaper blir skrivbara på
 * den plats och i det utseende de ritas: varje label är en bricka man skriver i, varje egenskap
 * en rad "nyckel: värde", och sist finns en tom bricka respektive rad för att lägga till.
 * Rubriken redigeras samtidigt inne i noden (`InlineEditor`). För en relation gäller samma sak
 * för egenskaperna under relationens typ.
 *
 * Fälten är vanlig HTML ovanpå ritytan, skalad med zoomen så att storlekarna stämmer med det
 * ritade. Enter sparar och går till nästa fält, Esc eller ett klick utanför avslutar.
 */
export function DetailsEditor({ viewport }: { viewport: Viewport }) {
  const details = useUiStore((s) => s.details);
  const setDetails = useUiStore((s) => s.setDetails);
  const doc = useDocumentStore((s) => s.doc);
  const rootRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const node = details?.ref.kind === "node" ? doc.nodes[details.ref.id] : undefined;
  const relationship =
    details?.ref.kind === "relationship" ? doc.relationships[details.ref.id] : undefined;
  const missing = details !== null && !node && !relationship;

  // Elementet togs bort (t.ex. ångra): stäng.
  useEffect(() => {
    if (missing) setDetails(null);
  }, [missing, setDetails]);

  // Sätt markören i den del som dubbelklickades. Rubriken tar hand om sitt eget fokus.
  const focus = details?.focus;
  const targetKey = details ? `${details.ref.kind}:${details.ref.id}` : null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: körs en gång per öppnat element
  useEffect(() => {
    setError(null);
    if (!focus || focus === "caption") return;
    const input = rootRef.current?.querySelector<HTMLInputElement>(
      `[data-details='${focus}'] input`,
    );
    input?.focus();
    input?.select();
  }, [targetKey]);

  if (!details || missing) return null;

  const toScreen = (p: { x: number; y: number }) => ({
    x: p.x * viewport.zoom + viewport.x,
    y: p.y * viewport.zoom + viewport.y,
  });

  /** Flyttar markören till nästa fält efter Enter (sista fältet står kvar, redo för nästa). */
  const focusNext = (current: HTMLInputElement) => {
    requestAnimationFrame(() => {
      const fields = [...(rootRef.current?.querySelectorAll<HTMLInputElement>("input") ?? [])];
      const next = fields[fields.indexOf(current) + 1] ?? fields.at(-1);
      if (next && next !== current) {
        next.focus();
        next.select();
      }
    });
  };

  const close = () => {
    // Lämna fältet först, så att det som står där sparas.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setDetails(null);
  };

  let labelsBlock = null;
  let anchor: { x: number; y: number };
  let propertyStyle: { color: string; background: string; fontSize: number };
  const target: ElementRef = details.ref;
  const properties = (node ?? relationship)?.properties ?? {};

  if (node) {
    const style = resolvedNodeStyle(doc, node);
    const center = toScreen(node.position);
    const outer = nodeOuterRadius(style) * viewport.zoom;
    anchor = { x: center.x, y: center.y + outer + (6 - PROPERTY_PADDING_Y) * viewport.zoom };
    propertyStyle = {
      color: style.propertyColor,
      background: style.propertyBackground,
      fontSize: style.propertyFontSize,
    };
    const pill: CSSProperties = {
      height: style.labelFontSize * LABEL_HEIGHT_FACTOR + style.labelBorderWidth * 2,
      padding: `0 ${LABEL_PADDING_X}px`,
      border: `${style.labelBorderWidth}px solid ${style.labelBorderColor}`,
      borderRadius: 9999,
      background: style.labelBackground,
      color: style.labelColor,
      fontSize: style.labelFontSize,
      fontFamily: CANVAS_FONT_FAMILY,
      textAlign: "center",
      boxSizing: "border-box",
    };
    labelsBlock = (
      <div
        data-details="labels"
        className="pointer-events-auto absolute flex items-center whitespace-nowrap"
        style={{
          left: center.x,
          top: center.y - outer - LABEL_GAP * viewport.zoom,
          gap: LABEL_GAP,
          transform: `translate(-50%, -100%) scale(${viewport.zoom})`,
          transformOrigin: "50% 100%",
        }}
      >
        {node.labels.map((label, i) => (
          <InlineField
            // Platsen i raden är nyckeln, så att fältet finns kvar medan labeln byter namn.
            key={i}
            value={label}
            ariaLabel={t.canvas.editLabel}
            style={pill}
            onCommit={(text) => setError(renameLabel(node, i, text))}
            onEnter={focusNext}
          />
        ))}
        {/* Brickan för ny label ligger utanför raden (till höger), så att de befintliga står kvar
            exakt där de ritas. Utan labels står den ensam, mitt över noden. */}
        <span
          className={node.labels.length > 0 ? "absolute top-0 left-full" : undefined}
          style={{ marginLeft: node.labels.length > 0 ? LABEL_GAP : 0 }}
        >
          <InlineField
            value=""
            ariaLabel={t.inspector.addLabel}
            placeholder={t.canvas.addLabel}
            style={{ ...pill, borderStyle: "dashed", opacity: 0.75 }}
            onCommit={(text) => setError(renameLabel(node, node.labels.length, text))}
            onEnter={() => {}}
          />
        </span>
      </div>
    );
  } else if (relationship) {
    const geometry = computeRelationshipGeometry(doc, relationship, relationshipBundles(doc));
    if (!geometry) return null;
    const style = resolvedRelationshipStyle(doc, relationship);
    const at = toScreen(geometry.labelPosition);
    const typeHeight = relationship.type ? style.typeFontSize * 1.4 : 0;
    anchor = { x: at.x, y: at.y + (typeHeight / 2 + 4) * viewport.zoom };
    propertyStyle = {
      color: style.propertyColor,
      background: style.propertyBackground,
      fontSize: style.propertyFontSize,
    };
  } else {
    return null;
  }

  const row: CSSProperties = {
    display: "block",
    height: propertyStyle.fontSize * LINE_HEIGHT,
    padding: 0,
    border: 0,
    background: "transparent",
    color: propertyStyle.color,
    fontSize: propertyStyle.fontSize,
    lineHeight: LINE_HEIGHT,
    fontFamily: CANVAS_FONT_FAMILY,
    textAlign: "left",
  };
  const entries = Object.entries(properties);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: fångar bara Esc och fokus som bubblar upp från fälten
    <div
      ref={rootRef}
      data-details-editor
      data-testid="details-editor"
      className="pointer-events-none absolute inset-0 z-10"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
      onBlur={(e) => {
        // Fokus lämnade fälten helt (Tab förbi sista fältet, klick i sidopanelen): klart.
        const next = e.relatedTarget;
        const staysInside =
          next instanceof Element &&
          (rootRef.current?.contains(next) || next.closest("[data-testid='inline-editor']"));
        if (!staysInside) setDetails(null);
      }}
    >
      {labelsBlock}
      <div
        data-details="properties"
        className="pointer-events-auto absolute flex flex-col items-stretch whitespace-nowrap"
        style={{
          left: anchor.x,
          top: anchor.y,
          padding: `${PROPERTY_PADDING_Y}px ${PROPERTY_PADDING_X}px`,
          borderRadius: 3,
          background: propertyStyle.background,
          boxShadow: "0 0 0 1px var(--color-accent)",
          transform: `translateX(-50%) scale(${viewport.zoom})`,
          transformOrigin: "50% 0",
        }}
      >
        {entries.map(([key, value], i) => (
          <InlineField
            // Platsen i listan är nyckeln, så att fältet finns kvar medan egenskapen byter namn.
            key={i}
            value={`${key}: ${value}`}
            ariaLabel={t.canvas.editProperty}
            style={row}
            onCommit={(text) => setError(writeProperty(target, properties, key, text))}
            onEnter={focusNext}
          />
        ))}
        {/* Raden för ny egenskap ligger under listan, utanför dess bredd, så att de befintliga
            raderna står kvar exakt där de ritas. Utan egenskaper står den ensam under elementet. */}
        <div
          className={entries.length > 0 ? "absolute top-full left-0" : undefined}
          style={
            entries.length > 0
              ? {
                  padding: `${PROPERTY_PADDING_Y}px ${PROPERTY_PADDING_X}px`,
                  borderRadius: 3,
                  background: propertyStyle.background,
                  boxShadow: "0 0 0 1px var(--color-accent)",
                }
              : undefined
          }
        >
          <InlineField
            value=""
            ariaLabel={t.inspector.addProperty}
            placeholder={t.canvas.addProperty}
            style={{ ...row, opacity: 0.75 }}
            onCommit={(text) => setError(writeProperty(target, properties, null, text))}
            onEnter={() => {}}
          />
          {error && (
            <p
              role="alert"
              data-testid="details-error"
              className="absolute top-full left-0 mt-1.5 w-max max-w-[22rem] whitespace-normal rounded-lg bg-surface px-3 py-2 text-[13px] text-danger leading-snug shadow-pop"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Ett textfält som ser ut som den ritade texten och är precis så brett som sitt innehåll.
 * Sparar när det lämnas eller när Enter trycks; `onCommit` får bara anrop när texten ändrats.
 */
function InlineField({
  value,
  placeholder,
  ariaLabel,
  style,
  onCommit,
  onEnter,
}: {
  value: string;
  placeholder?: string;
  ariaLabel: string;
  style: CSSProperties;
  onCommit: (text: string) => void;
  onEnter: (input: HTMLInputElement) => void;
}) {
  const [text, setText] = useState(value);
  // Följ med när värdet ändras utifrån (sparat, ångrat, ändrat i sidopanelen).
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === value.trim()) {
      setText(value);
      return;
    }
    onCommit(trimmed);
    // Ett nytt-fält töms inför nästa; ett befintligt fält följer det sparade värdet via effekten.
    if (value === "") setText("");
  };
  return (
    <input
      aria-label={ariaLabel}
      title={ariaLabel}
      placeholder={placeholder}
      value={text}
      // Bredden följer innehållet (field-sizing där det stöds, annars antal tecken).
      size={Math.max(1, (text || placeholder || "").length)}
      className="field-sizing-content min-w-[1ch] outline-none focus:shadow-[0_0_0_2px_var(--color-accent)]"
      style={style}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          onEnter(e.currentTarget);
        }
      }}
    />
  );
}

/**
 * Byter namn på nodens label nummer `index` (tom text tar bort den; index efter sista lägger
 * till). Ger ett felmeddelande om labelkombinationen redan används av en annan nod.
 */
function renameLabel(node: GraphNode, index: number, text: string): string | null {
  const store = useDocumentStore.getState();
  const labels = [...node.labels];
  if (text === "") labels.splice(index, 1);
  else labels[index] = text;
  const result = store.setNodeLabels([{ id: node.id, labels }]);
  if (result.ok) return null;
  const other = store.doc.nodes[result.conflict.otherId];
  return t.inspector.labelConflict(labels.join(", "), other ? nodeCaption(other) : "");
}

/**
 * Sparar en egenskapsrad skriven som "nyckel: värde". `oldKey` är radens nuvarande nyckel, eller
 * null för en ny rad. Tom text tar bort egenskapen. Ger ett felmeddelande om raden inte går att
 * spara (saknar nyckel, nyckeln används redan, eller består bara av siffror).
 */
function writeProperty(
  ref: ElementRef,
  properties: Record<string, string>,
  oldKey: string | null,
  text: string,
): string | null {
  const store = useDocumentStore.getState();
  if (text === "") {
    if (oldKey !== null) store.removeProperty([ref], oldKey);
    return null;
  }
  const colon = text.indexOf(":");
  const key = (colon >= 0 ? text.slice(0, colon) : text).trim();
  const value = colon >= 0 ? text.slice(colon + 1).trim() : oldKey === null ? "" : null;
  // En befintlig rad utan kolon: hela texten är värdet, nyckeln står kvar.
  if (value === null && oldKey !== null) {
    store.setProperty([ref], oldKey, text);
    return null;
  }
  const problem =
    propertyKeyProblem(key) ??
    (key !== oldKey && key in properties ? t.inspector.propertyKeyExists(key) : null);
  if (problem) return problem;
  if (oldKey !== null && key !== oldKey) store.renameProperty([ref], oldKey, key);
  store.setProperty([ref], key, value ?? "");
  return null;
}
