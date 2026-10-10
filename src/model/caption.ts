import type { GraphNode } from "./types";

/** Egenskap som används som rubrik när en ny nod får en rubrik direkt på ritytan. */
export const DEFAULT_CAPTION_KEY = "name";

/** Nodens rubrik = värdet på den egenskap som är markerad som rubrik. */
export const nodeCaption = (node: Pick<GraphNode, "captionKey" | "properties">): string =>
  node.captionKey ? (node.properties[node.captionKey] ?? "") : "";

/**
 * En nod utan rubrik visar sin label inne i cirkeln (flera labels på var sin rad). Då ritas inga
 * labelbrickor ovanför noden: namnet står redan i den.
 */
export const showsLabelsAsCaption = (
  node: Pick<GraphNode, "captionKey" | "properties" | "labels">,
): boolean => nodeCaption(node) === "" && node.labels.length > 0;

/** Det som står inne i noden: rubriken, eller nodens labels när den saknar rubrik. */
export const nodeDisplayName = (
  node: Pick<GraphNode, "captionKey" | "properties" | "labels">,
): string => nodeCaption(node) || node.labels.join(", ");

/** Väljer nyckel för en rubrik som ska sparas som egenskap: "name", eller en ledig variant. */
export function captionKeyFor(properties: Record<string, string>, value: string): string {
  const existing = properties[DEFAULT_CAPTION_KEY];
  if (existing === undefined || existing === "" || existing === value) return DEFAULT_CAPTION_KEY;
  if (properties.caption === undefined || properties.caption === value) return "caption";
  let i = 2;
  while (properties[`caption${i}`] !== undefined) i++;
  return `caption${i}`;
}
