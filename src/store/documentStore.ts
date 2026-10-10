import { temporal } from "zundo";
import { create, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { t } from "@/i18n";
import { captionKeyFor } from "@/model/caption";
import {
  BACKGROUND_LAYER_NAME,
  createEmptyDocument,
  createLayer,
  DEFAULT_NOTE,
} from "@/model/defaults";
import { add } from "@/model/geometry";
import { newId } from "@/model/ids";
import { findLabelConflict, type LabelConflict } from "@/model/labels";
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
  NoteAnchor,
  Point,
  Relationship,
  RelationshipStyle,
  Size,
} from "@/model/types";
import {
  attachedNoteMoves,
  elementLayerId,
  getElement,
  isElementVisible,
  isRelationshipVisible,
} from "./selectors";

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
  /** Visar eller döljer alla lager på en gång (det fasta lagret "Properties" rörs inte). */
  setAllLayersVisible(visible: boolean): void;
  setLayerLocked(id: Id, locked: boolean): void;
  /** Visar eller döljer det fasta lagret "Properties" (egenskapsraderna på ritytan). */
  setPropertiesVisible(visible: boolean): void;
  moveLayer(id: Id, toIndex: number): void;
  /** Tar bort lagret. Innehåll flyttas till `moveContentTo` eller tas bort om det utelämnas. */
  removeLayer(id: Id, moveContentTo?: Id): void;
  moveElementsToLayer(refs: ElementRef[], layerId: Id): void;
  /** Gör relationerna till standardrelationer igen: inget eget lager, de följer sina ändnoder. */
  clearRelationshipLayer(ids: Id[]): void;
  /** Returnerar id för understa lagret "Bakgrund", skapar det om det saknas. */
  ensureBackgroundLayer(): Id;

  // Noder & relationer
  addNode(layerId: Id, position: Point, partial?: Partial<Omit<GraphNode, "id" | "layerId">>): Id;
  /** Ändrar allt utom labels; labels ändras bara via setNodeLabels så att de förblir unika. */
  updateNode(id: Id, patch: Partial<Omit<GraphNode, "id">>): void;
  /** Sätter labels på en eller flera noder. Ändrar ingenting om någon kombination skulle krocka. */
  setNodeLabels(
    changes: { id: Id; labels: string[] }[],
  ): { ok: true } | { ok: false; conflict: LabelConflict };
  addRelationship(
    fromId: Id,
    toId: Id,
    partial?: Partial<Omit<Relationship, "id" | "fromId" | "toId">>,
  ): Id;
  updateRelationship(id: Id, patch: Partial<Omit<Relationship, "id">>): void;
  reverseRelationships(ids: Id[]): void;

  // Anteckningar & bilder
  addNote(position: Point, partial?: Partial<Omit<Note, "id">>): Id;
  /** Knyter anteckningen till en nod eller relation, eller gör den fri igen (null). */
  attachNote(id: Id, anchor: NoteAnchor | null): void;
  /** Visar eller döljer det fasta lagret "Notes" (alla anteckningar). */
  setNotesVisible(visible: boolean): void;
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
  /** Sätter nya lägen för noder och anteckningar i ett steg (automatisk placering). */
  applyPositions(positions: { nodes: Record<Id, Point>; notes: Record<Id, Point> }): void;
  deleteElements(refs: ElementRef[]): void;
  /** Duplicerar element med förskjutning och returnerar de nya referenserna. */
  duplicateElements(refs: ElementRef[], offset?: Point): ElementRef[];
  copyElements(refs: ElementRef[]): ClipboardContent;
  pasteElements(content: ClipboardContent, layerId: Id, offset?: Point): ElementRef[];
  setProperty(refs: ElementRef[], key: string, value: string): void;
  renameProperty(refs: ElementRef[], oldKey: string, newKey: string): void;
  removeProperty(refs: ElementRef[], key: string): void;
  /** Markerar vilken egenskap som är nodens rubrik (null = ingen). */
  setCaptionKey(nodeIds: Id[], key: string | null): void;
  /** Sätter rubrikens text; skapar rubrikegenskapen om noden saknar en. */
  setCaption(nodeId: Id, text: string): void;

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

