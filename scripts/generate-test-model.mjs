// Skapar testmodellen public/test-model-200.json: 200 noder med 10–50 egenskaper var, fördelade
// på tio lager, där de flesta sammankopplade par har en relation och några har upp till tio.
// Samma resultat varje gång (fast slumpfrö). Kör: node scripts/generate-test-model.mjs
import { writeFileSync } from "node:fs";

const LAYERS = [
  ["Customers", "Customer", "#0a84ff"],
  ["Orders", "Order", "#ff9500"],
  ["Products", "Product", "#34c759"],
  ["Suppliers", "Supplier", "#af52de"],
  ["Warehouses", "Warehouse", "#ffd60a"],
  ["Employees", "Employee", "#ff3b30"],
  ["Stores", "Store", "#8e8e93"],
  ["Invoices", "Invoice", "#ffffff"],
  ["Shipments", "Shipment", "#0a84ff"],
  ["Campaigns", "Campaign", "#34c759"],
];
const TYPES = [
  "RELATES_TO",
  "OWNS",
  "SUPPLIES",
  "CONTAINS",
  "MANAGES",
  "SHIPS_TO",
  "BILLED_BY",
  "PART_OF",
  "REFERS_TO",
  "REPLACES",
];
const WORDS = [
  "alpha",
  "north",
  "prime",
  "delta",
  "urban",
  "solid",
  "rapid",
  "clear",
  "amber",
  "nova",
  "terra",
  "lumen",
  "vector",
  "quartz",
  "harbor",
  "summit",
];
const KEYS = [
  "status",
  "region",
  "owner",
  "priority",
  "category",
  "source",
  "currency",
  "country",
  "city",
  "segment",
  "channel",
  "tier",
  "score",
  "rating",
  "weight",
  "height",
  "width",
  "length",
  "volume",
  "price",
  "cost",
  "margin",
  "discount",
  "tax",
  "quantity",
  "stock",
  "capacity",
  "revenue",
  "budget",
  "created",
  "updated",
  "approved",
  "verified",
  "active",
  "archived",
  "version",
  "revision",
  "batch",
  "serial",
  "reference",
  "contact",
  "email",
  "phone",
  "website",
  "language",
  "timezone",
  "notes",
  "tags",
  "risk",
  "comment",
];

// Litet deterministiskt slumptal (mulberry32) så att filen blir likadan varje gång.
let seed = 20261010;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (list) => list[int(0, list.length - 1)];
const pad = (n, width = 3) => String(n).padStart(width, "0");

// Tio lager, 7–20 noder i varje. 200 noder på tio lager med högst 20 per lager går bara ihop på
// ett sätt: exakt 20 i varje.
const perLayer = LAYERS.map(() => 20);

const now = "2026-10-10T00:00:00.000Z";
const layers = LAYERS.map(([name], i) => ({
  id: `l_${pad(i + 1, 2)}`,
  name,
  visible: true,
  locked: false,
}));
// doc.layers lagras botten → topp; första lagret i listan ska ligga överst i panelen.
layers.reverse();

const value = (key, n) => {
  switch (int(0, 4)) {
    case 0:
      return String(int(1, 9999));
    case 1:
      return `${pick(WORDS)}-${int(10, 99)}`;
    case 2:
      return pick(["true", "false", "pending", "n/a"]);
    case 3:
      return `2026-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`;
    default:
      return `${key} of ${pick(WORDS)} ${n}`;
  }
};

