import { t } from "@/i18n";
import { arrange, countCrossings, type LayoutEdge, type LayoutNode } from "@/model/autoLayout";
import { unionBoxes } from "@/model/geometry";
import type { Box, GraphDocument, Id, Point, Size } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import {
  isSelectable,
  noteBox,
  resolvedRelationshipStyle,
  visibleNotes,
  visibleRelationships,
} from "@/store/selectors";
import { useUiStore } from "@/store/uiStore";
import { fitToContent } from "./actions";
import { drawnNodeBoxes } from "./render/bounds";
import { measureTextWidth, propertyLines } from "./render/text";

/** Minsta luft mellan två noders ritade ytor efter en automatisk placering. */
const MIN_GAP = 220;
/** Luft på var sida om relationens text, mellan texten och noderna (rymmer också pilspetsen). */
const LABEL_MARGIN = 70;

/** Så länge glider noderna till sina nya platser. */
const GLIDE_MS = 450;
/** Större grafer än så flyttas direkt; att rita om varje bildruta blir för tungt. */
const GLIDE_MAX_NODES = 80;

export interface ArrangePlan {
  nodes: Record<Id, Point>;
  notes: Record<Id, Point>;
  crossingsBefore: number;
  crossingsAfter: number;
}

/**
 * Räknar fram en ny placering som minimerar antalet relationer som korsar varandra. Gäller de
 * markerade noderna om minst två är markerade, annars alla synliga, olåsta noder. Den nya
 * bilden hamnar mitt på samma ställe som den gamla, och knutna anteckningar följer med.
 * Ger null när det inte finns något att arrangera.
 */
