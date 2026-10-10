import type { Point } from "./types";

/**
 * Automatisk placering av noder som minimerar antalet relationer som korsar varandra.
 *
 * Noderna läggs i ett rutnät och flyttas runt med simulerad härdning ("simulated annealing"):
 * slumpvisa flyttar och platsbyten som accepteras om de gör bilden bättre, och ibland även om de
 * gör den lite sämre, så att sökningen inte fastnar. Kostnaden är i första hand antalet
 * korsningar, sedan relationer som går rakt över en annan nod, sedan total längd. Till sist får
 * varje kolumn och rad den bredd och höjd dess noder behöver (labels och egenskaper räknas in),
 * och resultatet putsas med exakt räkning i de verkliga måtten.
 *
 * Allt är deterministiskt: samma graf ger samma placering.
 */

export interface LayoutNode {
  id: string;
  /** Hur långt nodens ritade yta sträcker sig från dess mittpunkt åt varje håll. */
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

export interface LayoutOptions {
  /** Luft mellan kolumner respektive rader, i samma enhet som nodernas mått. */
  gapX?: number;
  gapY?: number;
  /** Övre gräns för sökningens arbete; större värde ger en noggrannare sökning. */
  effort?: number;
  /**
   * Nodernas nuvarande mittpunkter. Används som en av startpunkterna för sökningen, så att en
   * bild som redan är ganska bra förbättras i stället för att börja om från början.
   */
  current?: ReadonlyMap<string, Point>;
}

const W_CROSSING = 100;
const W_THROUGH = 60;
const W_LENGTH = 1;
const W_SPREAD = 0.05;

const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => {
  const v = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0;
};

const within = (a: number, b: number, c: number): boolean =>
  Math.min(a, b) - 1e-9 <= c && c <= Math.max(a, b) + 1e-9;

/** Korsar sträckan a–b sträckan c–d? Gemensamma ändpunkter räknas inte som korsning. */
function segmentsCross(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const o1 = orient(ax, ay, bx, by, cx, cy);
  const o2 = orient(ax, ay, bx, by, dx, dy);
  const o3 = orient(cx, cy, dx, dy, ax, ay);
  const o4 = orient(cx, cy, dx, dy, bx, by);
  if (o1 !== o2 && o3 !== o4) return true;
  // Ligger på samma linje och överlappar.
  if (o1 === 0 && within(ax, bx, cx) && within(ay, by, cy)) return true;
  if (o2 === 0 && within(ax, bx, dx) && within(ay, by, dy)) return true;
  if (o3 === 0 && within(cx, dx, ax) && within(cy, dy, ay)) return true;
  if (o4 === 0 && within(cx, dx, bx) && within(cy, dy, by)) return true;
  return false;
}

/** Avståndet i kvadrat från punkten p till sträckan a–b. */
function distanceSquared(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length));
  const qx = ax + t * dx - px;
  const qy = ay + t * dy - py;
  return qx * qx + qy * qy;
}

/** Unika nodpar med en relation emellan (parallella relationer och loopar räknas inte). */
function uniquePairs(ids: Map<string, number>, edges: readonly LayoutEdge[]): [number, number][] {
  const seen = new Set<string>();
  const pairs: [number, number][] = [];
  for (const edge of edges) {
    const a = ids.get(edge.from);
    const b = ids.get(edge.to);
    if (a === undefined || b === undefined || a === b) continue;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push([a, b]);
  }
  return pairs;
}

/**
 * Antal par av relationer som korsar varandra när de ritas som raka linjer mellan nodernas
 * mittpunkter. Relationer som delar en nod räknas inte, och flera relationer mellan samma två
 * noder räknas som en.
 */