const COLUMNS = 5;
const COLUMN_WIDTH = 440;
const BLOCK_GAP = 500;
/** Ungefärlig höjd på en egenskapsrad under noden (14 px text). */
const PROPERTY_ROW = 17.5;
const nodes = {};
const nodeIdsByLayer = [];
let nodeNumber = 0;
// Ett block per lager, fem block i bredd. Varje rad i blocket får plats med sin längsta lista.
const BLOCKS_PER_BAND = 5;
let blockY = 0;
let pairBottom = 0;
LAYERS.forEach(([, label, fill], layerIndex) => {
  const layerId = `l_${pad(layerIndex + 1, 2)}`;
  const ids = [];
  const blockX = (layerIndex % BLOCKS_PER_BAND) * (COLUMNS * COLUMN_WIDTH + BLOCK_GAP);
  let rowY = blockY;
  let rowTallest = 0;
  for (let i = 0; i < perLayer[layerIndex]; i++) {
    nodeNumber++;
    const id = `n_${pad(nodeNumber)}`;
    // De två första noderna visar ytterlägena: 10 respektive 50 egenskaper.
    const count = nodeNumber === 1 ? 10 : nodeNumber === 2 ? 50 : int(10, 50);
    const properties = { name: `${label} ${pad(i + 1, 2)}` };
    const keys = [...KEYS];
    for (let k = keys.length - 1; k > 0; k--) {
      const j = int(0, k);
      [keys[k], keys[j]] = [keys[j], keys[k]];
    }
    for (const key of keys.slice(0, count - 1)) properties[key] = value(key, nodeNumber);
    if (i % COLUMNS === 0 && i > 0) {
      rowY += 220 + rowTallest * PROPERTY_ROW;
      rowTallest = 0;
    }
    rowTallest = Math.max(rowTallest, count);
    nodes[id] = {
      id,
      layerId,
      position: { x: blockX + (i % COLUMNS) * COLUMN_WIDTH, y: Math.round(rowY) },
      captionKey: "name",
      // Varje nod måste ha en egen labelkombination.
      labels: [`${label}${pad(i + 1, 2)}`],
      properties,
      style: fill === "#ffffff" ? {} : { fill },
    };
    ids.push(id);
  }
  nodeIdsByLayer.push(ids);
  pairBottom = Math.max(pairBottom, rowY + 220 + rowTallest * PROPERTY_ROW);
  if (layerIndex % BLOCKS_PER_BAND === BLOCKS_PER_BAND - 1) {
    blockY = pairBottom + BLOCK_GAP;
    pairBottom = 0;
  }
});

// Sammankopplade par: grannar i samma lager plus några mellan lager. De flesta par får en
// relation, vart femte får 2–10, och ett par får garanterat tio.
const pairs = new Map();
const addPair = (a, b) => {
  if (a === b) return;
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  if (!pairs.has(key)) pairs.set(key, [a, b]);
};
nodeIdsByLayer.forEach((ids, layerIndex) => {
  ids.forEach((id, i) => {
    if ((i + 1) % COLUMNS !== 0 && ids[i + 1]) addPair(id, ids[i + 1]);
    if (ids[i + COLUMNS] && random() < 0.6) addPair(id, ids[i + COLUMNS]);
  });
  const other = nodeIdsByLayer[(layerIndex + 1) % LAYERS.length];
  for (let i = 0; i < 4; i++) addPair(pick(ids), pick(other));
});

const relationships = {};
let relNumber = 0;
let pairNumber = 0;
for (const [a, b] of pairs.values()) {
  pairNumber++;
  const count = pairNumber === 1 ? 10 : random() < 0.8 ? 1 : int(2, 10);
  for (let i = 0; i < count; i++) {
    relNumber++;
    const id = `r_${pad(relNumber, 4)}`;
    const [fromId, toId] = random() < 0.5 ? [a, b] : [b, a];
    const properties = random() < 0.25 ? { since: String(int(2015, 2026)) } : {};
    relationships[id] = {
      id,
      fromId,
      toId,
      type: count === 1 ? pick(TYPES) : `${pick(TYPES)}_${i + 1}`,
      properties,
      style: {},
      // Var tionde relation ligger i ett eget lager (startnodens); övriga följer sina noder.
      ...(relNumber % 10 === 0 ? { layerId: nodes[fromId].layerId } : {}),
    };
  }
}

const doc = {
  version: 5,
  id: "d_testmodel200",
  name: "Test model – 200 nodes",
  createdAt: now,
  updatedAt: now,
  layers,
  propertiesVisible: true,
  nodes,
  relationships,
  notes: {},
  images: {},
  assets: {},
  style: { node: {}, relationship: {}, background: "#ffffff" },
};

writeFileSync(
  new URL("../public/test-model-200.json", import.meta.url),
  `${JSON.stringify(doc)}\n`,
);
const propertyCounts = Object.values(nodes).map((n) => Object.keys(n.properties).length);
const perPair = new Map();
for (const r of Object.values(relationships)) {
  const key = r.fromId < r.toId ? `${r.fromId}|${r.toId}` : `${r.toId}|${r.fromId}`;
  perPair.set(key, (perPair.get(key) ?? 0) + 1);
}
const sizes = [...perPair.values()];
console.log(
  `${Object.keys(nodes).length} nodes, ${propertyCounts.reduce((a, b) => a + b, 0)} properties ` +
    `(${Math.min(...propertyCounts)}–${Math.max(...propertyCounts)} per node), ` +
    `${sizes.length} connected pairs (${sizes.filter((n) => n === 1).length} with one relationship, ` +
    `max ${Math.max(...sizes)}), ${Object.keys(relationships).length} relationships, ${layers.length} layers`,
);