export function planArrangement(doc: GraphDocument, selectedNodeIds: Id[]): ArrangePlan | null {
  const selected = new Set(selectedNodeIds);
  const candidates = Object.values(doc.nodes).filter((node) =>
    isSelectable(doc, { kind: "node", id: node.id }),
  );
  const chosen = selected.size >= 2 ? candidates.filter((n) => selected.has(n.id)) : candidates;
  if (chosen.length < 2) return null;
  const ids = new Set(chosen.map((n) => n.id));

  // Varje nods ritade yta (kant, labels, egenskaper) i förhållande till dess mittpunkt. Synliga
  // anteckningar som är knutna till noden räknas in: de följer med noden och ska inte hamna
  // ovanpå en annan nod.
  const notesOf = new Map<Id, Box[]>();
  for (const note of visibleNotes(doc)) {
    if (note.attachedTo?.kind !== "node") continue;
    const frame = note.borderWidth;
    const box = noteBox(note);
    const list = notesOf.get(note.attachedTo.id) ?? [];
    list.push({ x: box.x - frame, y: box.y - frame, w: box.w + frame * 2, h: box.h + frame * 2 });
    notesOf.set(note.attachedTo.id, list);
  }
  const layoutNodes: LayoutNode[] = chosen.map((node) => {
    const box = unionBoxes([...drawnNodeBoxes(doc, node), ...(notesOf.get(node.id) ?? [])]) ?? {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    };
    return {
      id: node.id,
      left: node.position.x - box.x,
      right: box.x + box.w - node.position.x,
      top: node.position.y - box.y,
      bottom: box.y + box.h - node.position.y,
    };
  });
  const relationships = visibleRelationships(doc).filter(
    (r) => ids.has(r.fromId) && ids.has(r.toId),
  );
  const edges: LayoutEdge[] = relationships.map((r) => ({ from: r.fromId, to: r.toId }));
  const current = new Map(chosen.map((node) => [node.id, node.position]));

  // Luften mellan noderna ska rymma relationens text med marginal på båda sidor, i vilken
  // riktning relationen än går. Den längsta texten bland relationerna bestämmer.
  let widestLabel = 0;
  for (const rel of relationships) {
    const style = resolvedRelationshipStyle(doc, rel);
    const lines = doc.propertiesVisible ? propertyLines(rel.properties) : [];
    widestLabel = Math.max(
      widestLabel,
      measureTextWidth(rel.type, style.typeFontSize),
      ...lines.map((line) => measureTextWidth(line, style.propertyFontSize)),
    );
  }
  const gap = Math.max(MIN_GAP, widestLabel + LABEL_MARGIN * 2);
  const arranged = arrange(layoutNodes, edges, { current, gapX: gap, gapY: gap });

  // Lägg den nya bilden mitt där den gamla låg.
  const centerOf = (points: Iterable<Point>) => {
    const all = [...points];
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
  };
  const from = centerOf(current.values());
  const to = centerOf(arranged.values());
  const nodes: Record<Id, Point> = {};
  for (const [id, p] of arranged) {
    nodes[id] = { x: Math.round(p.x - to.x + from.x), y: Math.round(p.y - to.y + from.y) };
  }

  // Knutna anteckningar följer sin nod, eller mitten av sin relation.
  const delta = (id: Id): Point => {
    const next = nodes[id];
    const previous = doc.nodes[id]?.position;
    return next && previous ? { x: next.x - previous.x, y: next.y - previous.y } : { x: 0, y: 0 };
  };
  const notes: Record<Id, Point> = {};
  for (const note of Object.values(doc.notes)) {
    const anchor = note.attachedTo;
    if (!anchor) continue;
    let move: Point;
    if (anchor.kind === "node") {
      move = delta(anchor.id);
    } else {
      const rel = doc.relationships[anchor.id];
      if (!rel) continue;
      const a = delta(rel.fromId);
      const b = delta(rel.toId);
      move = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    if (move.x !== 0 || move.y !== 0) {
      notes[note.id] = { x: note.position.x + move.x, y: note.position.y + move.y };
    }
  }

  return {
    nodes,
    notes,
    crossingsBefore: countCrossings(current, edges),
    crossingsAfter: countCrossings(new Map(Object.entries(nodes)), edges),
  };
}

/**
 * Knappen "Arrange": räknar fram en placering med färre korsande relationer och låter noderna
 * glida dit. Hittas ingen bättre placering lämnas bilden orörd. Hela flytten är ett steg att
 * ångra.
 */
export function arrangeAutomatically(viewportSize: Size): void {
  const ui = useUiStore.getState();
  if (ui.arranging) return;
  ui.setArranging(true);
  // Låt knappen visa att arbetet pågår innan uträkningen börjar (den kan ta ett par sekunder
  // för en stor graf).
  setTimeout(() => {
    try {
      const doc = useDocumentStore.getState().doc;
      const selectedNodes = useUiStore
        .getState()
        .selection.filter((r) => r.kind === "node")
        .map((r) => r.id);
      const plan = planArrangement(doc, selectedNodes);
      if (!plan) {
        useUiStore.getState().showToast(t.toasts.arrangeNothing);
        return;
      }
      if (plan.crossingsAfter >= plan.crossingsBefore) {
        useUiStore
          .getState()
          .showToast(
            plan.crossingsBefore === 0
              ? t.toasts.arrangeNoCrossings
              : t.toasts.arrangeNoImprovement(plan.crossingsBefore),
          );
        return;
      }
      glideTo(doc, plan, () => {
        useDocumentStore.getState().applyPositions({ nodes: plan.nodes, notes: plan.notes });
        useUiStore.getState().setPreviewPositions(null);
        useUiStore
          .getState()
          .showToast(t.toasts.arranged(plan.crossingsBefore, plan.crossingsAfter));
        fitToContent(viewportSize);
      });
    } finally {
      useUiStore.getState().setArranging(false);
    }
  }, 30);
}

/** Låter noder och anteckningar glida från sina nuvarande lägen till de nya, och anropar `done`. */
function glideTo(doc: GraphDocument, plan: ArrangePlan, done: () => void): void {
  const moves: { key: string; from: Point; to: Point }[] = [];
  for (const [id, to] of Object.entries(plan.nodes)) {
    const from = doc.nodes[id]?.position;
    if (from) moves.push({ key: `node:${id}`, from, to });
  }
  for (const [id, to] of Object.entries(plan.notes)) {
    const from = doc.notes[id]?.position;
    if (from) moves.push({ key: `note:${id}`, from, to });
  }
  const still =
    typeof requestAnimationFrame !== "function" ||
    Object.keys(plan.nodes).length > GLIDE_MAX_NODES ||
    (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (still) {
    done();
    return;
  }
  const started = performance.now();
  const frame = (now: number) => {
    const progress = Math.min(1, (now - started) / GLIDE_MS);
    if (progress >= 1) {
      done();
      return;
    }
    // Mjuk start och mjuk inbromsning.
    const eased = progress * progress * (3 - 2 * progress);
    const positions = new Map<string, Point>();
    for (const { key, from, to } of moves) {
      positions.set(key, {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
      });
    }
    useUiStore.getState().setPreviewPositions(positions);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
