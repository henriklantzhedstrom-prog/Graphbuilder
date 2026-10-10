import { useEffect, useId, useMemo, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { Button, CheckboxField, Segmented, SegmentedItem, Select } from "@/components/ui";
import { exportCypher } from "@/export/cypher";
import { exportJson } from "@/export/json";
import { exportPng } from "@/export/png";
import { exportSvg } from "@/export/svg";
import { t } from "@/i18n";
import { useDocumentStore } from "@/store/documentStore";
import { safeFileName, saveFile } from "@/store/persistence";
import { useUiStore } from "@/store/uiStore";

type Format = "json" | "cypher" | "svg" | "png";

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "json", label: t.export.json, hint: t.export.jsonHint },
  { id: "cypher", label: t.export.cypher, hint: t.export.cypherHint },
  { id: "svg", label: t.export.svg, hint: t.export.svgHint },
  { id: "png", label: t.export.png, hint: t.export.pngHint },
];

export function ExportDialog() {
  const open = useUiStore((s) => s.dialog === "export");
  const setDialog = useUiStore((s) => s.setDialog);
  const showToast = useUiStore((s) => s.showToast);
  const doc = useDocumentStore((s) => s.doc);
  const [format, setFormat] = useState<Format>("json");
  const [onlyVisible, setOnlyVisible] = useState(true);
  const [transparent, setTransparent] = useState(false);
  const [scale, setScale] = useState(2);
  const scaleId = useId();
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [pngBlob, setPngBlob] = useState<Blob | null>(null);

  const text = useMemo(() => {
    if (!open) return "";
    if (format === "json") return exportJson(doc, { onlyVisible });
    if (format === "cypher") return exportCypher(doc, { onlyVisible });
    return "";
  }, [open, format, doc, onlyVisible]);

  const svg = useMemo(
    () =>
      open && (format === "svg" || format === "png")
        ? exportSvg(doc, { onlyVisible, transparent })
        : null,
    [open, format, doc, onlyVisible, transparent],
  );

  useEffect(() => {
    if (format !== "png" || !svg) {
      setPngUrl(null);
      setPngBlob(null);
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    exportPng(svg, { scale })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPngBlob(blob);
        setPngUrl(url);
      })
      .catch((err: Error) => showToast(err.message, "error"));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [format, svg, scale, showToast]);

  const isEmpty =
    Object.keys(doc.nodes).length === 0 &&
    Object.keys(doc.notes).length === 0 &&
    Object.keys(doc.images).length === 0;
  const baseName = safeFileName(doc.name);

  const download = async () => {
    if (format === "json")
      await saveFile(new Blob([text], { type: "application/json" }), `${baseName}.json`);
    if (format === "cypher")
      await saveFile(new Blob([text], { type: "text/plain" }), `${baseName}.cypher`);
    if (format === "svg" && svg)
      await saveFile(new Blob([svg.svg], { type: "image/svg+xml" }), `${baseName}.svg`);
    if (format === "png" && pngBlob) await saveFile(pngBlob, `${baseName}.png`);
    showToast(t.toasts.exported);
  };

  const copy = async () => {
    try {
      if (format === "png" && pngBlob && "ClipboardItem" in window) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      } else {
        await navigator.clipboard.writeText(format === "svg" ? (svg?.svg ?? "") : text);
      }
      showToast(t.toasts.copied);
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  return (
    <Dialog
      title={t.export.title}
      open={open}
      onClose={() => setDialog(null)}
      width="max-w-3xl"
      footer={
        <>
          <Button onClick={copy} disabled={isEmpty} data-testid="export-copy">
            {t.export.copy}
          </Button>
          <Button
            variant="primary"
            onClick={download}
            disabled={isEmpty}
            data-testid="export-download"
          >
            {t.export.download}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Segmented role="tablist" className="self-start">
          {FORMATS.map((f) => (
            <SegmentedItem
              key={f.id}
              role="tab"
              aria-selected={format === f.id}
              selected={format === f.id}
              className="min-w-20"
              onClick={() => setFormat(f.id)}
            >
              {f.label}
            </SegmentedItem>
          ))}
        </Segmented>
        <p className="text-[0.92em] text-text-muted">
          {FORMATS.find((f) => f.id === format)?.hint}
        </p>
        <div className="flex min-h-9 flex-wrap items-center gap-x-6 gap-y-2">
          <CheckboxField
            variant="check"
            label={t.export.onlyVisibleLayers}
            checked={onlyVisible}
            onChange={setOnlyVisible}
          />
          {(format === "svg" || format === "png") && (
            <CheckboxField
              variant="check"
              label={t.export.transparentBackground}
              checked={transparent}
              onChange={setTransparent}
            />
          )}
          {format === "png" && (
            <label htmlFor={scaleId} className="flex items-center gap-2">
              {t.export.scale}
              <Select
                id={scaleId}
                className="h-8"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
              >
                {[1, 2, 3, 4].map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
        <div
          className="gb-scroll max-h-[50vh] min-h-32 overflow-auto rounded-xl border border-border bg-surface-2 p-4"
          data-testid="export-preview"
        >
          {isEmpty ? (
            <p className="py-8 text-center text-text-muted">{t.export.empty}</p>
          ) : format === "svg" && svg ? (
            <div
              className="[&>svg]:h-auto [&>svg]:max-w-full"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: vår egen genererade SVG
              dangerouslySetInnerHTML={{ __html: svg.svg }}
            />
          ) : format === "png" ? (
            pngUrl ? (
              <img src={pngUrl} alt={t.export.preview} className="max-w-full" />
            ) : (
              <p className="py-8 text-center text-text-muted">{t.app.loading}</p>
            )
          ) : (
            <pre className="whitespace-pre-wrap break-all font-mono text-[13px] leading-relaxed">
              {text}
            </pre>
          )}
        </div>
      </div>
    </Dialog>
  );
}
