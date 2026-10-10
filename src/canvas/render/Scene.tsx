import { memo } from "react";
import { type BundleInfo, type RelationshipGeometry, relationshipGeometry } from "@/model/geometry";
import { conflictingNodeIds } from "@/model/labels";
import type { Box, ElementRef, GraphDocument, Id, Note, Point, Relationship } from "@/model/types";
import {
  imageBox,
  nodeOuterRadius,
  noteBox,
  refKey,
  relationshipBundles,
  renderGroups,
  resolvedNodeStyle,
  resolvedRelationshipStyle,
  visibleNotes,
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
  /** Element vars labels och egenskaper redigeras på ritytan just nu; de ritas då inte. */
  detailsKey?: string | null;
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
      fromRadius: fromStyle.radius,
      to: nodePositionWithOverrides(doc, rel.toId, overrides) ?? to.position,
      // …och pilspetsen slutar precis utanför kanten så att den syns helt.
      toRadius: style.directed ? nodeOuterRadius(toStyle) : toStyle.radius,
    },
    bundle,
    // Pilspetsen är aldrig smalare än linjen, annars sticker en tjock linje ut bredvid spetsen.
    {
      arrowSize: style.arrowSize > 0 ? Math.max(style.arrowSize, style.width * 0.75) : 0,
      directed: style.directed,
    },
  );
}

/** Färgen på den streckade linjen mellan en anteckning och det den är knuten till. */
const NOTE_LINK_COLOR = "#8e8e93";

/** Punkten en anteckning är knuten till, med hänsyn till noder som just nu dras. */
function noteAnchorWithOverrides(
  doc: GraphDocument,
  note: Note,
  overrides?: SceneOverrides,
): Point | null {
  const anchor = note.attachedTo;
  if (!anchor) return null;
  if (anchor.kind === "node") return nodePositionWithOverrides(doc, anchor.id, overrides);
  const rel = doc.relationships[anchor.id];
  const from = rel ? nodePositionWithOverrides(doc, rel.fromId, overrides) : null;
  const to = rel ? nodePositionWithOverrides(doc, rel.toId, overrides) : null;
  if (!from || !to) return null;
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

/** Ritas bara om när något av det som visas ändras, inte när vyn flyttas eller zoomas. */
export const Scene = memo(function Scene({
  doc,
  overrides,
  interactive = false,
  editing,
  layerFilter,
  selectedKeys,
  highlightNodeId,
  detailsKey,
  zoom = 1,
  canResize,
}: SceneProps) {
  const bundles = relationshipBundles(doc);
  // Krockande labels markeras bara på ritytan, aldrig i export.
  const conflicts = interactive ? conflictingNodeIds(doc.nodes) : new Set<Id>();
  const isSelected = (key: string) => selectedKeys?.has(key) ?? false;
  const groups = renderGroups(doc).filter((g) => !layerFilter || layerFilter(g.layer.id));
  // Relationer syns när båda ändnoderna (och relationens eventuella eget lager) syns.
  const relationships = visibleRelationships(doc, layerFilter);
  const isEditing = (ref: ElementRef) =>
    editing !== null && editing !== undefined && refKey(editing) === refKey(ref);
  // Anteckningar ligger överst, i det fasta lagret "Notes". En knuten anteckning får en tunn
  // streckad linje till det den hör till, så att kopplingen syns.
  const notes = visibleNotes(doc).map((note) => {
    const base = overrides?.boxes?.get(`note:${note.id}`) ?? noteBox(note);
    const pos = overrides?.positions?.get(`note:${note.id}`);
    const box = pos ? { ...base, x: pos.x, y: pos.y } : base;
    return { note, box, anchor: noteAnchorWithOverrides(doc, note, overrides) };
  });

  // Ritordning: bilder underst, sedan anteckningarnas länkar och alla relationer, sedan alla
  // noder och överst anteckningarna. Lagerordningen gäller för bilder och noder.
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
      <g data-kind="note-links" style={{ pointerEvents: "none" }}>
        {notes.map(({ note, box, anchor }) => {
          if (!anchor) return null;
          // Linjen går från det anteckningen är knuten till fram till anteckningens närmaste kant.
          const end = {
            x: Math.min(box.x + box.w, Math.max(box.x, anchor.x)),
            y: Math.min(box.y + box.h, Math.max(box.y, anchor.y)),
          };
          if (end.x === anchor.x && end.y === anchor.y) return null;
          return (
            <line
              key={note.id}
              data-part="note-link"
              x1={anchor.x}
              y1={anchor.y}
              x2={end.x}
              y2={end.y}
              stroke={NOTE_LINK_COLOR}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          );
        })}
      </g>
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
              showProperties={doc.propertiesVisible && detailsKey !== `relationship:${rel.id}`}
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
              showProperties={doc.propertiesVisible && detailsKey !== `node:${node.id}`}
              hideLabels={detailsKey === `node:${node.id}`}
            />
          ))}
        </g>
      ))}
      <g data-kind="notes">
        {notes.map(({ note, box }) => {
          const key = `note:${note.id}`;
          return (
            <g key={note.id}>
              <NoteView
                note={note}
                box={box}
                interactive={interactive}
                hideText={isEditing({ kind: "note", id: note.id })}
              />
              {isSelected(key) && (
                <SelectionBox
                  box={box}
                  refKey={key}
                  zoom={zoom}
                  resizable={canResize?.({ kind: "note", id: note.id }) ?? true}
                />
              )}
            </g>
          );
        })}
      </g>
    </>
  );
});
