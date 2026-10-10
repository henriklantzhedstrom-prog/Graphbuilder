import { IconSwap } from "@/components/icons";
import { Button, Field, Section, Select, TextInput } from "@/components/ui";
import { t } from "@/i18n";
import type { Relationship } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { resolvedRelationshipStyle } from "@/store/selectors";
import { commonValue, RELATIONSHIP_STYLE_FIELDS } from "./common";
import { PropertiesEditor } from "./PropertiesEditor";
import { StyleFields } from "./StyleFields";

/** Värde i lagerväljaren när de markerade relationerna har olika lager. */
const MIXED = "__mixed__";

export function RelationshipSection({ relationships }: { relationships: Relationship[] }) {
  const doc = useDocumentStore((s) => s.doc);
  const updateRelationship = useDocumentStore((s) => s.updateRelationship);
  const reverseRelationships = useDocumentStore((s) => s.reverseRelationships);
  const setRelationshipStyle = useDocumentStore((s) => s.setRelationshipStyle);
  const resetElementStyle = useDocumentStore((s) => s.resetElementStyle);
  const ids = relationships.map((r) => r.id);
  const refs = ids.map((id) => ({ kind: "relationship" as const, id }));
  const moveElementsToLayer = useDocumentStore((s) => s.moveElementsToLayer);
  const clearRelationshipLayer = useDocumentStore((s) => s.clearRelationshipLayer);
  const type = commonValue(relationships.map((r) => r.type));
  // Tom sträng = standard (inget eget lager), null = olika för de markerade.
  const layerId = commonValue(relationships.map((r) => r.layerId ?? ""));
  const hasCustomStyle = relationships.some((r) => Object.keys(r.style).length > 0);

  return (
    <>
      <Section
        title={
          relationships.length === 1
            ? t.inspector.relationship
            : t.inspector.relationships(relationships.length)
        }
      >
        <Field label={t.inspector.type}>
          {(id) => (
            <TextInput
              id={id}
              data-testid="inspector-type"
              value={type ?? ""}
              placeholder={type === null ? t.inspector.mixed : t.inspector.typePlaceholder}
              onChange={(e) => {
                for (const r of relationships) updateRelationship(r.id, { type: e.target.value });
              }}
            />
          )}
        </Field>
        <Field label={t.inspector.layer} inline>
          {(id) => (
            <Select
              id={id}
              data-testid="relationship-layer"
              className="w-52"
              value={layerId ?? MIXED}
              onChange={(e) => {
                if (e.target.value === "") clearRelationshipLayer(ids);
                else moveElementsToLayer(refs, e.target.value);
              }}
            >
              {layerId === null && (
                <option value={MIXED} disabled>
                  {t.inspector.mixed}
                </option>
              )}
              <option value="">{t.inspector.relationshipLayerDefault}</option>
              {[...doc.layers].reverse().map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <p className="text-[0.82em] text-text-muted leading-snug">
          {layerId === ""
            ? t.inspector.relationshipLayerDefaultHint
            : t.inspector.relationshipLayerHint}
        </p>
        <Field label={t.inspector.direction} inline>
          {() => (
            <Button onClick={() => reverseRelationships(ids)}>
              <IconSwap size={16} />
              {t.inspector.reverse}
            </Button>
          )}
        </Field>
      </Section>
      <Section title={t.inspector.properties}>
        <PropertiesEditor refs={refs} propertySets={relationships.map((r) => r.properties)} />
      </Section>
      <Section title={t.inspector.style}>
        <StyleFields
          fields={RELATIONSHIP_STYLE_FIELDS}
          labels={t.inspector.styleRelationship}
          values={relationships.map((r) => resolvedRelationshipStyle(doc, r))}
          onChange={(key, value) => setRelationshipStyle(ids, { [key]: value })}
        />
        {hasCustomStyle && (
          <Button className="mt-2" onClick={() => resetElementStyle(refs)}>
            {t.inspector.resetStyle}
          </Button>
        )}
      </Section>
    </>
  );
}
