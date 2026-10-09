import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "@/App";

describe("App", () => {
  it("renderar appens namn", () => {
    render(<App />);
    expect(screen.getByText("Graphbuilder")).toBeTruthy();
  });
});
