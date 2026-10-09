import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { t } from "@/i18n/sv";
import { DEFAULT_NOTE } from "@/model/defaults";
import {
  boxesIntersect,
  boxFromPoints,
  circleIntersectsBox,
  distance,
  screenToCanvas,
  snapToPoints,
  sub,
  zoomAt,
} from "@/model/geometry";
import type { Box, ElementRef, Id, Point } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import {
  elementBox,
  getElement,
  imageBox,
  isElementLocked,
  isElementVisible,
  isSelectable,
  noteBox,
  parseRefKey,
  refKey,
  relationshipBundles,
  resolvedNodeStyle,
} from "@/store/selectors";
import { type DragState, useUiStore } from "@/store/uiStore";
import { createNodeAt, createNoteAt, createRelationship, movableSelection } from "./actions";
import { InlineEditor } from "./InlineEditor";
import { addImageFromFile, imageFilesFrom } from "./images";
import { NOTE_PADDING } from "./render/NoteView";
import { computeRelationshipGeometry, Scene, type SceneOverrides } from "./render/Scene";
import { type Handle, handlePosition } from "./render/SelectionBox";

const DRAG_THRESHOLD_PX = 4;
const SNAP_TOLERANCE_PX = 8;

type Gesture =
  | { type: "pan"; startScreen: Point; startViewport: { x: number; y: number } }
  | {
      type: "maybe-move";
      clicked: ElementRef;
      refs: ElementRef[];
      startCanvas: Point;
      startScreen: Point;
      wasSelected: boolean;
    }
  | { type: "move"; refs: ElementRef[]; primary: ElementRef | null; startCanvas: Point }
  | { type: "relationship"; fromId: Id; startScreen: Point; moved: boolean }
  | { type: "marquee"; start: Point; additive: boolean }
  | {
      type: "resize";
      ref: ElementRef;
      handle: Handle;
      startBox: Box;
      startCanvas: Point;
      aspect: number | null;
    }
  | { type: "note"; start: Point };

function hitTarget(target: EventTarget | null): {
  ref: ElementRef | null;
  part: string | null;
  handle: Handle | null;
} {
  const el = target instanceof Element ? target.closest("[data-ref]") : null;
  if (!el) return { ref: null, part: null, handle: null };
  const key = el.getAttribute("data-ref");
  return {
    ref: key ? parseRefKey(key) : null,
    part: el.getAttribute("data-part"),
    handle: el.getAttribute("data-handle") as Handle | null,
  };
}

function resizeBox(start: Box, handle: Handle, delta: Point, aspect: number | null): Box {
  let { x, y, w, h } = start;
  if (handle.includes("e")) w = start.w + delta.x;
  if (handle.includes("s")) h = start.h + delta.y;
  if (handle.includes("w")) {
    w = start.w - delta.x;
    x = start.x + delta.x;
  }
  if (handle.includes("n")) {
    h = start.h - delta.y;
    y = start.y + delta.y;
  }
  w = Math.max(20, w);
  h = Math.max(20, h);
  if (aspect) {
    const onlyHorizontal = handle === "e" || handle === "w";
    const onlyVertical = handle === "n" || handle === "s";
    if (onlyVertical) w = h * aspect;
    else if (onlyHorizontal) h = w / aspect;
    else if (w / h > aspect) w = h * aspect;
    else h = w / aspect;
    if (handle.includes("w")) x = start.x + start.w - w;
    if (handle.includes("n")) y = start.y + start.h - h;
  }
  return { x, y, w, h };
}

