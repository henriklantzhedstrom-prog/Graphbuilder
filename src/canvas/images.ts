import { t } from "@/i18n/sv";
import type { Id, Point, Size } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { serializeDocument } from "@/store/persistence";
import { useUiStore } from "@/store/uiStore";
import { resolveActiveLayer } from "./actions";

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
  "image/gif",
] as const;

export const MAX_IMAGE_DIMENSION = 4096;
/** Största bredd/höjd på ritytan som en nyinlagd bild får som standard. */
export const DEFAULT_MAX_PLACED_SIZE = 800;
export const DOCUMENT_SIZE_WARNING_BYTES = 10 * 1024 * 1024;

export const isAcceptedImage = (mime: string): boolean =>
  (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mime);

/** Skalar ner proportionellt så att ingen sida överstiger `max`. */
export function fitWithin(size: Size, max: number): Size {
  const scale = Math.min(1, max / Math.max(size.w, size.h));
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

export interface LoadedImage {
  mime: string;
  dataUrl: string;
  width: number;
  height: number;
}

const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = src;
  });

/** Läser en bildfil till data-URL och skalar ner rasterbilder över MAX_IMAGE_DIMENSION. */
export async function loadImageFile(file: Blob & { type: string }): Promise<LoadedImage> {
  if (!isAcceptedImage(file.type)) throw new Error(t.toasts.unsupportedImage);
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImageElement(dataUrl);
  const natural = { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
  if (file.type === "image/svg+xml" || Math.max(natural.w, natural.h) <= MAX_IMAGE_DIMENSION) {
    return { mime: file.type, dataUrl, width: natural.w, height: natural.h };
  }
  const target = fitWithin(natural, MAX_IMAGE_DIMENSION);
  const canvas = document.createElement("canvas");
  canvas.width = target.w;
  canvas.height = target.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(t.toasts.imageTooLarge);
  ctx.drawImage(img, 0, 0, target.w, target.h);
  const mime = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  return { mime, dataUrl: canvas.toDataURL(mime, 0.92), width: target.w, height: target.h };
}

/** Lägger in en bild centrerad på `center` i aktivt lager. Returnerar bildens id. */
export async function addImageFromFile(
  file: Blob & { type: string },
  center: Point,
): Promise<Id | null> {
  const ui = useUiStore.getState();
  const layerId = resolveActiveLayer();
  if (!layerId) return null;
  let loaded: LoadedImage;
  try {
    loaded = await loadImageFile(file);
  } catch (err) {
    ui.showToast((err as Error).message || t.toasts.imageTooLarge, "error");
    return null;
  }
  const store = useDocumentStore.getState();
  const assetId = store.addAsset(loaded);
  const size = fitWithin({ w: loaded.width, h: loaded.height }, DEFAULT_MAX_PLACED_SIZE);
  const id = store.addImage(
    layerId,
    assetId,
    { x: center.x - size.w / 2, y: center.y - size.h / 2 },
    size,
  );
  ui.setSelection([{ kind: "image", id }]);
  warnIfDocumentLarge();
  return id;
}

export function warnIfDocumentLarge(): void {
  const bytes = serializeDocument(useDocumentStore.getState().doc).length;
  if (bytes > DOCUMENT_SIZE_WARNING_BYTES) {
    useUiStore.getState().showToast(t.toasts.documentLarge(Math.round(bytes / 1024 / 1024)));
  }
}

/** Plockar ut bildfiler ur en DataTransfer (drop eller paste). */
export function imageFilesFrom(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const files: File[] = [];
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === "file") {
      const f = item.getAsFile();
      if (f && isAcceptedImage(f.type)) files.push(f);
    }
  }
  if (files.length === 0) {
    for (const f of Array.from(dt.files ?? [])) if (isAcceptedImage(f.type)) files.push(f);
  }
  return files;
}
