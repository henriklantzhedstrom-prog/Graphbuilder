import type { GraphNode, Id } from "./types";

/**
 * Regel: två noder får inte ha samma label eller samma kombination av labels.
 * Ordningen spelar ingen roll, stavningen gör det (som i Neo4j). Noder utan labels omfattas inte.
 */

type NodeLike = Pick<GraphNode, "id" | "labels">;

/** Ordningsoberoende nyckel för en labeluppsättning; "" betyder inga labels. */
export const labelKey = (labels: readonly string[]): string =>
  [...new Set(labels.map((l) => l.trim()).filter(Boolean))].sort().join("\u0000");

export interface LabelConflict {
  /** Noden vars nya labels krockar */
  nodeId: Id;
  /** Noden som redan har samma labels */
  otherId: Id;
}

/**
 * Första krocken som ändringarna skulle orsaka, eller null. Bara ändrade noder kontrolleras,
 * så redan befintliga krockar (t.ex. från en äldre fil) hindrar inte andra ändringar.
 */
export function findLabelConflict(
  nodes: Record<Id, NodeLike>,
  changes: readonly { id: Id; labels: readonly string[] }[],
): LabelConflict | null {
  const after = new Map<Id, string>();
  for (const n of Object.values(nodes)) after.set(n.id, labelKey(n.labels));
  for (const c of changes) after.set(c.id, labelKey(c.labels));
  for (const c of changes) {
    const key = after.get(c.id) ?? "";
    if (key === "") continue;
    for (const [otherId, otherKey] of after) {
      if (otherId !== c.id && otherKey === key) return { nodeId: c.id, otherId };
    }
  }
  return null;
}

/** Grupper av noder som delar samma (icke-tomma) labelkombination. */
export function duplicateLabelGroups(nodes: Record<Id, NodeLike>): Id[][] {
  const groups = new Map<string, Id[]>();
  for (const n of Object.values(nodes)) {
    const key = labelKey(n.labels);
    if (key === "") continue;
    groups.set(key, [...(groups.get(key) ?? []), n.id]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

export const conflictingNodeIds = (nodes: Record<Id, NodeLike>): Set<Id> =>
  new Set(duplicateLabelGroups(nodes).flat());
