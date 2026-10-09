import type { Box, Point, Size } from "./types";

// ---------- Vektorer ----------

export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
export const length = (a: Point): number => Math.hypot(a.x, a.y);
export const distance = (a: Point, b: Point): number => length(sub(a, b));
export const normalize = (a: Point): Point => {
  const l = length(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};
export const perpendicular = (a: Point): Point => ({ x: -a.y, y: a.x });
export const angleOf = (a: Point): number => Math.atan2(a.y, a.x);
export const fromAngle = (rad: number, r = 1): Point => ({
  x: Math.cos(rad) * r,
  y: Math.sin(rad) * r,
});
export const roundPoint = (p: Point, step = 1): Point => ({
  x: Math.round(p.x / step) * step,
  y: Math.round(p.y / step) * step,
});
export const pointsEqual = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;

// ---------- Boxar ----------

export const boxFromPoints = (a: Point, b: Point): Box => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
});

export const boxCenter = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export const circleBox = (center: Point, radius: number): Box => ({
  x: center.x - radius,
  y: center.y - radius,
  w: radius * 2,
  h: radius * 2,
});

export const rectBox = (position: Point, size: Size): Box => ({
  x: position.x,
  y: position.y,
  w: size.w,
  h: size.h,
});

export const inflate = (b: Box, by: number): Box => ({
  x: b.x - by,
  y: b.y - by,
  w: b.w + by * 2,
  h: b.h + by * 2,
});