export function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const size = useElementSize(svgRef);
  const doc = useDocumentStore((s) => s.doc);
  const viewport = useUiStore((s) => s.viewport);
  const setViewport = useUiStore((s) => s.setViewport);
  const selection = useUiStore((s) => s.selection);
  const drag = useUiStore((s) => s.drag);
  const setDrag = useUiStore((s) => s.setDrag);
  const editing = useUiStore((s) => s.editing);
  const tool = useUiStore((s) => s.tool);
  const spacePressed = useUiStore((s) => s.spacePressed);
  const gesture = useRef<Gesture | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const selectedKeys = useMemo(() => new Set(selection.map(refKey)), [selection]);

  const toCanvas = useCallback((e: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    const vp = useUiStore.getState().viewport;
    return screenToCanvas(vp, {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    });
  }, []);

  // ---------- Hjul: zoom (ctrl/cmd) eller panorering ----------
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const vp = useUiStore.getState().viewport;
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01);
        useUiStore
          .getState()
          .setViewport(zoomAt(vp, { x: e.clientX - rect.left, y: e.clientY - rect.top }, factor));
      } else {
        useUiStore.getState().setViewport({ ...vp, x: vp.x - e.deltaX, y: vp.y - e.deltaY });
      }
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  // ---------- Klistra in bild ----------
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      )
        return;
      const files = imageFilesFrom(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      const vp = useUiStore.getState().viewport;
      const center = screenToCanvas(vp, { x: size.w / 2, y: size.h / 2 });
      for (const file of files) void addImageFromFile(file, center);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [size.w, size.h]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    const files = imageFilesFrom(e.dataTransfer);
    const point = toCanvas(e);
    files.forEach((file, i) => {
      void addImageFromFile(file, { x: point.x + i * 30, y: point.y + i * 30 });
    });
  };

  // ---------- Pekare ----------
  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const ui = useUiStore.getState();
    const docState = useDocumentStore.getState();
    const currentDoc = docState.doc;
    const screen = { x: e.clientX, y: e.clientY };
    const canvasPoint = toCanvas(e);
    const { ref, part, handle } = hitTarget(e.target);

    if (ui.editing) {
      // Blur på textarean committar; låt klicket fortsätta.
      (document.activeElement as HTMLElement | null)?.blur?.();
    }

    const wantsPan = e.button === 1 || ui.spacePressed || ui.tool === "pan";
    if (wantsPan) {
      e.preventDefault();
      gesture.current = {
        type: "pan",
        startScreen: screen,
        startViewport: { x: ui.viewport.x, y: ui.viewport.y },
      };
      svgRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    svgRef.current?.setPointerCapture(e.pointerId);

    if (ui.tool === "note") {
      gesture.current = { type: "note", start: canvasPoint };
      return;
    }

    if (ref && part === "handle" && handle) {
      const box = elementBox(currentDoc, ref);
      if (!box || isElementLocked(currentDoc, ref)) return;
      const aspect = ref.kind === "image" && !e.shiftKey ? box.w / box.h : null;
      gesture.current = {
        type: "resize",
        ref,
        handle,
        startBox: box,
        startCanvas: canvasPoint,
        aspect,
      };
      return;
    }

    if (ref && part === "halo" && ref.kind === "node") {
      if (!isSelectable(currentDoc, ref)) return;
      gesture.current = { type: "relationship", fromId: ref.id, startScreen: screen, moved: false };
      setDrag({ kind: "relationship", fromId: ref.id, to: canvasPoint, targetId: null });
      return;
    }

    if (ref && isSelectable(currentDoc, ref)) {
      if (e.shiftKey) {
        ui.toggleSelected(ref);
        return;
      }
      const wasSelected = ui.isSelected(ref);
      if (!wasSelected) ui.setSelection([ref]);
      const refs = movableSelection();
      gesture.current = {
        type: "maybe-move",
        clicked: ref,
        refs,
        startCanvas: canvasPoint,
        startScreen: screen,
        wasSelected,
      };
      return;
    }

    // Tom yta (eller låst element): ram-markering
    if (!e.shiftKey) ui.clearSelection();
    gesture.current = { type: "marquee", start: canvasPoint, additive: e.shiftKey };
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g) return;
    const ui = useUiStore.getState();
    const currentDoc = useDocumentStore.getState().doc;
    const canvasPoint = toCanvas(e);
    const screen = { x: e.clientX, y: e.clientY };

    switch (g.type) {
      case "pan": {
        const vp = ui.viewport;
        setViewport({
          ...vp,
          x: g.startViewport.x + (screen.x - g.startScreen.x),
          y: g.startViewport.y + (screen.y - g.startScreen.y),
        });
        return;
      }
      case "maybe-move": {
        if (distance(screen, g.startScreen) < DRAG_THRESHOLD_PX) return;
        if (g.refs.length === 0) return;
        gesture.current = {
          type: "move",
          refs: g.refs,
          primary: g.clicked.kind === "node" ? g.clicked : null,
          startCanvas: g.startCanvas,
        };
        return onPointerMove(e);
      }
      case "move": {
        let delta = sub(canvasPoint, g.startCanvas);
        let guides: { axis: "x" | "y"; value: number }[] = [];
        if (g.primary) {
          const node = currentDoc.nodes[g.primary.id];
          if (node) {
            const movingKeys = new Set(g.refs.map(refKey));
            const others = Object.values(currentDoc.nodes)
              .filter(
                (n) =>
                  !movingKeys.has(`node:${n.id}`) &&
                  isElementVisible(currentDoc, { kind: "node", id: n.id }),
              )
              .map((n) => n.position);
            const target = { x: node.position.x + delta.x, y: node.position.y + delta.y };
            const snapped = snapToPoints(target, others, SNAP_TOLERANCE_PX / ui.viewport.zoom);
            delta = sub(snapped.position, node.position);
            guides = snapped.guides;
          }
        }
        setDrag({ kind: "move", delta, guides });
        return;
      }
      case "relationship": {
        if (!g.moved && distance(screen, g.startScreen) >= DRAG_THRESHOLD_PX) g.moved = true;
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const hit = hitTarget(under);
        const targetId =
          hit.ref?.kind === "node" && isSelectable(currentDoc, hit.ref) ? hit.ref.id : null;
        setDrag({ kind: "relationship", fromId: g.fromId, to: canvasPoint, targetId });
        return;
      }
      case "marquee":
        setDrag({ kind: "marquee", from: g.start, to: canvasPoint });
        return;
      case "resize": {
        const delta = sub(canvasPoint, g.startCanvas);
        const aspect =
          g.ref.kind === "image" && !e.shiftKey ? (g.aspect ?? g.startBox.w / g.startBox.h) : null;
        setDrag({
          kind: "resize",
          ref: g.ref,
          box: resizeBox(g.startBox, g.handle, delta, aspect),
        });
        return;
      }
      case "note":
        setDrag({ kind: "note", from: g.start, to: canvasPoint });
        return;
    }
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    gesture.current = null;
    svgRef.current?.releasePointerCapture(e.pointerId);
    if (!g) return;
    const ui = useUiStore.getState();
    const docState = useDocumentStore.getState();
    const currentDoc = docState.doc;
    const currentDrag = ui.drag;
    setDrag(null);
    const canvasPoint = toCanvas(e);

    switch (g.type) {
      case "maybe-move":
        // Klick utan drag på redan markerat element: markera bara det.
        if (g.wasSelected && !e.shiftKey) ui.setSelection([g.clicked]);
        return;
      case "move":
        if (
          currentDrag?.kind === "move" &&
          (currentDrag.delta.x !== 0 || currentDrag.delta.y !== 0)
        ) {
          docState.moveElements(g.refs, currentDrag.delta);
        }
        return;
      case "relationship": {
        if (currentDrag?.kind !== "relationship") return;
        if (currentDrag.targetId) {
          createRelationship(g.fromId, currentDrag.targetId);
        } else if (g.moved) {
          const nodeId = createNodeAt(canvasPoint, false);
          if (nodeId) {
            createRelationship(g.fromId, nodeId, false);
            const ref: ElementRef = { kind: "node", id: nodeId };
            ui.setSelection([ref]);
            ui.setEditing(ref);
          }
        } else {
          ui.setSelection([{ kind: "node", id: g.fromId }]);
        }
        return;
      }
      case "marquee": {
        if (currentDrag?.kind !== "marquee") return;
        const box = boxFromPoints(currentDrag.from, currentDrag.to);
        if (box.w < 2 && box.h < 2) return;
        const hits: ElementRef[] = [];
        for (const node of Object.values(currentDoc.nodes)) {
          const ref: ElementRef = { kind: "node", id: node.id };
          if (
            isSelectable(currentDoc, ref) &&
            circleIntersectsBox(node.position, resolvedNodeStyle(currentDoc, node).radius, box)
          )
            hits.push(ref);
        }
        const nodeIds = new Set(hits.map((h) => h.id));
        for (const rel of Object.values(currentDoc.relationships)) {
          const ref: ElementRef = { kind: "relationship", id: rel.id };
          if (nodeIds.has(rel.fromId) && nodeIds.has(rel.toId) && isSelectable(currentDoc, ref))
            hits.push(ref);
        }
        for (const note of Object.values(currentDoc.notes)) {
          const ref: ElementRef = { kind: "note", id: note.id };
          if (isSelectable(currentDoc, ref) && boxesIntersect(noteBox(note), box)) hits.push(ref);
        }
        for (const image of Object.values(currentDoc.images)) {
          const ref: ElementRef = { kind: "image", id: image.id };
          if (isSelectable(currentDoc, ref) && boxesIntersect(imageBox(image), box)) hits.push(ref);
        }
        ui.setSelection(g.additive ? [...ui.selection, ...hits] : hits);
        return;
      }
      case "resize":
        if (currentDrag?.kind === "resize") docState.setElementBox(g.ref, currentDrag.box);
        return;
      case "note": {
        const box =
          currentDrag?.kind === "note" ? boxFromPoints(currentDrag.from, currentDrag.to) : null;
        const finalBox =
          box && box.w > 20 && box.h > 20
            ? box
            : { x: g.start.x, y: g.start.y, w: DEFAULT_NOTE.size.w, h: DEFAULT_NOTE.size.h };
        createNoteAt(finalBox);
        ui.setTool("select");
        return;
      }
      case "pan":
        return;
    }
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const ui = useUiStore.getState();
    const currentDoc = useDocumentStore.getState().doc;
    const { ref } = hitTarget(e.target);
    if (ref && isSelectable(currentDoc, ref)) {
      if (ref.kind === "image") return;
      ui.setSelection([ref]);
      ui.setEditing(ref);
      return;
    }
    if (ui.tool === "select" && !ref) {
      createNodeAt(toCanvas(e));
    }
  };

  // ---------- Overrides under drag ----------
  const overrides = useMemo<SceneOverrides | undefined>(() => {
    if (!drag) return undefined;
    if (drag.kind === "move") {
      const positions = new Map<string, Point>();
      for (const ref of selection) {
        if (ref.kind === "relationship" || isElementLocked(doc, ref)) continue;
        const el = getElement(doc, ref);
        if (!el || !("position" in el)) continue;
        positions.set(refKey(ref), {
          x: el.position.x + drag.delta.x,
          y: el.position.y + drag.delta.y,
        });
      }
      return { positions };
    }
    if (drag.kind === "resize") {
      return { boxes: new Map([[refKey(drag.ref), drag.box]]) };
    }
    return undefined;
  }, [drag, selection, doc]);

  const visibleCanvasBox: Box = {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    w: size.w / viewport.zoom,
    h: size.h / viewport.zoom,
  };

  const isEmpty =
    Object.keys(doc.nodes).length === 0 &&
    Object.keys(doc.notes).length === 0 &&
    Object.keys(doc.images).length === 0;

  const cursor =
    tool === "pan" || spacePressed
      ? drag || gesture.current?.type === "pan"
        ? "grabbing"
        : "grab"
      : tool === "note"
        ? "crosshair"
        : "default";

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-canvas"
      data-testid="canvas-container"
    >
      <svg
        ref={svgRef}
        data-testid="canvas"
        className="block h-full w-full touch-none select-none"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={t.app.title}
      >
        <title>{doc.name}</title>
        <defs>
          <pattern id="gb-grid" width={20} height={20} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.8} fill="var(--color-grid)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={doc.style.background} />
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
          <rect
            x={visibleCanvasBox.x}
            y={visibleCanvasBox.y}
            width={visibleCanvasBox.w}
            height={visibleCanvasBox.h}
            fill="url(#gb-grid)"
            style={{ pointerEvents: "none" }}
          />
          <Scene
            doc={doc}
            overrides={overrides}
            interactive
            editing={editing}
            selectedKeys={selectedKeys}
            highlightNodeId={drag?.kind === "relationship" ? drag.targetId : null}
            zoom={viewport.zoom}
            canResize={(ref) => !isElementLocked(doc, ref)}
          />
          <DragOverlay drag={drag} zoom={viewport.zoom} visible={visibleCanvasBox} />
          {editing && <EditorHost editing={editing} overrides={overrides} zoom={viewport.zoom} />}
        </g>
      </svg>
      {dropActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-4 border-accent border-dashed bg-accent/5 text-accent">
          {t.canvas.dropImageHint}
        </div>
      )}
      {isEmpty && !editing && !dropActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-text-muted">
          {t.canvas.emptyHint}
        </div>
      )}
    </div>
  );
}

