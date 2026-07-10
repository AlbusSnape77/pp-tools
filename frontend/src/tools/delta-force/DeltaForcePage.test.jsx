import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DeltaForcePage from "./DeltaForcePage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DeltaForcePage", () => {
  it("uploads an image and renders the stats result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      result: {
        nickname: "Sample Player",
        overview: { kd: ["1.20", "1.50", "1.80"], escape_rate: "42%" },
        rank: { name: "Gold", stars: 3 },
        radar: { combat: 72, survival: 68 },
      },
      warnings: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<DeltaForcePage />);
    const file = new File(["content"], "sample.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Screenshots"), file);
    await userEvent.click(screen.getByRole("button", { name: "Analyze screenshots" }));

    await waitFor(() => {
      expect(screen.getByText("Sample Player")).toBeInTheDocument();
      expect(screen.getByText("1.80")).toBeInTheDocument();
      expect(screen.getByText("42%")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/delta-force/analyze", expect.objectContaining({
      method: "POST",
      body: expect.any(FormData),
    }));
  });

  it("shows the server error when analysis fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "Screenshot could not be read.",
    }), { status: 422, headers: { "Content-Type": "application/json" } })));

    render(<DeltaForcePage />);
    const file = new File(["content"], "sample.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Screenshots"), file);
    await userEvent.click(screen.getByRole("button", { name: "Analyze screenshots" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Screenshot could not be read.");
  });
});