export function unionBoxes(boxes: Box[]): Box | null {
  const first = boxes[0];
  if (!first) {
    return null;
  }
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.w;
  let maxY = first.y + first.h;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export const boxContainsPoint = (b: Box, p: Point): boolean =>
  p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

/** Sant om `inner` ligger helt inom `outer`. */
export const boxContainsBox = (outer: Box, inner: Box): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

export const boxesIntersect = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const circleIntersectsBox = (center: Point, radius: number, b: Box): boolean => {
  const cx = Math.max(b.x, Math.min(center.x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(center.y, b.y + b.h));
  return distance(center, { x: cx, y: cy }) <= radius;
};

// ---------- Viewport ----------

export interface Viewport {
  /** Skärmposition för canvas-origo */
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;

export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export const screenToCanvas = (vp: Viewport, p: Point): Point => ({
  x: (p.x - vp.x) / vp.zoom,
  y: (p.y - vp.y) / vp.zoom,
});

export const canvasToScreen = (vp: Viewport, p: Point): Point => ({
  x: p.x * vp.zoom + vp.x,
  y: p.y * vp.zoom + vp.y,
});

/** Zooma med faktorn `factor` runt skärmpunkten `anchor` så att den punkten står stilla. */
export function zoomAt(vp: Viewport, anchor: Point, factor: number): Viewport {
  const zoom = clampZoom(vp.zoom * factor);
  const k = zoom / vp.zoom;
  return {
    zoom,
    x: anchor.x - (anchor.x - vp.x) * k,
    y: anchor.y - (anchor.y - vp.y) * k,
  };
}

export function fitBoxInViewport(box: Box, viewportSize: Size, padding = 40): Viewport {
  if (box.w === 0 && box.h === 0) {
    return { x: viewportSize.w / 2 - box.x, y: viewportSize.h / 2 - box.y, zoom: 1 };
  }
  const zoom = clampZoom(
    Math.min(
      (viewportSize.w - padding * 2) / Math.max(box.w, 1),
      (viewportSize.h - padding * 2) / Math.max(box.h, 1),
      1.5,
    ),
  );
  const center = boxCenter(box);
  return {
    zoom,
    x: viewportSize.w / 2 - center.x * zoom,
    y: viewportSize.h / 2 - center.y * zoom,
  };
}

// ---------- Relationer ----------

export interface RelationshipEndpoints {
  from: Point;
  fromRadius: number;
  to: Point;
  toRadius: number;
}

export interface BundleInfo {
  /** Index i knippet av parallella relationer */
  index: number;
  /** Antal relationer i knippet */
  count: number;
  /** Sant om relationen går mot knippets kanoniska riktning (för konsekvent böjning) */
  reversed: boolean;
}

export interface RelationshipGeometry {
  /** SVG-path för linjen (utan pilspets) */
  path: string;
  /** Polygonpunkter för pilspetsen, tom sträng om oriktad */
  arrow: string;
  /** Var typ-etiketten placeras */
  labelPosition: Point;
  /** Rotation i grader för etiketten, alltid läsbar (−90..90) */
  labelAngle: number;
  /** Mittpunkt på linjen (för egenskaper m.m.) */
  midpoint: Point;
  /** Normal från linjen vid mittpunkten, för att lägga egenskaper vid sidan */
  normal: Point;
}

export const PARALLEL_SPACING = 26;
/** Hur långt från nodens kant parallella relationer hinner böja ut till sitt eget spår. */
export const PARALLEL_BEND = 30;
/** Minsta raka mittdel innan vi i stället ritar en enkel båge. */
export const PARALLEL_MIN_STRAIGHT = 20;
export const SELF_LOOP_RADIUS = 60;

const readableAngle = (rad: number): number => {
  let deg = (rad * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  if (deg < -90) deg += 180;
  return deg;
};

const arrowPolygon = (tip: Point, dir: Point, size: number): string => {
  const len = size * 2;
  const base = sub(tip, scale(dir, len));
  const side = scale(perpendicular(dir), size);
  const p1 = add(base, side);
  const p2 = sub(base, side);
  return `${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
};

export function relationshipGeometry(
  ends: RelationshipEndpoints,
  bundle: BundleInfo,
  options: { arrowSize: number; directed: boolean },
): RelationshipGeometry {
  const arrowLen = options.directed ? options.arrowSize * 2 : 0;

  if (pointsEqual(ends.from, ends.to)) {
    return selfLoopGeometry(
      ends.from,
      (ends.fromRadius + ends.toRadius) / 2,
      bundle,
      options.arrowSize,
      options.directed,
    );
  }

  const dir = normalize(sub(ends.to, ends.from));
  const offsetIndex = bundle.index - (bundle.count - 1) / 2;
  const offset = offsetIndex * PARALLEL_SPACING * (bundle.reversed ? -1 : 1);

  if (offset === 0) {
    const start = add(ends.from, scale(dir, ends.fromRadius));
    const tip = sub(ends.to, scale(dir, ends.toRadius));
    const lineEnd = sub(tip, scale(dir, arrowLen * 0.9));
    const midpoint = scale(add(start, tip), 0.5);
    return {
      path: `M ${start.x} ${start.y} L ${lineEnd.x} ${lineEnd.y}`,
      arrow: options.directed ? arrowPolygon(tip, dir, options.arrowSize) : "",
      labelPosition: midpoint,
      labelAngle: readableAngle(angleOf(dir)),
      midpoint,
      normal: perpendicular(dir),
    };
  }

  const normal = perpendicular(dir);
  const distanceBetween = distance(ends.from, ends.to);
  const straightRoom =
    distanceBetween - ends.fromRadius - ends.toRadius - PARALLEL_BEND * 2 - arrowLen;

  // Noderna ligger för nära för en rak mittdel: en mjuk båge räcker.
  if (straightRoom < PARALLEL_MIN_STRAIGHT) {
    return curvedGeometry(ends, dir, normal, offset, arrowLen, options);
  }

  // Böj av direkt vid noden, gå parallellt med mittlinjen och böj in mot målnoden i slutet.
  const offsetVec = scale(normal, offset);
  const bendStart = add(add(ends.from, scale(dir, ends.fromRadius + PARALLEL_BEND)), offsetVec);
  const bendEnd = add(
    add(ends.to, scale(dir, -(ends.toRadius + PARALLEL_BEND + arrowLen))),
    offsetVec,
  );
  const startDir = normalize(sub(bendStart, ends.from));
  const start = add(ends.from, scale(startDir, ends.fromRadius));
  const tipDir = normalize(sub(add(bendEnd, scale(dir, PARALLEL_BEND)), ends.to));
  const tip = add(ends.to, scale(tipDir, ends.toRadius));
  const arrowDir = normalize(sub(tip, bendEnd));
  const lineEnd = sub(tip, scale(arrowDir, arrowLen * 0.9));
  const k = PARALLEL_BEND * 0.55;
  const c1 = add(start, scale(startDir, k));
  const c2 = sub(bendStart, scale(dir, k));
  const c3 = add(bendEnd, scale(dir, k));
  const c4 = sub(lineEnd, scale(arrowDir, k));
  const midpoint = scale(add(bendStart, bendEnd), 0.5);
  return {
    path:
      `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${bendStart.x} ${bendStart.y}` +
      ` L ${bendEnd.x} ${bendEnd.y} C ${c3.x} ${c3.y} ${c4.x} ${c4.y} ${lineEnd.x} ${lineEnd.y}`,
    arrow: options.directed ? arrowPolygon(tip, arrowDir, options.arrowSize) : "",
    labelPosition: midpoint,
    labelAngle: readableAngle(angleOf(dir)),
    midpoint,
    normal: scale(normal, Math.sign(offset) || 1),
  };
}

/** Kvadratisk båge vars mitt ligger `offset` från den raka linjen (för noder nära varandra). */
function curvedGeometry(
  ends: RelationshipEndpoints,
  dir: Point,
  normal: Point,
  offset: number,
  arrowLen: number,
  options: { arrowSize: number; directed: boolean },
): RelationshipGeometry {
  const mid = scale(add(ends.from, ends.to), 0.5);
  const control = add(mid, scale(normal, offset * 2));
  const startDir = normalize(sub(control, ends.from));
  const start = add(ends.from, scale(startDir, ends.fromRadius));
  const endDir = normalize(sub(control, ends.to));
  const tip = add(ends.to, scale(endDir, ends.toRadius));
  const arrowDir = normalize(sub(tip, control));
  const lineEnd = sub(tip, scale(arrowDir, arrowLen * 0.9));
  const curveMid = add(scale(add(start, lineEnd), 0.25), scale(control, 0.5));
  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${lineEnd.x} ${lineEnd.y}`,
    arrow: options.directed ? arrowPolygon(tip, arrowDir, options.arrowSize) : "",
    labelPosition: curveMid,
    labelAngle: readableAngle(angleOf(dir)),
    midpoint: curveMid,
    normal: scale(normal, Math.sign(offset) || 1),
  };
}

function selfLoopGeometry(
  center: Point,
  radius: number,
  bundle: BundleInfo,
  arrowSize: number,
  directed: boolean,
): RelationshipGeometry {
  // Loopar fördelas runt noden med start rakt upp.
  const baseAngle = -Math.PI / 2 + bundle.index * (Math.PI / 4);
  const spread = Math.PI / 7;
  const loopR = SELF_LOOP_RADIUS + Math.floor(bundle.index / 8) * 30;
  const startAngle = baseAngle - spread;
  const endAngle = baseAngle + spread;
  const start = add(center, fromAngle(startAngle, radius));
  const tipPoint = add(center, fromAngle(endAngle, radius));
  const c1 = add(center, fromAngle(startAngle - spread, radius + loopR * 1.6));
  const c2 = add(center, fromAngle(endAngle + spread, radius + loopR * 1.6));
  const arrowDir = normalize(sub(tipPoint, c2));
  const lineEnd = directed ? sub(tipPoint, scale(arrowDir, arrowSize * 1.8)) : tipPoint;
  const outer = add(center, fromAngle(baseAngle, radius + loopR * 1.2));
  const normal = fromAngle(baseAngle);
  return {
    path: `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${lineEnd.x} ${lineEnd.y}`,
    arrow: directed ? arrowPolygon(tipPoint, arrowDir, arrowSize) : "",
    labelPosition: outer,
    labelAngle: 0,
    midpoint: outer,
    normal,
  };
}

// ---------- Snapplinjer ----------

export interface SnapResult {
  position: Point;
  guides: { axis: "x" | "y"; value: number }[];
}

/** Snappa `position` mot andra punkters x/y-värden inom `tolerance`. */
export function snapToPoints(position: Point, others: Point[], tolerance: number): SnapResult {
  let bestX: { value: number; dist: number } | null = null;
  let bestY: { value: number; dist: number } | null = null;
  for (const o of others) {
    const dx = Math.abs(o.x - position.x);
    const dy = Math.abs(o.y - position.y);
    if (dx <= tolerance && (bestX === null || dx < bestX.dist)) bestX = { value: o.x, dist: dx };
    if (dy <= tolerance && (bestY === null || dy < bestY.dist)) bestY = { value: o.y, dist: dy };
  }
  const guides: SnapResult["guides"] = [];
  const snapped = { ...position };
  if (bestX) {
    snapped.x = bestX.value;
    guides.push({ axis: "x", value: bestX.value });
  }
  if (bestY) {
    snapped.y = bestY.value;
    guides.push({ axis: "y", value: bestY.value });
  }
  return { position: snapped, guides };
}

// ---------- Text ----------

/** Enkel radbrytning efter maxtecken per rad; respekterar befintliga radbrytningar. */
export function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      if (current.length === 0) {
        current = word;
      } else if (current.length + 1 + word.length <= maxCharsPerLine) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}
