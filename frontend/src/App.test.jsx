import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  window.history.pushState({}, "", "/");
});

describe("App", () => {
  it("renders the tool center and all three tools", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "pp-tools" })).toBeInTheDocument();
    expect(screen.getByText("Delta Force Stats")).toBeInTheDocument();
    expect(screen.getByText("Gesture Beauty Cam")).toBeInTheDocument();
    expect(screen.getByText("Sanpingfang Milk Tea")).toBeInTheDocument();
  });

  it("renders the immersive Delta route without the shared navigation", async () => {
    window.history.pushState({}, "", "/tools/delta-force");

    render(<App />);

    expect(await screen.findByLabelText("返回工具中心")).toHaveTextContent("DELTASTATS");
    expect(screen.queryByRole("navigation", { name: "Primary navigation" })).not.toBeInTheDocument();
  });

  it("renders the Beauty Cam route", () => {
    window.history.pushState({}, "", "/tools/beauty-cam");

    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Gesture Beauty Cam" }),
    ).toBeInTheDocument();
  });

  it("renders the Milk Tea route", () => {
    window.history.pushState({}, "", "/tools/milk-tea");

    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Sanpingfang Milk Tea" }),
    ).toBeInTheDocument();
  });
});
