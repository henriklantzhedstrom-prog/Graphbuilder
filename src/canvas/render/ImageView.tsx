import type { Asset, BackgroundImage, Box } from "@/model/types";

export interface ImageViewProps {
  image: BackgroundImage;
  asset: Asset;
  box: Box;
  interactive?: boolean;
}

export function ImageView({ image, asset, box, interactive = false }: ImageViewProps) {
  return (
    <g
      className="gb-image"
      data-ref={interactive ? `image:${image.id}` : undefined}
      data-part={interactive ? "body" : undefined}
      opacity={image.opacity}
    >
      <image
        href={asset.dataUrl}
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        preserveAspectRatio="none"
        style={{ pointerEvents: interactive && !image.locked ? "all" : "none" }}
      />
    </g>
  );
}
