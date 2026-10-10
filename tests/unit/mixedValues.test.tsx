import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CheckboxField, SliderField } from "@/components/ui";
import { PropertiesEditor } from "@/panels/inspector/PropertiesEditor";

afterEach(cleanup);

/** Flera markerade element med olika värden ska synas som "blandat", inte som av eller 100 %. */
describe("blandade värden", () => {
  it("av/på-val visar mellanläge", () => {
    render(<CheckboxField label="Locked" checked={false} mixed onChange={() => {}} />);
    const input = screen.getByLabelText("Locked") as HTMLInputElement;
    expect(input.indeterminate).toBe(true);
    expect(input.getAttribute("aria-checked")).toBe("mixed");
    cleanup();
    render(<CheckboxField label="Locked" checked onChange={() => {}} />);
    expect((screen.getByLabelText("Locked") as HTMLInputElement).indeterminate).toBe(false);
  });

  it("skjutreglage visar (mixed) i stället för ett tal", () => {
    const { container } = render(
      <SliderField label="Opacity" value={1} mixed onChange={() => {}} />,
    );
    expect(container.textContent).toContain("(mixed)");
    expect(container.textContent).not.toContain("100 %");
  });

  it("rubrikrutan visar mellanläge när bara några av noderna har egenskapen som rubrik", () => {
    render(
      <PropertiesEditor
        refs={[
          { kind: "node", id: "a" },
          { kind: "node", id: "b" },
        ]}
        propertySets={[
          { name: "A", code: "1" },
          { name: "B", code: "2" },
        ]}
        caption={{ keys: ["name", "code"], onToggle: () => {} }}
      />,
    );
    const name = screen.getByLabelText("Use “name” as caption") as HTMLInputElement;
    expect(name.checked).toBe(false);
    expect(name.indeterminate).toBe(true);
  });
});
