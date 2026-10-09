import type { SvgExport } from "./svg";

export interface PngExportOptions {
  /** 1 = 1 px per canvas-enhet, 2 = dubbel upplösning … */
  scale: number;
}

/** Rastrerar en SVG-export till PNG via ett canvas-element. Bara i webbläsare. */
export async function exportPng(svg: SvgExport, options: PngExportOptions): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg.svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("SVG kunde inte rastreras"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(svg.width * options.scale);
    canvas.height = Math.round(svg.height * options.scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas saknas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG misslyckades"))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
