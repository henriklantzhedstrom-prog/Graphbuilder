import type { GraphDocument } from "@/model/types";
import { selectDocument } from "./filter";

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const escapeIdentifier = (name: string): string =>
  IDENTIFIER.test(name) ? name : `\`${name.replace(/`/g, "``")}\``;

export function cypherValue(value: string): string {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed) && trimmed === value) return trimmed;
  if (trimmed === "true" || trimmed === "false") return trimmed;
  if (trimmed === "null") return "null";
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

export function cypherProperties(properties: Record<string, string>): string {
  const entries = Object.entries(properties);
  if (entries.length === 0) return "";
  return ` {${entries.map(([k, v]) => `${escapeIdentifier(k)}: ${cypherValue(v)}`).join(", ")}}`;
}

/** Variabelnamn från rubriken (som arrows.app), annars n0, n1 … Unika inom exporten. */
function variableNames(captions: { id: string; caption: string }[]): Map<string, string> {
  const used = new Set<string>();
  const result = new Map<string, string>();
  captions.forEach(({ id, caption }, index) => {
    let base = caption.replace(/[^A-Za-z0-9_]/g, "");
    if (!base || /^[0-9]/.test(base)) base = `n${index}`;
    let name = base;
    let suffix = 1;
    while (used.has(name)) name = `${base}${suffix++}`;
    used.add(name);
    result.set(id, name);
  });
  return result;
}

export const DEFAULT_RELATIONSHIP_TYPE = "RELATED";

export function exportCypher(doc: GraphDocument, options: { onlyVisible: boolean }): string {
  const d = selectDocument(doc, options.onlyVisible);
  const nodes = Object.values(d.nodes);
  const names = variableNames(nodes.map((n) => ({ id: n.id, caption: n.caption })));
  const lines: string[] = [];
  for (const node of nodes) {
    const labels = node.labels.map((l) => `:${escapeIdentifier(l)}`).join("");
    lines.push(`CREATE (${names.get(node.id)}${labels}${cypherProperties(node.properties)})`);
  }
  for (const rel of Object.values(d.relationships)) {
    const from = names.get(rel.fromId);
    const to = names.get(rel.toId);
    if (!from || !to) continue;
    const type = escapeIdentifier(rel.type.trim() || DEFAULT_RELATIONSHIP_TYPE);
    const directed = { ...d.style.relationship, ...rel.style }.directed;
    const arrow = directed ? "->" : "-";
    lines.push(`CREATE (${from})-[:${type}${cypherProperties(rel.properties)}]${arrow}(${to})`);
  }
  return lines.join("\n");
}
