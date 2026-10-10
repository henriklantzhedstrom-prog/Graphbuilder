import { useEffect, useRef } from "react";
import { t } from "@/i18n";
import type { Viewport } from "@/model/geometry";
import { LabelsEditor } from "@/panels/inspector/LabelsEditor";
import { PropertiesEditor } from "@/panels/inspector/PropertiesEditor";
import { useDocumentStore } from "@/store/documentStore";
import {
  nodeOuterRadius,
  relationshipBundles,
  resolvedNodeStyle,
  resolvedRelationshipStyle,
} from "@/store/selectors";
import { useUiStore } from "@/store/uiStore";
import { computeRelationshipGeometry } from "./render/Scene";

/** Avstånd i px mellan elementet och redigeringsrutorna. */
const GAP = 10;

const CARD =
  "pointer-events-auto absolute m-0 w-[21rem] min-w-0 max-w-[90%] rounded-xl border-0 bg-surface p-3 text-[15px] text-text shadow-pop outline-none";
const HEADING = "mb-2 font-semibold text-[0.74em] text-text-muted uppercase tracking-[0.08em]";

/**
 * Redigering direkt på ritytan (dubbelklick): nodens labels i en ruta ovanför noden och
 * egenskaperna i en ruta under den, på samma platser som de ritas. Rubriken redigeras samtidigt
 * inne i noden (`InlineEditor`). För en relation visas egenskaperna under relationens typ.
 * Rutorna är vanlig HTML ovanpå ritytan, med samma fält som sidopanelen och samma storlek
 * oavsett zoom.
 */
export function DetailsEditor({ viewport }: { viewport: Viewport }) {
  const details = useUiStore((s) => s.details);
  const setDetails = useUiStore((s) => s.setDetails);
  const doc = useDocumentStore((s) => s.doc);
  const setCaptionKey = useDocumentStore((s) => s.setCaptionKey);
  const rootRef = useRef<HTMLDivElement>(null);
  // Ett klick på en knapp i rutan flyttar inte alltid fokus (Safari); då ska rutan inte stängas.
  const pointerInside = useRef(false);

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
    const root = rootRef.current;
    if (!root || !focus || focus === "caption") return;
    // Labels: fältet för ny label. Egenskaper: första värdet, eller fältet för ny egenskap.
    const input =
      focus === "labels"
        ? root.querySelector<HTMLInputElement>("[data-details='labels'] input")
        : (root.querySelector<HTMLInputElement>(
            "[data-details='properties'] [data-property-value]",
          ) ??
          root.querySelector<HTMLInputElement>("[data-details='properties'] input[placeholder]"));
    input?.focus();
    input?.select();
  }, [targetKey]);

  if (!details || missing) return null;

  const toScreen = (p: { x: number; y: number }) => ({
    x: p.x * viewport.zoom + viewport.x,
    y: p.y * viewport.zoom + viewport.y,
  });

  let labelsAt: { x: number; y: number } | null = null;
  let propertiesAt: { x: number; y: number };
  if (node) {
    const center = toScreen(node.position);
    const outer = nodeOuterRadius(resolvedNodeStyle(doc, node)) * viewport.zoom;
    labelsAt = { x: center.x, y: center.y - outer - GAP };
    propertiesAt = { x: center.x, y: center.y + outer + GAP };
  } else if (relationship) {
    const geometry = computeRelationshipGeometry(doc, relationship, relationshipBundles(doc));
    if (!geometry) return null;
    const anchor = toScreen(geometry.labelPosition);
    const typeHeight = resolvedRelationshipStyle(doc, relationship).typeFontSize * 1.4;
    propertiesAt = { x: anchor.x, y: anchor.y + (typeHeight / 2) * viewport.zoom + GAP + 6 };
  } else {
    return null;
  }

  const close = () => {
    // Lämna fältet först, så att det som står där sparas.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setDetails(null);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: fångar bara Esc och fokus som bubblar upp från fälten i rutorna
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
      onPointerDownCapture={() => {
        pointerInside.current = true;
      }}
      onPointerUpCapture={() => {
        pointerInside.current = false;
      }}
      onBlur={(e) => {
        // Fokus lämnade rutorna helt (Tab förbi sista fältet, klick i sidopanelen): klart.
        const next = e.relatedTarget;
        const staysInside =
          pointerInside.current ||
          (next instanceof Element &&
            (rootRef.current?.contains(next) || next.closest("[data-testid='inline-editor']")));
        if (!staysInside) setDetails(null);
      }}
    >
      {node && labelsAt && (
        <fieldset
          data-details="labels"
          aria-label={t.inspector.labels}
          tabIndex={-1}
          className={CARD}
          style={{ left: labelsAt.x, top: labelsAt.y, transform: "translate(-50%, -100%)" }}
        >
          <h3 className={HEADING}>{t.inspector.labels}</h3>
          <LabelsEditor nodes={[node]} />
        </fieldset>
      )}
      <fieldset
        data-details="properties"
        aria-label={t.inspector.properties}
        tabIndex={-1}
        className={`${CARD} gb-scroll max-h-[45%] overflow-y-auto`}
        style={{ left: propertiesAt.x, top: propertiesAt.y, transform: "translateX(-50%)" }}
      >
        <h3 className={HEADING}>{t.inspector.properties}</h3>
        {node ? (
          <PropertiesEditor
            refs={[{ kind: "node", id: node.id }]}
            propertySets={[node.properties]}
            caption={{
              keys: [node.captionKey],
              onToggle: (key, checked) => setCaptionKey([node.id], checked ? key : null),
            }}
          />
        ) : (
          relationship && (
            <PropertiesEditor
              refs={[{ kind: "relationship", id: relationship.id }]}
              propertySets={[relationship.properties]}
            />
          )
        )}
      </fieldset>
    </div>
  );
}
