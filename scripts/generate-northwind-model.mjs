// Skapar public/northwind.json: Neo4js Northwind-exempel som grafmodell (ett schema, där varje
// nod står för en label). Källor:
//  - Neo4js guide "Northwind Graph" (https://guides.neo4j.com/northwind/index.html): Product,
//    Category, Supplier, Customer, Order, relationerna PART_OF, SUPPLIES, PURCHASED, ORDERS och
//    unika nycklar på ...ID.
//  - Neo4js officiella datafiler (https://data.neo4j.com/northwind/*.csv): kolumnnamnen, samt
//    Employee, Shipper, Territory och Region.
//  - neo4j-graph-examples/northwind (README): (Category)-[:PARENT]->(Category).
//  - Neo4js regler för att gå från relationsmodell till graf: främmande nycklar blir relationer
//    (och tas bort som egenskaper), kopplingstabeller blir relationer med egenskaper.
// Namnsättning enligt Neo4js rekommendation: Labels i CamelCase, RELATIONER_MED_VERSALER,
// egenskaper i camelCase. Noderna har ingen rubrik; i en typmodell är labeln nodens namn.
// Kör: node scripts/generate-northwind-model.mjs
import { writeFileSync } from "node:fs";

const now = "2026-10-10T00:00:00.000Z";

const LAYERS = [
  { id: "l_org", name: "Organisation" },
  { id: "l_sales", name: "Sales" },
  { id: "l_catalog", name: "Catalog" },
];

const S = "STRING";
const key = "STRING (unique)";

/** [label, lager, x, y, fyllning, egenskaper] */
const NODES = [
  [
    "Supplier",
    "l_catalog",
    0,
    0,
    "#34c759",
    {
      supplierID: key,
      companyName: S,
      contactName: S,
      contactTitle: S,
      address: S,
      city: S,
      region: S,
      postalCode: S,
      country: S,
      phone: S,
      fax: S,
      homePage: S,
    },
  ],
  [
    "Product",
    "l_catalog",
    520,
    0,
    "#34c759",
    {
      productID: key,
      productName: S,
      quantityPerUnit: S,
      unitPrice: "FLOAT",
      unitsInStock: "INTEGER",
      unitsOnOrder: "INTEGER",
      reorderLevel: "INTEGER",
      discontinued: "BOOLEAN",
    },
  ],
  [
    "Category",
    "l_catalog",
    1040,
    0,
    "#34c759",
    {
      categoryID: key,
      categoryName: S,
      description: S,
      picture: S,
    },
  ],
  [
    "Customer",
    "l_sales",
    0,
    560,
    "#0a84ff",
    {
      customerID: key,
      companyName: S,
      contactName: S,
      contactTitle: S,
      address: S,
      city: S,
      region: S,
      postalCode: S,
      country: S,
      phone: S,
      fax: S,
    },
  ],
  [
    "Order",
    "l_sales",
    520,
    560,
    "#0a84ff",
    {
      orderID: key,
      orderDate: "LOCAL DATETIME",
      requiredDate: "LOCAL DATETIME",
      shippedDate: "LOCAL DATETIME",
      freight: "FLOAT",
      shipName: S,
      shipAddress: S,
      shipCity: S,
      shipRegion: S,
      shipPostalCode: S,
      shipCountry: S,
    },
  ],
  [
    "Shipper",
    "l_sales",
    1040,
    560,
    "#0a84ff",
    {
      shipperID: key,
      companyName: S,
      phone: S,
    },
  ],
  [
    "Employee",
    "l_org",
    520,
    1180,
    "#ff9500",
    {
      employeeID: key,
      lastName: S,
      firstName: S,
      title: S,
      titleOfCourtesy: S,
      birthDate: "LOCAL DATETIME",
      hireDate: "LOCAL DATETIME",
      address: S,
      city: S,
      region: S,
      postalCode: S,
      country: S,
      homePhone: S,
      extension: S,
      notes: S,
      photoPath: S,
    },
  ],
  [
    "Territory",
    "l_org",
    1040,
    1180,
    "#ff9500",
    {
      territoryID: key,
      territoryDescription: S,
    },
  ],
  [
    "Region",
    "l_org",
    1560,
    1180,
    "#ff9500",
    {
      regionID: key,
      regionDescription: S,
    },
  ],
];

