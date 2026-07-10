import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the tool center and all three tools", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "pp-tools" })).toBeInTheDocument();
    expect(screen.getByText("Delta Force Stats")).toBeInTheDocument();
    expect(screen.getByText("Gesture Beauty Cam")).toBeInTheDocument();
    expect(screen.getByText("Sanpingfang Milk Tea")).toBeInTheDocument();
  });
});
