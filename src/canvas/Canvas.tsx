import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IconPlus } from "@/components/icons";
import { useElementSize } from "@/hooks/useElementSize";
import { useSettledValue } from "@/hooks/useSettledValue";
import { t } from "@/i18n";
import { textOn } from "@/model/color";
import { DEFAULT_NOTE } from "@/model/defaults";
import {
  boxesIntersect,
  boxFromPoints,
  circleIntersectsBox,
  distance,
  screenToCanvas,
  snapToPoints,
  sub,
} from "@/model/geometry";
import type { Box, ElementRef, Id, Point } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import {
  attachedNoteMoves,
  elementBox,
  getElement,
  imageBox,
  isElementLocked,
  isElementVisible,
  isSelectable,
  nodeOuterRadius,
  noteBox,
  parseRefKey,
  refKey,
  relationshipBundles,
  resolvedNodeStyle,
} from "@/store/selectors";
import { type DragState, useUiStore } from "@/store/uiStore";
import {
  attachNotes,
  createNodeAt,
  createNoteAt,
  createRelationship,
  movableSelection,
  startEditing,
} from "./actions";
import { DetailsEditor } from "./DetailsEditor";
import { InlineEditor } from "./InlineEditor";
import { addImageFromFile, imageFilesFrom } from "./images";
import { NOTE_PADDING } from "./render/NoteView";
import { computeRelationshipGeometry, Scene, type SceneOverrides } from "./render/Scene";
import { type Handle, handlePosition } from "./render/SelectionBox";
import { cancelViewportAnimation, zoomSmoothlyBy } from "./viewportAnimation";

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

/** Textfältet för redigering på plats har vit bakgrund; texten i det ska gå att läsa mot den. */
const EDITOR_BACKGROUND = "#ffffff";

/** Zoomhastighet per pixel hjulrörelse, och största rörelse som räknas per hjulhändelse. */
const WHEEL_ZOOM_SPEED = 0.0022;
const WHEEL_ZOOM_MAX_DELTA = 100;
/** Samma för nypning på styrplatta, som rapporteras i mycket mindre steg. */
const PINCH_ZOOM_SPEED = 0.01;
const PINCH_ZOOM_MAX_DELTA = 22;
/** Så länge ska vyn ha stått still innan innehållet ritas om i den nya skalan. */
const VIEW_SETTLE_MS = 120;

