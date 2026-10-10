import { describe, expect, it } from "vitest";
import { layoutRichText, parseRuns, plainText, toggleMarkup } from "@/model/noteText";

const styled = (text: string) =>
  parseRuns(text).map((r) => `${r.bold ? "B" : ""}${r.italic ? "I" : ""}:${r.text}`);

describe("fet och kursiv text i anteckningar", () => {
  it("tolkar **fet**, *kursiv* och ***båda***", () => {
    expect(styled("Vanlig **fet** och *kursiv* text")).toEqual([
      ":Vanlig ",
      "B:fet",
      ": och ",
      "I:kursiv",
      ": text",
    ]);
    expect(styled("***båda*** sedan")).toEqual(["BI:båda", ": sedan"]);
    expect(styled("**fet med *kursiv* inuti**")).toEqual(["B:fet med ", "BI:kursiv", "B: inuti"]);
    expect(plainText("En **fet** rad\noch *en* till")).toBe("En fet rad\noch en till");
  });

  it("märken utan avslutning är vanlig text", () => {
    expect(styled("2 * 3 = 6")).toEqual([":2 * 3 = 6"]);
    expect(styled("pris: 5* och **öppen")).toEqual([":pris: 5* och **öppen"]);
    expect(styled("")).toEqual([]);
  });

  it("bryter rader ord för ord och behåller stilen över radbrytningen", () => {
    const lines = layoutRichText("En **mycket lång fet fras** här", 12);
    const show = lines.map((line) => line.map((r) => `${r.bold ? "B" : ""}:${r.text}`).join("|"));
    expect(show).toEqual([":En |B:mycket", "B:lång fet", "B:fras |:här"]);
    // Märkena räknas inte in i radlängden, och tomma rader finns kvar.
    expect(layoutRichText("**abc**\n\ndef", 3).map((l) => l.map((r) => r.text).join(""))).toEqual([
      "abc",
      "",
      "def",
    ]);
  });

  it("slår på och av stil för markerad text", () => {
    const text = "En fet text";
    const on = toggleMarkup(text, 3, 6, "**");
    expect(on.value).toBe("En **fet** text");
    expect(on.value.slice(on.start, on.end)).toBe("fet");
    // Samma markering en gång till tar bort märkena.
    const off = toggleMarkup(on.value, on.start, on.end, "**");
    expect(off).toEqual({ value: text, start: 3, end: 6 });
    // Kursiv ovanpå fet ger båda.
    const both = toggleMarkup(on.value, on.start, on.end, "*");
    expect(both.value).toBe("En ***fet*** text");
    expect(styled(both.value)).toEqual([":En ", "BI:fet", ": text"]);
    // Kursiv av igen lämnar feten kvar.
    expect(toggleMarkup(both.value, both.start, both.end, "*").value).toBe("En **fet** text");
    // Mellanslag i kanterna av markeringen hamnar utanför märkena.
    expect(toggleMarkup("a b c", 1, 4, "*").value).toBe("a *b* c");
    // Flera rader får märken var för sig; ingen markering ändrar ingenting.
    expect(toggleMarkup("ett\ntvå", 0, 7, "**").value).toBe("**ett**\n**två**");
    expect(toggleMarkup(text, 2, 2, "**").value).toBe(text);
  });
});
