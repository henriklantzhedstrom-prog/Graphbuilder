import { clampZoom, type Viewport, zoomAt } from "@/model/geometry";
import type { Point } from "@/model/types";
import { useUiStore } from "@/store/uiStore";

/**
 * Mjuk zoom: varje zoomsteg (hjul, knappar, tangenter) sätter ett mål, och vyn glider dit över
 * några bildrutor i stället för att hoppa. Zoomen tonas i logaritmisk skala så att rörelsen
 * känns lika snabb vid 20 % som vid 400 %.
 */

/** Tidskonstant i ms: efter den tiden återstår ca 37 % av vägen till målet. */
const TIME_CONSTANT_MS = 55;
/** Under den här skillnaden (i logaritmisk zoom resp. pixlar) räknas målet som nått. */
const ZOOM_EPSILON = 0.002;
const PAN_EPSILON = 0.5;

type Target =
  /** Zooma mot en zoomnivå med en punkt på skärmen som ligger still. */
  | { kind: "zoom"; zoom: number; anchor: Point }
  /** Glid till en hel vy (t.ex. "Fit to content"). */
  | { kind: "viewport"; viewport: Viewport };

let target: Target | null = null;
let frame: number | null = null;
let lastTime = 0;

const canAnimate = (): boolean =>
  typeof requestAnimationFrame === "function" &&
  !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);

/** Andel av återstående väg som tas på `dt` millisekunder. */
export const easeFraction = (dt: number): number => 1 - Math.exp(-dt / TIME_CONSTANT_MS);

/**
 * Ett steg mot målet. Returnerar nästa vy och om målet är nått. Ren funktion (testbar).
 */
export function stepViewport(
  current: Viewport,
  goal: Target,
  fraction: number,
): { viewport: Viewport; done: boolean } {
  if (goal.kind === "zoom") {
    const remaining = Math.log(goal.zoom / current.zoom);
    if (Math.abs(remaining) < ZOOM_EPSILON || fraction >= 1) {
      return { viewport: zoomAt(current, goal.anchor, goal.zoom / current.zoom), done: true };
    }
    return { viewport: zoomAt(current, goal.anchor, Math.exp(remaining * fraction)), done: false };
  }
  const to = goal.viewport;
  const remaining = Math.log(to.zoom / current.zoom);
  const dx = to.x - current.x;
  const dy = to.y - current.y;
  const close =
    Math.abs(remaining) < ZOOM_EPSILON && Math.abs(dx) < PAN_EPSILON && Math.abs(dy) < PAN_EPSILON;
  if (close || fraction >= 1) return { viewport: to, done: true };
  return {
    viewport: {
      zoom: current.zoom * Math.exp(remaining * fraction),
      x: current.x + dx * fraction,
      y: current.y + dy * fraction,
    },
    done: false,
  };
}

function tick(now: number): void {
  frame = null;
  if (!target) return;
  // Begränsa dt så att en fördröjd bildruta (t.ex. bakgrundsflik) inte ger ett hopp.
  const dt = Math.min(64, Math.max(1, now - lastTime));
  lastTime = now;
  const ui = useUiStore.getState();
  const { viewport, done } = stepViewport(ui.viewport, target, easeFraction(dt));
  ui.setViewport(viewport);
  if (done) target = null;
  else frame = requestAnimationFrame(tick);
}

function start(next: Target): void {
  if (!canAnimate()) {
    const ui = useUiStore.getState();
    ui.setViewport(stepViewport(ui.viewport, next, 1).viewport);
    target = null;
    return;
  }
  target = next;
  if (frame === null) {
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  }
}

/** Avbryter en pågående glidning, t.ex. när användaren börjar panorera själv. */
export function cancelViewportAnimation(): void {
  target = null;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}

/**
 * Zoomar mjukt med `factor` kring en punkt på skärmen. Flera steg i följd läggs ihop: nästa steg
 * utgår från dit zoomen är på väg, inte från där den råkar vara just nu.
 */
export function zoomSmoothlyBy(factor: number, anchor: Point): void {
  const from = target?.kind === "zoom" ? target.zoom : useUiStore.getState().viewport.zoom;
  start({ kind: "zoom", zoom: clampZoom(from * factor), anchor });
}

/** Zoomar mjukt till en bestämd nivå kring en punkt på skärmen. */
export function zoomSmoothlyTo(zoom: number, anchor: Point): void {
  start({ kind: "zoom", zoom: clampZoom(zoom), anchor });
}

/** Glider mjukt till en hel vy. */
export function moveViewportSmoothlyTo(viewport: Viewport): void {
  start({ kind: "viewport", viewport });
}
