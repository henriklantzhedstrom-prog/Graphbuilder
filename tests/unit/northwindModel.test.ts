import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exportCypher } from "@/export/cypher";
import { nodeDisplayName, showsLabelsAsCaption } from "@/model/caption";
import { findLabelConflict } from "@/model/labels";
import { parseDocument } from "@/model/schema";
import { visibleNotes, visibleRelationships } from "@/store/selectors";

/** Northwind-modellen i public/ (scripts/generate-northwind-model.mjs) ska stämma med Neo4js exempel. */
describe("Northwind som testmodell", () => {
  const doc = parseDocument(JSON.parse(readFileSync("public/northwind.json", "utf8")));
  const nodes = Object.values(doc.nodes);
  const pattern = (type: string) => {
    const rel = Object.values(doc.relationships).find((r) => r.type === type);
    if (!rel) return null;
    return `(${doc.nodes[rel.fromId]?.labels[0]})-[:${type}]->(${doc.nodes[rel.toId]?.labels[0]})`;
  };

  it("har de labels och relationer som Neo4js Northwind-guide beskriver", () => {
    expect(nodes.map((n) => n.labels[0]).sort()).toEqual([
      "Category",
      "Customer",
      "Employee",
      "Order",
      "Product",
      "Region",
      "Shipper",
      "Supplier",
      "Territory",
    ]);
    // De fyra relationerna i guiden, med riktning.
    expect(pattern("PART_OF")).toBe("(Product)-[:PART_OF]->(Category)");
    expect(pattern("SUPPLIES")).toBe("(Supplier)-[:SUPPLIES]->(Product)");
    expect(pattern("PURCHASED")).toBe("(Customer)-[:PURCHASED]->(Order)");
    expect(pattern("ORDERS")).toBe("(Order)-[:ORDERS]->(Product)");
    // Relationer till samma label: chef och överordnad kategori.
    expect(pattern("REPORTS_TO")).toBe("(Employee)-[:REPORTS_TO]->(Employee)");
    expect(pattern("PARENT")).toBe("(Category)-[:PARENT]->(Category)");
    expect(Object.keys(doc.relationships)).toHaveLength(10);
  });

  it("följer Neo4js regler för egenskaper och nycklar", () => {
    const product = nodes.find((n) => n.labels[0] === "Product");
    const orders = Object.values(doc.relationships).find((r) => r.type === "ORDERS");
    // Typade fält enligt guidens import, och en unik nyckel per label.
    expect(product?.properties).toMatchObject({
      productID: "STRING (unique)",
      unitPrice: "FLOAT",
      unitsInStock: "INTEGER",
      discontinued: "BOOLEAN",
    });
    for (const node of nodes) {
      const unique = Object.values(node.properties).filter((v) => v.includes("unique"));
      expect(unique, node.labels[0]).toHaveLength(1);
      // Ingen rubrik och ingen egenskap som upprepar labeln: noden visar sin label.
      expect(node.captionKey).toBeNull();
      expect(node.properties).not.toHaveProperty("name");
      expect(nodeDisplayName(node)).toBe(node.labels[0]);
      expect(showsLabelsAsCaption(node)).toBe(true);
    }
    // Främmande nycklar är relationer, inte egenskaper; kopplingstabellens kolumner sitter på relationen.
    expect(product?.properties).not.toHaveProperty("supplierID");
    expect(product?.properties).not.toHaveProperty("categoryID");
    expect(orders?.properties).toEqual({
      unitPrice: "FLOAT",
      quantity: "INTEGER",
      discount: "FLOAT",
    });
  });

  it("är en giltig modell: unika labels, tre lager, knutna anteckningar, och går att exportera", () => {
    expect(
      findLabelConflict(
        {},
        nodes.map((n) => ({ id: n.id, labels: n.labels })),
      ),
    ).toBeNull();
    expect(doc.layers.map((l) => l.name)).toEqual(["Organisation", "Sales", "Catalog"]);
    expect(visibleRelationships(doc)).toHaveLength(10);
    const notes = visibleNotes(doc);
    expect(notes).toHaveLength(5);
    expect(notes.filter((n) => n.attachedTo?.kind === "node")).toHaveLength(2);
    expect(notes.filter((n) => n.attachedTo?.kind === "relationship")).toHaveLength(2);
    const cypher = exportCypher(doc, { onlyVisible: true });
    expect(cypher).toContain(":Product");
    expect(cypher).toContain("[:REPORTS_TO]");
  });
});
