import type { GraphDocument } from "@/model/types";
import { isRelationshipVisible } from "@/store/selectors";

/** Kopia av dokumentet med bara synliga lager och deras element. */
export function visibleDocument(doc: GraphDocument): GraphDocument {
  const visibleIds = new Set(doc.layers.filter((l) => l.visible).map((l) => l.id));
  const keep = <T extends { layerId: string }>(table: Record<string, T>) =>
    Object.fromEntries(Object.entries(table).filter(([, el]) => visibleIds.has(el.layerId)));
  const nodes = keep(doc.nodes);
  const relationships = Object.fromEntries(
    Object.entries(doc.relationships).filter(
      ([, r]) => isRelationshipVisible(doc, r) && r.fromId in nodes && r.toId in nodes,
    ),
  );
  const images = keep(doc.images);
  const usedAssets = new Set(Object.values(images).map((im) => im.assetId));
  return {
    ...doc,
    layers: doc.layers.filter((l) => l.visible),
    nodes,
    relationships,
    notes: keep(doc.notes),
    images,
    assets: Object.fromEntries(Object.entries(doc.assets).filter(([id]) => usedAssets.has(id))),
  };
}

export const selectDocument = (doc: GraphDocument, onlyVisible: boolean): GraphDocument =>
  onlyVisible ? visibleDocument(doc) : doc;
