import { IconSwap } from "@/components/icons";
import { Button, Field, Section, TextInput } from "@/components/ui";
import { t } from "@/i18n/sv";
import type { Relationship } from "@/model/types";
import { useDocumentStore } from "@/store/documentStore";
import { resolvedRelationshipStyle } from "@/store/selectors";
import { commonValue, RELATIONSHIP_STYLE_FIELDS } from "./common";
import { PropertiesEditor } from "./PropertiesEditor";
import { StyleFields } from "./StyleFields";

export function RelationshipSection({ relationships }: { relationships: Relationship[] }) {
  const doc = useDocumentStore((s) => s.doc);
  const updateRelationship = useDocumentStore((s) => s.updateRelationship);
  const reverseRelationships = useDocumentStore((s) => s.reverseRelationships);
  const setRelationshipStyle = useDocumentStore((s) => s.setRelationshipStyle);
  const resetElementStyle = useDocumentStore((s) => s.resetElementStyle);
  const ids = relationships.map((r) => r.id);
  const refs = ids.map((id) => ({ kind: "relationship" as const, id }));
  const type = commonValue(relationships.map((r) => r.type));
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
          <Button variant="ghost" onClick={() => resetElementStyle(refs)}>
            {t.inspector.resetStyle}
          </Button>
        )}
      </Section>
    </>
  );
}
