import { Button, CheckboxField, formatPercent, Section, SliderField } from "@/components/ui";
import { t } from "@/i18n";
import type { BackgroundImage } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { useUiStore } from "@/store/uiStore";
import { commonValue, MAX_ELEMENT_SIZE, MIN_ELEMENT_SIZE } from "./common";

export function ImageSection({ images }: { images: BackgroundImage[] }) {
  const doc = useDocumentStore((s) => s.doc);
  const updateImage = useDocumentStore((s) => s.updateImage);
  const moveElementsToLayer = useDocumentStore((s) => s.moveElementsToLayer);
  const ensureBackgroundLayer = useDocumentStore((s) => s.ensureBackgroundLayer);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const setAll = (patch: Partial<Omit<BackgroundImage, "id">>) => {
    for (const im of images) updateImage(im.id, patch);
  };
  const single = images.length === 1 ? images[0] : undefined;
  const opacity = commonValue(images.map((im) => im.opacity));
  const asset = single ? doc.assets[single.assetId] : undefined;

  return (
    <Section title={images.length === 1 ? t.inspector.image : t.inspector.images(images.length)}>
      <SliderField
        label={t.inspector.opacity}
        value={opacity ?? 1}
        mixed={opacity === null}
        format={formatPercent}
        onChange={(value) => setAll({ opacity: value })}
      />
      <CheckboxField
        label={t.inspector.lockImage}
        checked={images.every((im) => im.locked)}
        mixed={commonValue(images.map((im) => im.locked)) === null}
        onChange={(locked) => {
          setAll({ locked });
          if (locked) clearSelection();
        }}
      />
      {single && (
        <>
          <SliderField
            label={t.inspector.width}
            value={Math.round(single.size.w)}
            min={MIN_ELEMENT_SIZE}
            max={MAX_ELEMENT_SIZE}
            step={1}
            onChange={(w) => updateImage(single.id, { size: { ...single.size, w } })}
          />
          <SliderField
            label={t.inspector.height}
            value={Math.round(single.size.h)}
            min={MIN_ELEMENT_SIZE}
            max={MAX_ELEMENT_SIZE}
            step={1}
            onChange={(h) => updateImage(single.id, { size: { ...single.size, h } })}
          />
          {asset && (
            <Button
              className="mt-1"
              onClick={() =>
                updateImage(single.id, {
                  size: { w: single.size.w, h: (single.size.w * asset.height) / asset.width },
                })
              }
            >
              {t.inspector.resetAspect}
            </Button>
          )}
        </>
      )}
      <Button
        className="mt-1"
        onClick={() => {
          const layerId = ensureBackgroundLayer();
          moveElementsToLayer(
            images.map((im) => ({ kind: "image" as const, id: im.id })),
            layerId,
          );
        }}
      >
        {t.inspector.sendToBackground}
      </Button>
    </Section>
  );
}