export function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  // Ritytans plats och storlek mäts på behållaren: själva svg-elementet kan tillfälligt vara
  // förskjutet och skalat medan vyn rör sig (se `committed` nedan).
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const doc = useDocumentStore((s) => s.doc);
  const viewport = useUiStore((s) => s.viewport);
  const setViewport = useUiStore((s) => s.setViewport);
  const selection = useUiStore((s) => s.selection);
  const drag = useUiStore((s) => s.drag);
  const setDrag = useUiStore((s) => s.setDrag);
  const editing = useUiStore((s) => s.editing);
  const detailsRef = useUiStore((s) => s.details?.ref ?? null);
  const detailsKey = detailsRef ? refKey(detailsRef) : null;
  const tool = useUiStore((s) => s.tool);
  const spacePressed = useUiStore((s) => s.spacePressed);
  const gesture = useRef<Gesture | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const selectedKeys = useMemo(() => new Set(selection.map(refKey)), [selection]);
  // Medan vyn rör sig (zoom, panorering) ritas innehållet inte om alls: webbläsaren flyttar och
  // skalar bara den färdigritade ytan, vilket går på grafikkortet. Först när vyn stått still en
  // kort stund "landar" den (`committed`) och innehållet ritas om skarpt i den nya skalan. Annars
  // räknar webbläsaren om all text på ritytan i varje bildruta, och zoomen hackar i stora modeller.
  const committed = useSettledValue(viewport, VIEW_SETTLE_MS);
  const moving = committed !== viewport;
  const scale = viewport.zoom / committed.zoom;
  const glide = moving
    ? `translate(${viewport.x - scale * committed.x}px, ${viewport.y - scale * committed.y}px) scale(${scale})`
    : undefined;
  const canResize = useCallback((ref: ElementRef) => !isElementLocked(doc, ref), [doc]);

  const toCanvas = useCallback((e: { clientX: number; clientY: number }): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    const vp = useUiStore.getState().viewport;
    return screenToCanvas(vp, {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    });
  }, []);

  // ---------- Hjul: zoom ----------
  // Hjulet zoomar alltid, utan att någon tangent hålls nere. Ytan flyttas genom att dra i den.
  useEffect(() => {
    // Lyssnar på behållaren: svg-elementet täcker inte hela ytan medan en utzoomning glider.
    const svg = containerRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      // Rullning i redigeringsrutan (lång egenskapslista) ska rulla rutan, inte zooma.
      if (e.target instanceof Element && e.target.closest("[data-details-editor]")) return;
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      // Mushjul kan rapportera rader eller sidor i stället för pixlar.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1;
      // Nypning på styrplatta (och Ctrl+hjul) rapporteras med Ctrl nedtryckt och i mycket små
      // steg; vanlig hjulrörelse kommer i stora steg (ett hack ≈ 100 px). Båda ger ca 25 % per
      // hack respektive tydlig nypning, och taket hindrar ett snabbsnurrande hjul från att hoppa.
      const pinch = e.ctrlKey || e.metaKey;
      const speed = pinch ? PINCH_ZOOM_SPEED : WHEEL_ZOOM_SPEED;
      const limit = pinch ? PINCH_ZOOM_MAX_DELTA : WHEEL_ZOOM_MAX_DELTA;
      const delta = Math.max(-limit, Math.min(limit, e.deltaY * unit));
      zoomSmoothlyBy(Math.exp(-delta * speed), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
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
    // Ett eget grepp tar över från en pågående glidning till en hel vy ("Fit to content").
    cancelViewportAnimation();
    // Ett klick på ritytan flyttar inte markören ur ett fält i sidopanelen av sig självt. Lämna
    // fältet först, så att det som står där sparas innan markeringen ändras.
    const active = document.activeElement;
    if (active instanceof HTMLElement && !svgRef.current?.contains(active)) active.blur();
    // Ett klick på ritytan avslutar redigeringen av labels och egenskaper.
    if (useUiStore.getState().details) useUiStore.getState().setDetails(null);
    const ui = useUiStore.getState();
    const docState = useDocumentStore.getState();
    const currentDoc = docState.doc;
    const screen = { x: e.clientX, y: e.clientY };
    const canvasPoint = toCanvas(e);
    const { ref, part, handle } = hitTarget(e.target);

    // Läget "peka ut vad anteckningen ska knytas till": ett klick på en nod eller relation knyter
    // den dit, ett klick någon annanstans avbryter. Inget annat händer med klicket.
    if (ui.attachingNotes) {
      const target = ref && (ref.kind === "node" || ref.kind === "relationship") ? ref : null;
      if (target && isElementVisible(currentDoc, target)) {
        attachNotes(ui.attachingNotes, {
          kind: target.kind as "node" | "relationship",
          id: target.id,
        });
        ui.showToast(t.toasts.noteAttached);
      } else {
        ui.setAttachingNotes(null);
      }
      return;
    }

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

    // Tom yta (eller låst element): Ctrl/Cmd+dra eller Shift+dra = ram-markering, annars flyttas
    // hela ytan. Ctrl/Cmd markerar det som ligger i ramen; Shift lägger till i det som redan är
    // markerat.
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      gesture.current = { type: "marquee", start: canvasPoint, additive: e.shiftKey };
      return;
    }
    ui.clearSelection();
    gesture.current = {
      type: "pan",
      startScreen: screen,
      startViewport: { x: ui.viewport.x, y: ui.viewport.y },
    };
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
            circleIntersectsBox(
              node.position,
              nodeOuterRadius(resolvedNodeStyle(currentDoc, node)),
              box,
            )
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
    // Pekarfångst gör att e.target kan vara själva ritytan; slå upp elementet under markören.
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const { ref } = hitTarget(under);
    if (ref && isSelectable(currentDoc, ref)) {
      if (ref.kind === "image") return;
      ui.setSelection([ref]);
      // Dubbelklick på labels eller egenskaper sätter markören där; annars i rubriken.
      const part = under?.closest("[data-part]")?.getAttribute("data-part");
      startEditing(
        ref,
        part === "label-box" ? "labels" : part === "property-background" ? "properties" : "caption",
      );
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
      // Anteckningar som är knutna till de noder som dras följer med redan under dragningen.
      const moved = selection.filter((r) => positions.has(refKey(r)));
      const followers = attachedNoteMoves(
        doc,
        new Set(moved.filter((r) => r.kind === "node").map((r) => r.id)),
        drag.delta,
        new Set(moved.filter((r) => r.kind === "note").map((r) => r.id)),
      );
      for (const [noteId, move] of followers) {
        const note = doc.notes[noteId];
        if (note) {
          positions.set(`note:${noteId}`, {
            x: note.position.x + move.x,
            y: note.position.y + move.y,
          });
        }
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

  const attaching = useUiStore((s) => s.attachingNotes !== null);
  const cursor = attaching
    ? "crosshair"
    : tool === "pan" || spacePressed
      ? drag || gesture.current?.type === "pan"
        ? "grabbing"
        : "grab"
      : tool === "note"
        ? "crosshair"
        : "default";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: släppyta för filer; samma funktion finns via knappen "Bild…"
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: doc.style.background }}
      data-testid="canvas-container"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          if (!dropActive) setDropActive(true);
        }
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={onDrop}
    >
      <svg
        ref={svgRef}
        data-testid="canvas"
        className="block h-full w-full touch-none select-none overflow-visible"
        style={{ cursor, transform: glide, transformOrigin: "0 0" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={t.app.title}
      >
        <title>{doc.name}</title>
        <rect width="100%" height="100%" fill={doc.style.background} />
        <g transform={`translate(${committed.x} ${committed.y}) scale(${committed.zoom})`}>
          <Scene
            doc={doc}
            overrides={overrides}
            interactive
            editing={editing}
            selectedKeys={selectedKeys}
            highlightNodeId={drag?.kind === "relationship" ? drag.targetId : null}
            detailsKey={detailsKey}
            zoom={committed.zoom}
            canResize={canResize}
          />
          <DragOverlay drag={drag} zoom={committed.zoom} visible={visibleCanvasBox} />
          {editing && <EditorHost editing={editing} overrides={overrides} zoom={committed.zoom} />}
        </g>
      </svg>
      <DetailsEditor viewport={viewport} />
      {attaching && (
        <div
          data-testid="attach-hint"
          className="pointer-events-none absolute top-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-strong px-4 py-2 font-medium text-[15px] text-on-strong shadow-pop"
        >
          {t.canvas.attachHint}
        </div>
      )}
      {dropActive && (
        <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-2xl border-2 border-accent border-dashed bg-accent/5 font-medium text-[16px] text-accent">
          {t.canvas.dropImageHint}
        </div>
      )}
      {isEmpty && !editing && !dropActive && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-[16px] text-text-muted">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border-strong border-dashed">
            <IconPlus size={22} />
          </span>
          {t.canvas.emptyHint}
          <span className="text-[14px] opacity-80">{t.canvas.emptyHintNote}</span>
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
        fill={drag.kind === "note" ? "rgba(255,214,10,0.5)" : "var(--color-accent)"}
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
          color={textOn(EDITOR_BACKGROUND, style.captionColor)}
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
          color={textOn(EDITOR_BACKGROUND, style.typeColor)}
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
          color={textOn(EDITOR_BACKGROUND, note.textColor)}
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
