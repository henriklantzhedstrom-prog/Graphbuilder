import { temporal } from "zundo";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  BACKGROUND_LAYER_NAME,
  createEmptyDocument,
  createLayer,
  DEFAULT_NOTE,
} from "@/model/defaults";
import { add } from "@/model/geometry";
import { newId } from "@/model/ids";
import type {
  Asset,
  BackgroundImage,
  Box,
  DiagramStyle,
  ElementRef,
  GraphDocument,
  GraphNode,
  Id,
  Layer,
  NodeStyle,
  Note,
  Point,
  Relationship,
  RelationshipStyle,
  Size,
} from "@/model/types";
import { getElement } from "./selectors";

export interface ClipboardContent {
  nodes: GraphNode[];
  relationships: Relationship[];
  notes: Note[];
  images: BackgroundImage[];
  assets: Asset[];
}

export interface DocumentState {
  doc: GraphDocument;

  loadDocument(doc: GraphDocument): void;
  newDocument(name?: string): void;
  renameDocument(name: string): void;

  // Lager
  addLayer(name?: string, atIndex?: number): Id;
  renameLayer(id: Id, name: string): void;
  setLayerVisible(id: Id, visible: boolean): void;
  setLayerLocked(id: Id, locked: boolean): void;
  setLayerOpacity(id: Id, opacity: number): void;
  moveLayer(id: Id, toIndex: number): void;
  /** Tar bort lagret. Innehåll flyttas till `moveContentTo` eller tas bort om det utelämnas. */
  removeLayer(id: Id, moveContentTo?: Id): void;
  moveElementsToLayer(refs: ElementRef[], layerId: Id): void;
  /** Returnerar id för understa lagret "Bakgrund", skapar det om det saknas. */
  ensureBackgroundLayer(): Id;

  // Noder & relationer
  addNode(layerId: Id, position: Point, partial?: Partial<Omit<GraphNode, "id" | "layerId">>): Id;
  updateNode(id: Id, patch: Partial<Omit<GraphNode, "id">>): void;
  addRelationship(
    layerId: Id,
    fromId: Id,
    toId: Id,
    partial?: Partial<Omit<Relationship, "id" | "layerId" | "fromId" | "toId">>,
  ): Id;
  updateRelationship(id: Id, patch: Partial<Omit<Relationship, "id">>): void;
  reverseRelationships(ids: Id[]): void;

  // Anteckningar & bilder
  addNote(layerId: Id, position: Point, partial?: Partial<Omit<Note, "id" | "layerId">>): Id;
  updateNote(id: Id, patch: Partial<Omit<Note, "id">>): void;
  addAsset(asset: Omit<Asset, "id">): Id;
  addImage(
    layerId: Id,
    assetId: Id,
    position: Point,
    size: Size,
    partial?: Partial<Omit<BackgroundImage, "id" | "layerId" | "assetId">>,
  ): Id;
  updateImage(id: Id, patch: Partial<Omit<BackgroundImage, "id">>): void;

  // Gemensamt
  moveElements(refs: ElementRef[], delta: Point): void;
  setElementBox(ref: ElementRef, box: Box): void;
  deleteElements(refs: ElementRef[]): void;
  /** Duplicerar element med förskjutning och returnerar de nya referenserna. */
  duplicateElements(refs: ElementRef[], offset?: Point): ElementRef[];
  copyElements(refs: ElementRef[]): ClipboardContent;
  pasteElements(content: ClipboardContent, layerId: Id, offset?: Point): ElementRef[];
  setProperty(refs: ElementRef[], key: string, value: string): void;
  renameProperty(refs: ElementRef[], oldKey: string, newKey: string): void;
  removeProperty(refs: ElementRef[], key: string): void;

  // Stil
  setDocumentStyle(patch: {
    node?: Partial<NodeStyle>;
    relationship?: Partial<RelationshipStyle>;
    background?: string;
  }): void;
  setNodeStyle(ids: Id[], patch: Partial<NodeStyle>): void;
  setRelationshipStyle(ids: Id[], patch: Partial<RelationshipStyle>): void;
  resetElementStyle(refs: ElementRef[]): void;
}

const touch = (doc: GraphDocument) => {
  doc.updatedAt = new Date().toISOString();
};

const PASTE_OFFSET: Point = { x: 40, y: 40 };

const present = <T>(value: T | undefined): T[] => (value === undefined ? [] : [value]);

function removeOrphanAssets(doc: GraphDocument) {
  const used = new Set(Object.values(doc.images).map((im) => im.assetId));
  for (const id of Object.keys(doc.assets)) {
    if (!used.has(id)) delete doc.assets[id];
  }
}

