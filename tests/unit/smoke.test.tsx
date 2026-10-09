import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "@/App";

describe("App", () => {
  it("startar och visar verktygsfältet", async () => {
    render(<App />);
    expect(await screen.findByLabelText("Modellens namn")).toBeTruthy();
    expect(screen.getByTestId("canvas")).toBeTruthy();
  });
});
