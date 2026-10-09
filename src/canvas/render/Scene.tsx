import { type BundleInfo, type RelationshipGeometry, relationshipGeometry } from "@/model/geometry";
import { conflictingNodeIds } from "@/model/labels";
import type { Box, ElementRef, GraphDocument, Id, Point, Relationship } from "@/model/types";
import {
  imageBox,
  noteBox,
  refKey,
  relationshipBundles,
  renderGroups,
  resolvedNodeStyle,
  resolvedRelationshipStyle,
  visibleRelationships,
} from "@/store/selectors";
import { ImageView } from "./ImageView";
import { NodeView } from "./NodeView";
import { NoteView } from "./NoteView";
import { RelationshipView } from "./RelationshipView";
import { SelectionBox } from "./SelectionBox";

export interface SceneOverrides {
  /** Tillfälliga positioner under drag, nyckel = refKey */
  positions?: Map<string, Point>;
  /** Tillfällig box under storleksändring */
  boxes?: Map<string, Box>;
}

export interface SceneProps {
  doc: GraphDocument;
  overrides?: SceneOverrides;
  interactive?: boolean;
  editing?: ElementRef | null;
  /** Begränsa till dessa lager-id:n (t.ex. export av synliga lager). */
  layerFilter?: (layerId: Id) => boolean;
  selectedKeys?: ReadonlySet<string>;
  highlightNodeId?: Id | null;
  zoom?: number;
  /** Sant om elementet går att ändra storlek på (olåst). */
  canResize?: (ref: ElementRef) => boolean;
}

export function nodePositionWithOverrides(
  doc: GraphDocument,
  nodeId: Id,
  overrides?: SceneOverrides,
): Point | null {
  const node = doc.nodes[nodeId];
  if (!node) return null;
  return overrides?.positions?.get(`node:${nodeId}`) ?? node.position;
}

/** Ren rendering av hela dokumentet i lagerordning. Används av både ritytan och SVG-exporten. */
export function computeRelationshipGeometry(
  doc: GraphDocument,
  rel: Relationship,
  bundles: Map<Id, BundleInfo>,
  overrides?: SceneOverrides,
): RelationshipGeometry | null {
  const from = doc.nodes[rel.fromId];
  const to = doc.nodes[rel.toId];
  if (!from || !to) return null;
  const style = resolvedRelationshipStyle(doc, rel);
  const bundle: BundleInfo = bundles.get(rel.id) ?? { index: 0, count: 1, reversed: false };
  const fromStyle = resolvedNodeStyle(doc, from);
  const toStyle = resolvedNodeStyle(doc, to);
  return relationshipGeometry(
    {
      from: nodePositionWithOverrides(doc, rel.fromId, overrides) ?? from.position,
      // Linjen börjar under nodens kant (noden ritas ovanpå) så att ingen linje syns över kanten…
      fromRadius: Math.max(0, fromStyle.radius - fromStyle.strokeWidth / 2),
      to: nodePositionWithOverrides(doc, rel.toId, overrides) ?? to.position,
      // …och pilspetsen slutar precis utanför kanten så att den syns helt.
      toRadius: style.directed
        ? toStyle.radius + toStyle.strokeWidth / 2
        : Math.max(0, toStyle.radius - toStyle.strokeWidth / 2),
    },
    bundle,
    { arrowSize: style.arrowSize, directed: style.directed },
  );
}

export function Scene({
  doc,
  overrides,
  interactive = false,
  editing,
  layerFilter,
  selectedKeys,
  highlightNodeId,
  zoom = 1,
  canResize,
}: SceneProps) {
  const bundles = relationshipBundles(doc);
  // Krockande labels markeras bara på ritytan, aldrig i export.
  const conflicts = interactive ? conflictingNodeIds(doc.nodes) : new Set<Id>();
  const isSelected = (key: string) => selectedKeys?.has(key) ?? false;
  const groups = renderGroups(doc).filter((g) => !layerFilter || layerFilter(g.layer.id));
  // Relationer har inget lager: de syns när båda ändnoderna syns.
  const relationships = visibleRelationships(doc, layerFilter);
  const isEditing = (ref: ElementRef) =>
    editing !== null && editing !== undefined && refKey(editing) === refKey(ref);

  // Ritordning: bilder underst, sedan alla relationer, sedan alla noder, sedan anteckningar.
  // Lagerordningen gäller för bilder, noder och anteckningar; relationer ligger alltid bakom noderna.
  return (
    <>
      {groups.map(({ layer, images }) => (
        <g key={`images:${layer.id}`} data-layer={layer.id} data-kind="images">
          {images.map((image) => {
            const asset = doc.assets[image.assetId];
            if (!asset) return null;
            const box = overrides?.boxes?.get(`image:${image.id}`) ?? imageBox(image);
            const pos = overrides?.positions?.get(`image:${image.id}`);
            const effective = pos ? { ...box, x: pos.x, y: pos.y } : box;
            const key = `image:${image.id}`;
            return (
              <g key={image.id}>
                <ImageView image={image} asset={asset} box={effective} interactive={interactive} />
                {isSelected(key) && (
                  <SelectionBox
                    box={effective}
                    refKey={key}
                    zoom={zoom}
                    resizable={canResize?.({ kind: "image", id: image.id }) ?? true}
                  />
                )}
              </g>
            );
          })}
        </g>
      ))}
      <g data-kind="relationships">
        {relationships.map((rel) => {
          const geometry = computeRelationshipGeometry(doc, rel, bundles, overrides);
          if (!geometry) return null;
          return (
            <RelationshipView
              key={rel.id}
              relationship={rel}
              style={resolvedRelationshipStyle(doc, rel)}
              geometry={geometry}
              interactive={interactive}
              hideType={isEditing({ kind: "relationship", id: rel.id })}
              selected={isSelected(`relationship:${rel.id}`)}
              zoom={zoom}
            />
          );
        })}
      </g>
      {groups.map(({ layer, nodes }) => (
        <g key={`nodes:${layer.id}`} data-layer={layer.id} data-kind="nodes">
          {nodes.map((node) => (
            <NodeView
              key={node.id}
              node={node}
              style={resolvedNodeStyle(doc, node)}
              position={nodePositionWithOverrides(doc, node.id, overrides) ?? node.position}
              interactive={interactive}
              hideCaption={isEditing({ kind: "node", id: node.id })}
              selected={isSelected(`node:${node.id}`)}
              highlighted={highlightNodeId === node.id}
              conflict={conflicts.has(node.id)}
              zoom={zoom}
            />
          ))}
        </g>
      ))}
      {groups.map(({ layer, notes }) => (
        <g key={`notes:${layer.id}`} data-layer={layer.id} data-kind="notes">
          {notes.map((note) => {
            const box = overrides?.boxes?.get(`note:${note.id}`) ?? noteBox(note);
            const pos = overrides?.positions?.get(`note:${note.id}`);
            const effective = pos ? { ...box, x: pos.x, y: pos.y } : box;
            const key = `note:${note.id}`;
            return (
              <g key={note.id}>
                <NoteView
                  note={note}
                  box={effective}
                  interactive={interactive}
                  hideText={isEditing({ kind: "note", id: note.id })}
                />
                {isSelected(key) && (
                  <SelectionBox
                    box={effective}
                    refKey={key}
                    zoom={zoom}
                    resizable={canResize?.({ kind: "note", id: note.id }) ?? true}
                  />
                )}
              </g>
            );
          })}
        </g>
      ))}
    </>
  );
}