export const useDocumentStore = create<DocumentState>()(
  temporal(
    immer((set, get) => ({
      doc: createEmptyDocument(),

      loadDocument: (doc) => set({ doc }),
      newDocument: (name) => set({ doc: createEmptyDocument(name) }),
      renameDocument: (name) =>
        set((s) => {
          s.doc.name = name;
          touch(s.doc);
        }),

      addLayer: (name, atIndex) => {
        const layer = createLayer(name ?? `Lager ${get().doc.layers.length + 1}`);
        set((s) => {
          const index = atIndex ?? s.doc.layers.length;
          s.doc.layers.splice(index, 0, layer);
          touch(s.doc);
        });
        return layer.id;
      },
      renameLayer: (id, name) =>
        set((s) => {
          const l = s.doc.layers.find((x) => x.id === id);
          if (l) {
            l.name = name;
            touch(s.doc);
          }
        }),
      setLayerVisible: (id, visible) =>
        set((s) => {
          const l = s.doc.layers.find((x) => x.id === id);
          if (l) {
            l.visible = visible;
            touch(s.doc);
          }
        }),
      setLayerLocked: (id, locked) =>
        set((s) => {
          const l = s.doc.layers.find((x) => x.id === id);
          if (l) {
            l.locked = locked;
            touch(s.doc);
          }
        }),
      setLayerOpacity: (id, opacity) =>
        set((s) => {
          const l = s.doc.layers.find((x) => x.id === id);
          if (l) {
            l.opacity = Math.min(1, Math.max(0, opacity));
            touch(s.doc);
          }
        }),
      moveLayer: (id, toIndex) =>
        set((s) => {
          const from = s.doc.layers.findIndex((x) => x.id === id);
          if (from < 0) return;
          const clamped = Math.min(s.doc.layers.length - 1, Math.max(0, toIndex));
          const [layer] = s.doc.layers.splice(from, 1);
          if (layer) s.doc.layers.splice(clamped, 0, layer);
          touch(s.doc);
        }),
      removeLayer: (id, moveContentTo) =>
        set((s) => {
          if (s.doc.layers.length <= 1) return;
          const index = s.doc.layers.findIndex((x) => x.id === id);
          if (index < 0) return;
          const target =
            moveContentTo && s.doc.layers.some((l) => l.id === moveContentTo && l.id !== id)
              ? moveContentTo
              : undefined;
          const collections = [s.doc.nodes, s.doc.relationships, s.doc.notes, s.doc.images];
          for (const col of collections) {
            for (const [elId, el] of Object.entries(col)) {
              if (el.layerId !== id) continue;
              if (target) el.layerId = target;
              else delete col[elId];
            }
          }
          if (!target) {
            for (const [relId, rel] of Object.entries(s.doc.relationships)) {
              if (!(rel.fromId in s.doc.nodes) || !(rel.toId in s.doc.nodes)) {
                delete s.doc.relationships[relId];
              }
            }
            removeOrphanAssets(s.doc);
          }
          s.doc.layers.splice(index, 1);
          touch(s.doc);
        }),
      moveElementsToLayer: (refs, layerId) =>
        set((s) => {
          if (!s.doc.layers.some((l) => l.id === layerId)) return;
          for (const ref of refs) {
            const el = getElement(s.doc, ref);
            if (el) el.layerId = layerId;
          }
          touch(s.doc);
        }),
      ensureBackgroundLayer: () => {
        const existing = get().doc.layers.find((l) => l.name === BACKGROUND_LAYER_NAME);
        if (existing) return existing.id;
        const layer = createLayer(BACKGROUND_LAYER_NAME);
        set((s) => {
          s.doc.layers.unshift(layer);
          touch(s.doc);
        });
        return layer.id;
      },

      addNode: (layerId, position, partial) => {
        const id = newId("n");
        set((s) => {
          s.doc.nodes[id] = {
            id,
            layerId,
            position,
            caption: "",
            labels: [],
            properties: {},
            style: {},
            ...partial,
          };
          touch(s.doc);
        });
        return id;
      },
      updateNode: (id, patch) =>
        set((s) => {
          const n = s.doc.nodes[id];
          if (n) {
            Object.assign(n, patch);
            touch(s.doc);
          }
        }),
      addRelationship: (layerId, fromId, toId, partial) => {
        const id = newId("r");
        set((s) => {
          if (!(fromId in s.doc.nodes) || !(toId in s.doc.nodes)) return;
          s.doc.relationships[id] = {
            id,
            layerId,
            fromId,
            toId,
            type: "",
            properties: {},
            style: {},
            ...partial,
          };
          touch(s.doc);
        });
        return id;
      },
      updateRelationship: (id, patch) =>
        set((s) => {
          const r = s.doc.relationships[id];
          if (r) {
            Object.assign(r, patch);
            touch(s.doc);
          }
        }),
      reverseRelationships: (ids) =>
        set((s) => {
          for (const id of ids) {
            const r = s.doc.relationships[id];
            if (r) [r.fromId, r.toId] = [r.toId, r.fromId];
          }
          touch(s.doc);
        }),

      addNote: (layerId, position, partial) => {
        const id = newId("t");
        set((s) => {
          s.doc.notes[id] = { id, layerId, position, ...DEFAULT_NOTE, ...partial };
          touch(s.doc);
        });
        return id;
      },
      updateNote: (id, patch) =>
        set((s) => {
          const n = s.doc.notes[id];
          if (n) {
            Object.assign(n, patch);
            touch(s.doc);
          }
        }),
      addAsset: (asset) => {
        const existing = Object.values(get().doc.assets).find((a) => a.dataUrl === asset.dataUrl);
        if (existing) return existing.id;
        const id = newId("a");
        set((s) => {
          s.doc.assets[id] = { id, ...asset };
          touch(s.doc);
        });
        return id;
      },
      addImage: (layerId, assetId, position, size, partial) => {
        const id = newId("i");
        set((s) => {
          if (!(assetId in s.doc.assets)) return;
          s.doc.images[id] = {
            id,
            layerId,
            assetId,
            position,
            size,
            opacity: 1,
            locked: false,
            ...partial,
          };
          touch(s.doc);
        });
        return id;
      },
      updateImage: (id, patch) =>
        set((s) => {
          const im = s.doc.images[id];
          if (im) {
            Object.assign(im, patch);
            touch(s.doc);
          }
        }),

      moveElements: (refs, delta) =>
        set((s) => {
          for (const ref of refs) {
            if (ref.kind === "relationship") continue;
            const el = getElement(s.doc, ref) as GraphNode | Note | BackgroundImage | undefined;
            if (el) el.position = add(el.position, delta);
          }
          touch(s.doc);
        }),
      setElementBox: (ref, box) =>
        set((s) => {
          if (ref.kind !== "note" && ref.kind !== "image") return;
          const el = getElement(s.doc, ref) as Note | BackgroundImage | undefined;
          if (!el) return;
          el.position = { x: box.x, y: box.y };
          el.size = { w: Math.max(20, box.w), h: Math.max(20, box.h) };
          touch(s.doc);
        }),
      deleteElements: (refs) =>
        set((s) => {
          for (const ref of refs) {
            switch (ref.kind) {
              case "node": {
                delete s.doc.nodes[ref.id];
                for (const [rid, r] of Object.entries(s.doc.relationships)) {
                  if (r.fromId === ref.id || r.toId === ref.id) delete s.doc.relationships[rid];
                }
                break;
              }
              case "relationship":
                delete s.doc.relationships[ref.id];
                break;
              case "note":
                delete s.doc.notes[ref.id];
                break;
              case "image":
                delete s.doc.images[ref.id];
                break;
            }
          }
          removeOrphanAssets(s.doc);
          touch(s.doc);
        }),
      copyElements: (refs) => {
        const doc = get().doc;
        const nodeIds = new Set(refs.filter((r) => r.kind === "node").map((r) => r.id));
        const nodes = [...nodeIds].flatMap((id) => present(doc.nodes[id]));
        const relationships = Object.values(doc.relationships).filter(
          (r) =>
            (refs.some((ref) => ref.kind === "relationship" && ref.id === r.id) ||
              (nodeIds.has(r.fromId) && nodeIds.has(r.toId))) &&
            nodeIds.has(r.fromId) &&
            nodeIds.has(r.toId),
        );
        const notes = refs
          .filter((r) => r.kind === "note")
          .flatMap((r) => present(doc.notes[r.id]));
        const images = refs
          .filter((r) => r.kind === "image")
          .flatMap((r) => present(doc.images[r.id]));
        const assetIds = new Set(images.map((im) => im.assetId));
        const assets = [...assetIds].flatMap((id) => present(doc.assets[id]));
        return structuredClone({ nodes, relationships, notes, images, assets });
      },
      pasteElements: (content, layerId, offset = PASTE_OFFSET) => {
        const idMap = new Map<Id, Id>();
        const created: ElementRef[] = [];
        set((s) => {
          if (!s.doc.layers.some((l) => l.id === layerId)) return;
          for (const asset of content.assets) {
            const existing = Object.values(s.doc.assets).find((a) => a.dataUrl === asset.dataUrl);
            if (existing) {
              idMap.set(asset.id, existing.id);
            } else {
              const id = newId("a");
              s.doc.assets[id] = { ...asset, id };
              idMap.set(asset.id, id);
            }
          }
          for (const node of content.nodes) {
            const id = newId("n");
            idMap.set(node.id, id);
            s.doc.nodes[id] = { ...node, id, layerId, position: add(node.position, offset) };
            created.push({ kind: "node", id });
          }
          for (const rel of content.relationships) {
            const fromId = idMap.get(rel.fromId);
            const toId = idMap.get(rel.toId);
            if (!fromId || !toId) continue;
            const id = newId("r");
            s.doc.relationships[id] = { ...rel, id, layerId, fromId, toId };
            created.push({ kind: "relationship", id });
          }
          for (const note of content.notes) {
            const id = newId("t");
            s.doc.notes[id] = { ...note, id, layerId, position: add(note.position, offset) };
            created.push({ kind: "note", id });
          }
          for (const image of content.images) {
            const assetId = idMap.get(image.assetId);
            if (!assetId) continue;
            const id = newId("i");
            s.doc.images[id] = {
              ...image,
              id,
              layerId,
              assetId,
              position: add(image.position, offset),
            };
            created.push({ kind: "image", id });
          }
          touch(s.doc);
        });
        return created;
      },
      duplicateElements: (refs, offset = PASTE_OFFSET) => {
        const content = get().copyElements(refs);
        const first = refs[0];
        const layerId = first ? getElement(get().doc, first)?.layerId : undefined;
        const fallback = get().doc.layers[0]?.id;
        const target = layerId ?? fallback;
        if (!target) return [];
        return get().pasteElements(content, target, offset);
      },
      setProperty: (refs, key, value) =>
        set((s) => {
          for (const ref of refs) {
            if (ref.kind !== "node" && ref.kind !== "relationship") continue;
            const el = getElement(s.doc, ref) as GraphNode | Relationship | undefined;
            if (el) el.properties[key] = value;
          }
          touch(s.doc);
        }),
      renameProperty: (refs, oldKey, newKey) =>
        set((s) => {
          if (oldKey === newKey) return;
          for (const ref of refs) {
            if (ref.kind !== "node" && ref.kind !== "relationship") continue;
            const el = getElement(s.doc, ref) as GraphNode | Relationship | undefined;
            if (!el || !(oldKey in el.properties)) continue;
            const entries = Object.entries(el.properties).map(([k, v]) =>
              k === oldKey ? [newKey, v] : [k, v],
            );
            el.properties = Object.fromEntries(entries);
          }
          touch(s.doc);
        }),
      removeProperty: (refs, key) =>
        set((s) => {
          for (const ref of refs) {
            if (ref.kind !== "node" && ref.kind !== "relationship") continue;
            const el = getElement(s.doc, ref) as GraphNode | Relationship | undefined;
            if (el) delete el.properties[key];
          }
          touch(s.doc);
        }),

      setDocumentStyle: (patch) =>
        set((s) => {
          if (patch.node) Object.assign(s.doc.style.node, patch.node);
          if (patch.relationship) Object.assign(s.doc.style.relationship, patch.relationship);
          if (patch.background !== undefined) s.doc.style.background = patch.background;
          touch(s.doc);
        }),
      setNodeStyle: (ids, patch) =>
        set((s) => {
          for (const id of ids) {
            const n = s.doc.nodes[id];
            if (n) Object.assign(n.style, patch);
          }
          touch(s.doc);
        }),
      setRelationshipStyle: (ids, patch) =>
        set((s) => {
          for (const id of ids) {
            const r = s.doc.relationships[id];
            if (r) Object.assign(r.style, patch);
          }
          touch(s.doc);
        }),
      resetElementStyle: (refs) =>
        set((s) => {
          for (const ref of refs) {
            if (ref.kind === "node") {
              const n = s.doc.nodes[ref.id];
              if (n) n.style = {};
            } else if (ref.kind === "relationship") {
              const r = s.doc.relationships[ref.id];
              if (r) r.style = {};
            }
          }
          touch(s.doc);
        }),
    })),
    {
      partialize: (state) => ({ doc: state.doc }),
      equality: (a, b) => a.doc === b.doc,
      limit: 200,
    },
  ),
);

export const useTemporal = useDocumentStore.temporal;

export const undo = () => useDocumentStore.temporal.getState().undo();
export const redo = () => useDocumentStore.temporal.getState().redo();
export const clearHistory = () => useDocumentStore.temporal.getState().clear();

export type { DiagramStyle, Layer };