/** [från, typ, till, egenskaper] */
const RELATIONSHIPS = [
  ["Supplier", "SUPPLIES", "Product", {}],
  ["Product", "PART_OF", "Category", {}],
  ["Category", "PARENT", "Category", {}],
  ["Customer", "PURCHASED", "Order", {}],
  ["Order", "ORDERS", "Product", { unitPrice: "FLOAT", quantity: "INTEGER", discount: "FLOAT" }],
  ["Shipper", "SHIPS", "Order", {}],
  ["Employee", "SOLD", "Order", {}],
  ["Employee", "REPORTS_TO", "Employee", {}],
  ["Employee", "IN_TERRITORY", "Territory", {}],
  ["Territory", "IN_REGION", "Region", {}],
];

/** [text, x, y, bredd, höjd, knuten till (label eller relationstyp) eller null] */
const NOTES = [
  [
    "Northwind – Neo4j's standard example of turning a relational database into a graph.\n" +
      "Each node here stands for a label; its properties show the Cypher type.\n" +
      "Sources: guides.neo4j.com/northwind and data.neo4j.com/northwind/*.csv",
    1300,
    -80,
    420,
    130,
    null,
  ],
  [
    "From the join table order-details: its columns became properties on the relationship.",
    700,
    250,
    260,
    80,
    "ORDERS",
  ],
  [
    "Foreign keys (supplierID, categoryID) are relationships now, not properties.",
    660,
    -190,
    260,
    70,
    "Product",
  ],
  [
    "The manager is another Employee: the reportsTo column became a relationship to itself.",
    120,
    1130,
    250,
    80,
    "REPORTS_TO",
  ],
  [
    "Uniqueness constraint on every ...ID property, as in Neo4j's guide.",
    -40,
    330,
    240,
    70,
    "Customer",
  ],
];

const nodeId = (label) => `n_${label.toLowerCase()}`;
const nodes = Object.fromEntries(
  NODES.map(([label, layerId, x, y, fill, properties]) => [
    nodeId(label),
    {
      id: nodeId(label),
      layerId,
      position: { x, y },
      // Ingen rubrik: noden visar sin label inne i cirkeln.
      captionKey: null,
      labels: [label],
      properties,
      style: { fill },
    },
  ]),
);

const relId = (type) => `r_${type.toLowerCase()}`;
const relationships = Object.fromEntries(
  RELATIONSHIPS.map(([from, type, to, properties]) => [
    relId(type),
    { id: relId(type), fromId: nodeId(from), toId: nodeId(to), type, properties, style: {} },
  ]),
);

const notes = Object.fromEntries(
  NOTES.map(([text, x, y, w, h, target], i) => {
    const id = `t_${i + 1}`;
    const attachedTo = !target
      ? {}
      : nodeId(target) in nodes
        ? { attachedTo: { kind: "node", id: nodeId(target) } }
        : { attachedTo: { kind: "relationship", id: relId(target) } };
    return [
      id,
      {
        id,
        position: { x, y },
        size: { w, h },
        text,
        color: "#ffffff",
        borderColor: "#000000",
        borderWidth: 2,
        textColor: "#1b1f27",
        fontSize: 14,
        align: "left",
        ...attachedTo,
      },
    ];
  }),
);

const doc = {
  version: 6,
  id: "d_northwind",
  name: "Northwind (Neo4j example)",
  createdAt: now,
  updatedAt: now,
  layers: LAYERS.map((l) => ({ ...l, visible: true, locked: false })),
  propertiesVisible: true,
  notesVisible: true,
  nodes,
  relationships,
  notes,
  images: {},
  assets: {},
  style: { node: {}, relationship: {}, background: "#ffffff" },
};

writeFileSync(new URL("../public/northwind.json", import.meta.url), `${JSON.stringify(doc)}\n`);
console.log(
  `${NODES.length} labels, ${RELATIONSHIPS.length} relationship types, ` +
    `${NODES.reduce((sum, n) => sum + Object.keys(n[5]).length, 0)} properties, ${NOTES.length} notes`,
);
