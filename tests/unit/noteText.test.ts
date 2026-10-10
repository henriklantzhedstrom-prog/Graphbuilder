import { describe, expect, it } from "vitest";
import { layoutRichText, parseRuns, plainText } from "@/model/noteText";

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
});