function DragOverlay({ drag, zoom, visible }: { drag: DragState; zoom: number; visible: Box }) {
  const doc = useDocumentStore((s) => s.doc);
  if (!drag) return null;
  if (drag.kind === "marquee" || drag.kind === "note") {
    const box = boxFromPoints(drag.from, drag.to);
    return (
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        fill={drag.kind === "note" ? "rgba(255,245,157,0.5)" : "var(--color-accent)"}
        fillOpacity={drag.kind === "note" ? 1 : 0.08}
        stroke="var(--color-accent)"
        strokeWidth={1 / zoom}
        strokeDasharray={`${4 / zoom} ${3 / zoom}`}
        style={{ pointerEvents: "none" }}
      />
    );
  }
  if (drag.kind === "relationship") {
    const from = doc.nodes[drag.fromId];
    if (!from) return null;
    const target = drag.targetId ? doc.nodes[drag.targetId] : undefined;
    const to = target ? target.position : drag.to;
    return (
      <line
        x1={from.position.x}
        y1={from.position.y}
        x2={to.x}
        y2={to.y}
        stroke="var(--color-accent)"
        strokeWidth={3 / zoom}
        strokeDasharray={`${8 / zoom} ${5 / zoom}`}
        style={{ pointerEvents: "none" }}
      />
    );
  }
  if (drag.kind === "move" && drag.guides.length > 0) {
    return (
      <g style={{ pointerEvents: "none" }}>
        {drag.guides.map((g) =>
          g.axis === "x" ? (
            <line
              key={`x${g.value}`}
              x1={g.value}
              y1={visible.y}
              x2={g.value}
              y2={visible.y + visible.h}
              stroke="var(--color-accent)"
              strokeWidth={1 / zoom}
              strokeDasharray={`${4 / zoom} ${4 / zoom}`}
            />
          ) : (
            <line
              key={`y${g.value}`}
              x1={visible.x}
              y1={g.value}
              x2={visible.x + visible.w}
              y2={g.value}
              stroke="var(--color-accent)"
              strokeWidth={1 / zoom}
              strokeDasharray={`${4 / zoom} ${4 / zoom}`}
            />
          ),
        )}
      </g>
    );
  }
  return null;
}