export function countCrossings(
  positions: ReadonlyMap<string, Point>,
  edges: readonly LayoutEdge[],
): number {
  const ids = new Map<string, number>();
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [id, p] of positions) {
    ids.set(id, xs.length);
    xs.push(p.x);
    ys.push(p.y);
  }
  const pairs = uniquePairs(ids, edges);
  let count = 0;
  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = pairs[i] as [number, number];
    for (let j = i + 1; j < pairs.length; j++) {
      const [c, d] = pairs[j] as [number, number];
      if (a === c || a === d || b === c || b === d) continue;
      if (
        segmentsCross(
          xs[a] as number,
          ys[a] as number,
          xs[b] as number,
          ys[b] as number,
          xs[c] as number,
          ys[c] as number,
          xs[d] as number,
          ys[d] as number,
        )
      )
        count++;
    }
  }
  return count;
}

/** Litet deterministiskt slumptal (mulberry32). */
function random(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Problem {
  n: number;
  ea: number[];
  eb: number[];
  incident: number[][];
}

/** Hela kostnaden för en placering med givna koordinater. `radius` är nodens ungefärliga radie. */
function fullCost(
  problem: Problem,
  x: readonly number[],
  y: readonly number[],
  radius: number,
  lengthUnit: number,
): { crossings: number; through: number; length: number; cost: number } {
  const { n, ea, eb } = problem;
  const r2 = radius * radius;
  let crossings = 0;
  let through = 0;
  let length = 0;
  for (let e = 0; e < ea.length; e++) {
    const a = ea[e] as number;
    const b = eb[e] as number;
    const ax = x[a] as number;
    const ay = y[a] as number;
    const bx = x[b] as number;
    const by = y[b] as number;
    length += Math.hypot(bx - ax, by - ay) / lengthUnit;
    for (let f = e + 1; f < ea.length; f++) {
      const c = ea[f] as number;
      const d = eb[f] as number;
      if (a === c || a === d || b === c || b === d) continue;
      if (
        segmentsCross(
          ax,
          ay,
          bx,
          by,
          x[c] as number,
          y[c] as number,
          x[d] as number,
          y[d] as number,
        )
      )
        crossings++;
    }
    for (let k = 0; k < n; k++) {
      if (k === a || k === b) continue;
      if (distanceSquared(x[k] as number, y[k] as number, ax, ay, bx, by) < r2) through++;
    }
  }
  return {
    crossings,
    through,
    length,
    cost: crossings * W_CROSSING + through * W_THROUGH + length * W_LENGTH,
  };
}

/**
 * Söker en bra placering i ett rutnät med `cols` × `rows` platser. Ger platsen för varje nod.
 * Kostnaden räknas om bara för det som en flytt påverkar, så att sökningen hinner med många steg.
 */
function anneal(
  problem: Problem,
  cols: number,
  rows: number,
  start: number[],
  iterations: number,
  rand: () => number,
  startTemperature: number,
): number[] {
  const { n, ea, eb, incident } = problem;
  const slots = cols * rows;
  const slotOf = [...start];
  const nodeAt: number[] = new Array(slots).fill(-1);
  const x: number[] = new Array(n).fill(0);
  const y: number[] = new Array(n).fill(0);
  const place = (node: number, slot: number) => {
    slotOf[node] = slot;
    nodeAt[slot] = node;
    x[node] = slot % cols;
    y[node] = Math.floor(slot / cols);
  };
  for (let i = 0; i < n; i++) place(i, slotOf[i] as number);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const R2 = 0.35 * 0.35;
  const mark: number[] = new Array(ea.length).fill(0);
  let stamp = 0;

  /** Den del av kostnaden som beror på noderna `moved` och deras relationer. */
  const partial = (moved: number[]): number => {
    stamp++;
    const affected: number[] = [];
    for (const node of moved) {
      for (const e of incident[node] as number[]) {
        if (mark[e] !== stamp) {
          mark[e] = stamp;
          affected.push(e);
        }
      }
    }
    let cost = 0;
    for (const node of moved) {
      cost += W_SPREAD * (Math.abs((x[node] as number) - cx) + Math.abs((y[node] as number) - cy));
    }
    for (const e of affected) {
      const a = ea[e] as number;
      const b = eb[e] as number;
      const ax = x[a] as number;
      const ay = y[a] as number;
      const bx = x[b] as number;
      const by = y[b] as number;
      cost += W_LENGTH * Math.hypot(bx - ax, by - ay);
      for (let f = 0; f < ea.length; f++) {
        // Par där båda är påverkade räknas en gång.
        if (f === e || (mark[f] === stamp && f < e)) continue;
        const c = ea[f] as number;
        const d = eb[f] as number;
        if (a === c || a === d || b === c || b === d) continue;
        if (
          segmentsCross(
            ax,
            ay,
            bx,
            by,
            x[c] as number,
            y[c] as number,
            x[d] as number,
            y[d] as number,
          )
        )
          cost += W_CROSSING;
      }
      for (let k = 0; k < n; k++) {
        if (k === a || k === b) continue;
        if (distanceSquared(x[k] as number, y[k] as number, ax, ay, bx, by) < R2) cost += W_THROUGH;
      }
    }
    // Opåverkade relationer som går rakt över en av de flyttade noderna.
    for (let f = 0; f < ea.length; f++) {
      if (mark[f] === stamp) continue;
      const c = ea[f] as number;
      const d = eb[f] as number;
      for (const node of moved) {
        if (
          distanceSquared(
            x[node] as number,
            y[node] as number,
            x[c] as number,
            y[c] as number,
            x[d] as number,
            y[d] as number,
          ) < R2
        )
          cost += W_THROUGH;
      }
    }
    return cost;
  };

  const best = [...slotOf];
  let current = 0;
  let bestCost = 0;
  const T0 = startTemperature;
  const T1 = 0.2;
  const cooling = (T1 / T0) ** (1 / Math.max(1, iterations));
  let temperature = T0;
  for (let step = 0; step < iterations; step++) {
    const node = Math.floor(rand() * n);
    const from = slotOf[node] as number;
    // Varannan flytt är kort (till en plats i närheten), varannan vart som helst i rutnätet.
    let to: number;
    if (rand() < 0.5) {
      const c = Math.min(cols - 1, Math.max(0, (from % cols) + Math.floor(rand() * 5) - 2));
      const r = Math.min(
        rows - 1,
        Math.max(0, Math.floor(from / cols) + Math.floor(rand() * 5) - 2),
      );
      to = r * cols + c;
    } else {
      to = Math.floor(rand() * slots);
    }
    if (to === from) continue;
    const other = nodeAt[to] as number;
    const moved = other >= 0 ? [node, other] : [node];
    const before = partial(moved);
    nodeAt[from] = -1;
    place(node, to);
    if (other >= 0) place(other, from);
    const delta = partial(moved) - before;
    if (delta <= 0 || rand() < Math.exp(-delta / temperature)) {
      current += delta;
      if (current < bestCost - 1e-9) {
        bestCost = current;
        for (let i = 0; i < n; i++) best[i] = slotOf[i] as number;
      }
    } else {
      // Ångra flytten.
      nodeAt[to] = -1;
      place(node, from);
      if (other >= 0) place(other, to);
    }
    temperature *= cooling;
  }
  return best;
}

/**
 * Verkliga mittpunkter för noderna utifrån deras platser i rutnätet. Varje kolumn blir så bred
 * och varje rad så hög som dess noder kräver; tomma kolumner och rader tar ingen plats.
 */
function realCoordinates(
  nodes: readonly LayoutNode[],
  slotOf: readonly number[],
  cols: number,
  rows: number,
  gapX: number,
  gapY: number,
): { x: number[]; y: number[] } {
  const half: number[] = new Array(cols).fill(-1);
  const up: number[] = new Array(rows).fill(-1);
  const down: number[] = new Array(rows).fill(-1);
  nodes.forEach((node, i) => {
    const slot = slotOf[i] as number;
    const c = slot % cols;
    const r = Math.floor(slot / cols);
    half[c] = Math.max(half[c] as number, node.left, node.right);
    up[r] = Math.max(up[r] as number, node.top);
    down[r] = Math.max(down[r] as number, node.bottom);
  });
  const colX: number[] = [];
  let cursor = 0;
  for (let c = 0; c < cols; c++) {
    const h = half[c] as number;
    if (h < 0) {
      colX.push(cursor);
      continue;
    }
    colX.push(cursor + h);
    cursor += h * 2 + gapX;
  }
  const rowY: number[] = [];
  cursor = 0;
  for (let r = 0; r < rows; r++) {
    const u = up[r] as number;
    if (u < 0) {
      rowY.push(cursor);
      continue;
    }
    rowY.push(cursor + u);
    cursor += u + (down[r] as number) + gapY;
  }
  return {
    x: slotOf.map((slot) => colX[slot % cols] as number),
    y: slotOf.map((slot) => rowY[Math.floor(slot / cols)] as number),
  };
}

/** Startplacering: noderna i den ordning en bredden-först-sökning når dem, rad för rad. */
function initialSlots(problem: Problem, cols: number, rows: number, rand: () => number): number[] {
  const { n, incident, ea, eb } = problem;
  const order: number[] = [];
  const seen: boolean[] = new Array(n).fill(false);
  // Slumpad men bestämd ordning mellan noder med lika många relationer. Varje nod får sitt
  // slumptal en gång, så att sorteringen ger samma resultat i alla webbläsare.
  const tieBreak = Array.from({ length: n }, () => rand());
  const starts = [...Array(n).keys()].sort(
    (a, b) =>
      (incident[b] as number[]).length - (incident[a] as number[]).length ||
      (tieBreak[a] as number) - (tieBreak[b] as number),
  );
  for (const start of starts) {
    if (seen[start]) continue;
    const queue = [start];
    seen[start] = true;
    while (queue.length > 0) {
      const node = queue.shift() as number;
      order.push(node);
      for (const e of incident[node] as number[]) {
        const next = ea[e] === node ? (eb[e] as number) : (ea[e] as number);
        if (!seen[next]) {
          seen[next] = true;
          queue.push(next);
        }
      }
    }
  }
  // Sprid ut över rutnätet så att det finns tomma platser att flytta till.
  const slots = cols * rows;
  const slotOf: number[] = new Array(n).fill(0);
  order.forEach((node, i) => {
    slotOf[node] = Math.min(slots - 1, Math.floor((i * slots) / n));
  });
  return slotOf;
}

/**
 * Startplacering utifrån nuvarande lägen: noderna hamnar i rutnätet i samma inbördes ordning,
 * vänster–höger och uppifrån–ned, som de ligger i dag.
 */
function slotsFromPositions(
  nodes: readonly LayoutNode[],
  current: ReadonlyMap<string, Point>,
  cols: number,
  rows: number,
): number[] {
  const n = nodes.length;
  const at = nodes.map((node) => current.get(node.id) ?? { x: 0, y: 0 });
  const minX = Math.min(...at.map((p) => p.x));
  const maxX = Math.max(...at.map((p) => p.x));
  const minY = Math.min(...at.map((p) => p.y));
  const maxY = Math.max(...at.map((p) => p.y));
  const taken = new Set<number>();
  const slotOf: number[] = new Array(n).fill(0);
  at.forEach((p, i) => {
    const c = Math.round(((p.x - minX) / (maxX - minX || 1)) * (cols - 1));
    const r = Math.round(((p.y - minY) / (maxY - minY || 1)) * (rows - 1));
    // Närmaste lediga plats om den önskade är upptagen.
    let best = -1;
    let bestDistance = Infinity;
    for (let slot = 0; slot < cols * rows; slot++) {
      if (taken.has(slot)) continue;
      const d = Math.abs((slot % cols) - c) + Math.abs(Math.floor(slot / cols) - r);
      if (d < bestDistance) {
        bestDistance = d;
        best = slot;
      }
    }
    taken.add(best);
    slotOf[i] = best;
  });
  return slotOf;
}

/**
 * Placerar noderna så att så få relationer som möjligt korsar varandra. Ger varje nods nya
 * mittpunkt, med övre vänstra hörnet av hela bilden i origo.
 */
export function arrange(
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
  options: LayoutOptions = {},
): Map<string, Point> {
  const n = nodes.length;
  const result = new Map<string, Point>();
  if (n === 0) return result;
  const gapX = options.gapX ?? 120;
  const gapY = options.gapY ?? 90;
  const ids = new Map(nodes.map((node, i) => [node.id, i]));
  const pairs = uniquePairs(ids, edges);
  const problem: Problem = {
    n,
    ea: pairs.map((p) => p[0]),
    eb: pairs.map((p) => p[1]),
    incident: nodes.map(() => []),
  };
  pairs.forEach(([a, b], e) => {
    (problem.incident[a] as number[]).push(e);
    (problem.incident[b] as number[]).push(e);
  });

  // Små grafer får ett glesare rutnät: täta småfigurer behöver plats för att lösas upp utan att
  // tre noder hamnar på rad.
  const density = n <= 12 ? 6 : 1.8;
  const cols = Math.max(3, Math.ceil(Math.sqrt(n * density)));
  const rows = Math.max(3, Math.ceil((n * density) / cols));
  const edgeCount = pairs.length;
  const averageDegree = n > 0 ? (edgeCount * 2) / n : 0;
  const workPerStep = Math.max(10, averageDegree * (edgeCount + n) * 2 + edgeCount * 2);
  const effort = options.effort ?? 1.5e8;
  // Flera försök från olika startlägen; det nuvarande läget är ett av dem när det är känt.
  const fresh = n <= 60 ? 4 : 1;
  const attempts = fresh + (options.current ? 1 : 0);
  const iterations = Math.round(Math.min(150000, Math.max(4000, effort / workPerStep)) / attempts);
  const radius = Math.min(...nodes.map((node) => Math.min(node.left, node.right, node.top)));
  const lengthUnit = gapX + radius * 2;

  const evaluate = (slotOf: readonly number[]) => {
    const { x, y } = realCoordinates(nodes, slotOf, cols, rows, gapX, gapY);
    return { x, y, ...fullCost(problem, x, y, radius, lengthUnit) };
  };

  let bestSlots: number[] | null = null;
  let best: ReturnType<typeof evaluate> | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const rand = random(20261010 + attempt * 7919);
    // Sista försöket utgår från nuvarande lägen och söker försiktigare (låg starttemperatur),
    // så att det som redan är bra inte rivs upp.
    const fromCurrent = options.current !== undefined && attempt === attempts - 1;
    const start =
      fromCurrent && options.current
        ? slotsFromPositions(nodes, options.current, cols, rows)
        : initialSlots(problem, cols, rows, rand);
    const slots = anneal(problem, cols, rows, start, iterations, rand, fromCurrent ? 8 : 60);
    const scored = evaluate(slots);
    if (!best || scored.cost < best.cost - 1e-9) {
      best = scored;
      bestSlots = slots;
    }
  }
  if (!bestSlots || !best) return result;
  let slots: number[] = bestSlots;
  let score = best;

  // Puts i verkliga mått: byt plats på två noder eller flytta en till en tom plats så länge det
  // ger färre korsningar. Rutnätets kolumner och rader har olika storlek, så det som var bäst i
  // det jämna rutnätet är inte alltid bäst på riktigt.
  if (n <= 60) {
    const total = cols * rows;
    let improved = true;
    for (let round = 0; improved && round < 6; round++) {
      improved = false;
      for (let i = 0; i < n; i++) {
        for (let target = 0; target < total; target++) {
          const from = slots[i] as number;
          if (target === from) continue;
          const j = slots.indexOf(target);
          if (j >= 0 && j < i) continue;
          const candidate = [...slots];
          candidate[i] = target;
          if (j >= 0) candidate[j] = from;
          const scored = evaluate(candidate);
          if (scored.cost < score.cost - 1e-9) {
            score = scored;
            slots = candidate;
            improved = true;
          }
        }
      }
    }
  }

  const minX = Math.min(...nodes.map((node, i) => (score.x[i] as number) - node.left));
  const minY = Math.min(...nodes.map((node, i) => (score.y[i] as number) - node.top));
  nodes.forEach((node, i) => {
    result.set(node.id, {
      x: (score.x[i] as number) - minX,
      y: (score.y[i] as number) - minY,
    });
  });
  return result;
}
