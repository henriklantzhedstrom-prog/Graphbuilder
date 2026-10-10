import { ColorField, Section } from "@/components/ui";
import { t } from "@/i18n";
import { useDocumentStore } from "@/store/documentStore";
import { captionColorFor, NODE_STYLE_FIELDS, RELATIONSHIP_STYLE_FIELDS } from "./common";
import { StyleFields } from "./StyleFields";

export function DocumentStyleSection() {
  const style = useDocumentStore((s) => s.doc.style);
  const setDocumentStyle = useDocumentStore((s) => s.setDocumentStyle);
  return (
    <>
      <div className="border-border border-b px-4 py-4">
        <p className="mb-1 font-semibold text-[1em]">{t.inspector.nothingSelected}</p>
        <p className="text-[0.86em] text-text-muted leading-snug">
          {t.inspector.nothingSelectedHint}
        </p>
      </div>
      <Section title={t.inspector.documentStyle}>
        <ColorField
          label={t.inspector.background}
          value={style.background}
          onChange={(background) => setDocumentStyle({ background })}
        />
      </Section>
      <Section title={t.inspector.nodeDefaults}>
        <StyleFields
          fields={NODE_STYLE_FIELDS}
          labels={t.inspector.styleNode}
          values={[style.node]}
          onChange={(key, value) => {
            const caption =
              key === "fill" && typeof value === "string"
                ? captionColorFor(value, style.node.captionColor)
                : null;
            // Mörk fyllning med mörk rubrik går inte att läsa: byt rubrikfärg samtidigt.
            setDocumentStyle({
              node: caption ? { fill: value as string, captionColor: caption } : { [key]: value },
            });
          }}
        />
      </Section>
      <Section title={t.inspector.relationshipDefaults}>
        <StyleFields
          fields={RELATIONSHIP_STYLE_FIELDS}
          labels={t.inspector.styleRelationship}
          values={[style.relationship]}
          onChange={(key, value) => setDocumentStyle({ relationship: { [key]: value } })}
        />
      </Section>
    </>
  );
}
