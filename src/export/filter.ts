import type { GraphDocument } from "@/model/types";
import { isNoteVisible, isRelationshipVisible } from "@/store/selectors";

/** Kopia av dokumentet med bara synliga lager, deras element och relationer mellan synliga noder. */
export function visibleDocument(doc: GraphDocument): GraphDocument {
  const visibleIds = new Set(doc.layers.filter((l) => l.visible).map((l) => l.id));
  const keep = <T extends { layerId: string }>(table: Record<string, T>) =>
    Object.fromEntries(Object.entries(table).filter(([, el]) => visibleIds.has(el.layerId)));
  const nodes = keep(doc.nodes);
  const relationships = Object.fromEntries(
    Object.entries(doc.relationships).filter(([, r]) => isRelationshipVisible(doc, r)),
  );
  const images = keep(doc.images);
  const usedAssets = new Set(Object.values(images).map((im) => im.assetId));
  return {
    ...doc,
    layers: doc.layers.filter((l) => l.visible),
    nodes,
    relationships,
    notes: Object.fromEntries(
      Object.entries(doc.notes).filter(([, note]) => isNoteVisible(doc, note)),
    ),
    images,
    assets: Object.fromEntries(Object.entries(doc.assets).filter(([id]) => usedAssets.has(id))),
  };
}

export const selectDocument = (doc: GraphDocument, onlyVisible: boolean): GraphDocument =>
  onlyVisible ? visibleDocument(doc) : doc;