function EditorHost({
  editing,
  overrides,
  zoom,
}: {
  editing: ElementRef;
  overrides?: SceneOverrides;
  zoom: number;
}) {
  const doc = useDocumentStore((s) => s.doc);
  const el = getElement(doc, editing);
  if (!el) return null;
  switch (editing.kind) {
    case "node": {
      const node = doc.nodes[editing.id];
      if (!node) return null;
      const style = resolvedNodeStyle(doc, node);
      const r = style.radius;
      const w = r * 2 * 0.9;
      const h = Math.max(style.captionFontSize * 1.3 * 3, r);
      return (
        <InlineEditor
          key={editing.id}
          doc={doc}
          target={editing}
          box={{ x: node.position.x - w / 2, y: node.position.y - h / 2, w, h }}
          fontSize={style.captionFontSize}
          color={style.captionColor}
          align="center"
          zoom={zoom}
        />
      );
    }
    case "relationship": {
      const rel = doc.relationships[editing.id];
      if (!rel) return null;
      const geometry = computeRelationshipGeometry(doc, rel, relationshipBundles(doc), overrides);
      if (!geometry) return null;
      const style = { ...doc.style.relationship, ...rel.style };
      const w = 180;
      const h = style.typeFontSize * 1.5 + 6;
      return (
        <InlineEditor
          key={editing.id}
          doc={doc}
          target={editing}
          box={{ x: geometry.labelPosition.x - w / 2, y: geometry.labelPosition.y - h / 2, w, h }}
          fontSize={style.typeFontSize}
          color={style.typeColor}
          align="center"
          zoom={zoom}
        />
      );
    }
    case "note": {
      const note = doc.notes[editing.id];
      if (!note) return null;
      const box = noteBox(note);
      const pad = NOTE_PADDING - 3;
      return (
        <InlineEditor
          key={editing.id}
          doc={doc}
          target={editing}
          box={{ x: box.x + pad, y: box.y + pad, w: box.w - pad * 2, h: box.h - pad * 2 }}
          fontSize={note.fontSize}
          color={note.textColor}
          align={note.align}
          zoom={zoom}
        />
      );
    }
    default:
      return null;
  }
}

export { handlePosition };
