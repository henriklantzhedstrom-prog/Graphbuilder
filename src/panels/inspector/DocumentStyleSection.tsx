import { ColorField, Section } from "@/components/ui";
import { t } from "@/i18n";
import { useDocumentStore } from "@/store/documentStore";
import { NODE_STYLE_FIELDS, RELATIONSHIP_STYLE_FIELDS } from "./common";
import { StyleFields } from "./StyleFields";

export function DocumentStyleSection() {
  const style = useDocumentStore((s) => s.doc.style);
  const setDocumentStyle = useDocumentStore((s) => s.setDocumentStyle);
  return (
    <>
      <div className="px-3 py-3 text-text-muted text-[0.86em]">
        <p className="mb-1 font-medium text-text">{t.inspector.nothingSelected}</p>
        <p>{t.inspector.nothingSelectedHint}</p>
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
          onChange={(key, value) => setDocumentStyle({ node: { [key]: value } })}
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