/**
 * Sätter nya standardvärden och låter alla synliga element följa dem (deras egna värden för
 * samma nycklar tas bort). Dolda element som följde standarden får det gamla värdet som eget,
 * så att de ser likadana ut när de visas igen.
 */
function applyToVisible<S extends object, E extends { style: Partial<S> }>(
  elements: E[],
  defaults: S,
  patch: Partial<S>,
  isVisible: (el: E) => boolean,
): void {
  const keys = Object.keys(patch) as (keyof S)[];
  for (const el of elements) {
    const visible = isVisible(el);
    for (const key of keys) {
      if (visible) delete el.style[key];
      else if (el.style[key] === undefined) el.style[key] = defaults[key];
    }
  }
  Object.assign(defaults, patch);
}

/** Anteckningar knutna till något som tagits bort blir fria (de ligger kvar där de är). */
function detachOrphanNotes(doc: GraphDocument) {
  for (const note of Object.values(doc.notes)) {
    const anchor = note.attachedTo;
    if (!anchor) continue;
    const table = anchor.kind === "node" ? doc.nodes : doc.relationships;
    if (!(anchor.id in table)) delete note.attachedTo;
  }
}

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
        const layer = createLayer(name ?? t.layers.defaultName(get().doc.layers.length + 1));
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
      setAllLayersVisible: (visible) =>
        set((s) => {
          if (s.doc.layers.every((l) => l.visible === visible)) return;
          for (const l of s.doc.layers) l.visible = visible;
          touch(s.doc);
        }),
      setPropertiesVisible: (visible) =>
        set((s) => {
          s.doc.propertiesVisible = visible;
          touch(s.doc);
        }),
      setLayerLocked: (id, locked) =>
        set((s) => {
          const l = s.doc.layers.find((x) => x.id === id);
          if (l) {
            l.locked = locked;
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
          // Relationer som lagts i lagret följer med innehållet; övriga relationer försvinner
          // bara om någon av ändnoderna tas bort.
          const collections = [s.doc.nodes, s.doc.images, s.doc.relationships];
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
            detachOrphanNotes(s.doc);
          }
          s.doc.layers.splice(index, 1);
          touch(s.doc);
        }),
      moveElementsToLayer: (refs, layerId) =>
        set((s) => {
          if (!s.doc.layers.some((l) => l.id === layerId)) return;
          for (const ref of refs) {
            // Anteckningar ligger i det fasta lagret "Notes" och flyttas inte mellan lager.
            if (ref.kind === "note") continue;
            const el = getElement(s.doc, ref) as
              | GraphNode
              | Relationship
              | BackgroundImage
              | undefined;
            if (el) el.layerId = layerId;
          }
          touch(s.doc);
        }),
      clearRelationshipLayer: (ids) =>
        set((s) => {
          for (const id of ids) {
            const rel = s.doc.relationships[id];
            if (rel) delete rel.layerId;
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
            captionKey: null,
            labels: [],
            properties: {},
            style: {},
            ...partial,
          };
          const labels = s.doc.nodes[id]?.labels ?? [];
          if (findLabelConflict(s.doc.nodes, [{ id, labels }])) {
            (s.doc.nodes[id] as GraphNode).labels = [];
          }
          touch(s.doc);
        });
        return id;
      },
      updateNode: (id, patch) =>
        set((s) => {
          const n = s.doc.nodes[id];
          if (n) {
            const { labels: _ignored, ...rest } = patch;
            Object.assign(n, rest);
            touch(s.doc);
          }
        }),
      setNodeLabels: (changes) => {
        const existing = changes.filter((c) => c.id in get().doc.nodes);
        const conflict = findLabelConflict(get().doc.nodes, existing);
        if (conflict) return { ok: false, conflict };
        set((s) => {
          for (const c of existing) {
            const n = s.doc.nodes[c.id];
            if (n) n.labels = [...new Set(c.labels.map((l) => l.trim()).filter(Boolean))];
          }
          touch(s.doc);
        });
        return { ok: true };
      },
      addRelationship: (fromId, toId, partial) => {
        const id = newId("r");
        set((s) => {
          if (!(fromId in s.doc.nodes) || !(toId in s.doc.nodes)) return;
          s.doc.relationships[id] = {
            id,
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

      attachNote: (id, anchor) =>
        set((s) => {
          const note = s.doc.notes[id];
          if (!note) return;
          const exists =
            anchor && anchor.id in (anchor.kind === "node" ? s.doc.nodes : s.doc.relationships);
          if (exists) note.attachedTo = { kind: anchor.kind, id: anchor.id };
          else delete note.attachedTo;
          touch(s.doc);
        }),
      setNotesVisible: (visible) =>
        set((s) => {
          s.doc.notesVisible = visible;
          touch(s.doc);
        }),
      addNote: (position, partial) => {
        const id = newId("t");
        set((s) => {
          s.doc.notes[id] = { id, position, ...DEFAULT_NOTE, ...partial };
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
          // Anteckningar som är knutna till de flyttade noderna följer med (om de inte själva
          // är med i flytten).
          const movedNodes = new Set(refs.filter((r) => r.kind === "node").map((r) => r.id));
          const movedNotes = new Set(refs.filter((r) => r.kind === "note").map((r) => r.id));
          const followers = attachedNoteMoves(s.doc, movedNodes, delta, movedNotes);
          for (const ref of refs) {
            if (ref.kind === "relationship") continue;
            const el = getElement(s.doc, ref) as GraphNode | Note | BackgroundImage | undefined;
            if (el) el.position = add(el.position, delta);
          }
          for (const [noteId, move] of followers) {
            const note = s.doc.notes[noteId];
            if (note) note.position = add(note.position, move);
          }
          touch(s.doc);
        }),
      applyPositions: ({ nodes, notes }) =>
        set((s) => {
          for (const [id, position] of Object.entries(nodes)) {
            const node = s.doc.nodes[id];
            if (node) node.position = { x: position.x, y: position.y };
          }
          for (const [id, position] of Object.entries(notes)) {
            const note = s.doc.notes[id];
            if (note) note.position = { x: position.x, y: position.y };
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
          detachOrphanNotes(s.doc);
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
            // En kopia får inte ha samma labels som en befintlig nod; då klistras den in utan labels.
            const labels = findLabelConflict(s.doc.nodes, [{ id, labels: node.labels }])
              ? []
              : node.labels;
            s.doc.nodes[id] = {
              ...node,
              id,
              layerId,
              labels,
              position: add(node.position, offset),
            };
            created.push({ kind: "node", id });
          }
          for (const rel of content.relationships) {
            const fromId = idMap.get(rel.fromId);
            const toId = idMap.get(rel.toId);
            if (!fromId || !toId) continue;
            const id = newId("r");
            idMap.set(rel.id, id);
            // En relation som låg i ett lager hamnar i mållagret, precis som noderna.
            const { layerId: sourceLayerId, ...rest } = rel;
            s.doc.relationships[id] = {
              ...rest,
              id,
              fromId,
              toId,
              ...(sourceLayerId === undefined ? {} : { layerId }),
            };
            created.push({ kind: "relationship", id });
          }
          for (const note of content.notes) {
            const id = newId("t");
            // Kopieras det anteckningen är knuten till följer kopian med den nya noden/relationen;
            // annars sitter kopian kvar på samma som originalet.
            const anchor = note.attachedTo;
            const copiedAnchor = anchor ? idMap.get(anchor.id) : undefined;
            s.doc.notes[id] = {
              ...note,
              id,
              position: add(note.position, offset),
              ...(anchor && copiedAnchor
                ? { attachedTo: { kind: anchor.kind, id: copiedAnchor } }
                : {}),
            };
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
        const doc = get().doc;
        const layerId = refs.map((r) => elementLayerId(doc, r)).find((id) => id !== undefined);
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
            if (ref.kind === "node" && (el as GraphNode).captionKey === oldKey) {
              (el as GraphNode).captionKey = newKey;
            }
          }
          touch(s.doc);
        }),
      removeProperty: (refs, key) =>
        set((s) => {
          for (const ref of refs) {
            if (ref.kind !== "node" && ref.kind !== "relationship") continue;
            const el = getElement(s.doc, ref) as GraphNode | Relationship | undefined;
            if (!el) continue;
            delete el.properties[key];
            if (ref.kind === "node" && (el as GraphNode).captionKey === key) {
              (el as GraphNode).captionKey = null;
            }
          }
          touch(s.doc);
        }),
      setCaptionKey: (nodeIds, key) =>
        set((s) => {
          for (const id of nodeIds) {
            const n = s.doc.nodes[id];
            if (!n) continue;
            if (key === null) n.captionKey = null;
            else if (key in n.properties) n.captionKey = key;
          }
          touch(s.doc);
        }),
      setCaption: (nodeId, text) =>
        set((s) => {
          const n = s.doc.nodes[nodeId];
          if (!n) return;
          if (!n.captionKey || !(n.captionKey in n.properties)) {
            if (text === "") return;
            n.captionKey = captionKeyFor(n.properties, text);
          }
          n.properties[n.captionKey] = text;
          touch(s.doc);
        }),

      setDocumentStyle: (patch) =>
        set((s) => {
          // En ändring utan markering gäller allt som syns just nu, även element med egen stil.
          // Dolda element behåller sitt utseende: de får sitt nuvarande värde som egen stil.
          if (patch.node) {
            applyToVisible(Object.values(s.doc.nodes), s.doc.style.node, patch.node, (n) =>
              isElementVisible(s.doc, { kind: "node", id: n.id }),
            );
          }
          if (patch.relationship) {
            applyToVisible(
              Object.values(s.doc.relationships),
              s.doc.style.relationship,
              patch.relationship,
              (r) => isRelationshipVisible(s.doc, r),
            );
          }
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

type TemporalState = ReturnType<typeof useDocumentStore.temporal.getState>;

/** Hook för ångra/gör om-historiken (zundo:s temporal store är en vanlig store, inte en hook). */
export const useTemporal = <T>(selector: (state: TemporalState) => T): T =>
  useStore(useDocumentStore.temporal, selector);

export const undo = () => useDocumentStore.temporal.getState().undo();
export const redo = () => useDocumentStore.temporal.getState().redo();
export const clearHistory = () => useDocumentStore.temporal.getState().clear();

export type { DiagramStyle, Layer };

/**
 * Ångra-grupp: allt som ändras mellan `beginHistoryGroup` och `endHistoryGroup` blir ETT steg i
 * ångra-historiken. Används när ett värde dras (skjutreglage, färgväljare), där varje liten
 * rörelse annars skulle bli ett eget steg och fylla historiken.
 */
let historyGroupOpen = false;
let historyPausedByGroup = false;
let historyLengthBeforeGroup = 0;

useDocumentStore.subscribe((state, prev) => {
  if (!historyGroupOpen || historyPausedByGroup || state.doc === prev.doc) return;
  // Första ändringen i gruppen sparas som vanligt (läget före dragningen). Historiken skriver
  // sitt steg först efter att den här lyssnaren körts, så pausen sätts strax efteråt.
  historyPausedByGroup = true;
  queueMicrotask(() => {
    if (historyGroupOpen && historyPausedByGroup) useDocumentStore.temporal.getState().pause();
  });
});

export function beginHistoryGroup(): void {
  if (historyGroupOpen) return;
  historyGroupOpen = true;
  historyLengthBeforeGroup = useDocumentStore.temporal.getState().pastStates.length;
}

export function endHistoryGroup(): void {
  if (!historyGroupOpen) return;
  historyGroupOpen = false;
  const history = useDocumentStore.temporal;
  if (historyPausedByGroup) {
    history.getState().resume();
    historyPausedByGroup = false;
  }
  // Ändringar som hann göras innan pausen slog till (flera i samma ögonblick) slås ihop: bara
  // gruppens första steg, läget före dragningen, blir kvar.
  const { pastStates } = history.getState();
  if (pastStates.length > historyLengthBeforeGroup + 1) {
    history.setState({ pastStates: pastStates.slice(0, historyLengthBeforeGroup + 1) });
  }
}
