import { renderToStaticMarkup } from "react-dom/server";
import { Scene } from "@/canvas/render/Scene";
import { inflate } from "@/model/geometry";
import type { Box, GraphDocument } from "@/model/types";
import { contentBounds } from "@/store/selectors";
import { selectDocument } from "./filter";

export interface SvgExportOptions {
  onlyVisible: boolean;
  transparent: boolean;
  padding?: number;
}

export interface SvgExport {
  svg: string;
  width: number;
  height: number;
  box: Box;
}

/** Marginal som täcker labels ovanför och egenskaper under noder. */
export const EXPORT_PADDING = 60;

export function exportSvg(doc: GraphDocument, options: SvgExportOptions): SvgExport | null {
  const d = selectDocument(doc, options.onlyVisible);
  const bounds = contentBounds(d, false);
  if (!bounds) return null;
  const box = inflate(bounds, options.padding ?? EXPORT_PADDING);
  const width = Math.ceil(box.w);
  const height = Math.ceil(box.h);
  const body = renderToStaticMarkup(<Scene doc={d} />);
  const background = options.transparent
    ? ""
    : `<rect x="${box.x}" y="${box.y}" width="${width}" height="${height}" fill="${d.style.background}"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${width}" height="${height}" viewBox="${box.x} ${box.y} ${width} ${height}" ` +
    `font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">` +
    `<title>${escapeXml(d.name)}</title>${background}${body}</svg>`;
  return { svg, width, height, box };
}

export const escapeXml = (s: string): string =>
  s.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c,
  );
