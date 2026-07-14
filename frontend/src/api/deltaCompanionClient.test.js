import { beforeEach, describe, expect, it, vi } from "vitest";
import { compareCompanionVersion, createDeltaCompanionClient } from "./deltaCompanionClient";


describe("deltaCompanionClient", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends the origin-bound bearer token and maps error codes", async () => {
    localStorage.setItem("pp-tools.delta.token:https://example.com", "secret-token");
    fetch.mockResolvedValue(new Response(JSON.stringify({
      error: { code: "game_not_running", details: {} },
    }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    }));
    const client = createDeltaCompanionClient({
      baseUrl: "http://127.0.0.1:43127",
      siteOrigin: "https://example.com",
    });

    await expect(client.autoLookup("player")).rejects.toMatchObject({
      code: "game_not_running",
      status: 409,
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:43127/api/v1/auto-lookup",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
        }),
      }),
    );
  });

  it("stores a paired token under the exact website origin", async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ token: "paired-token" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const client = createDeltaCompanionClient({
      baseUrl: "http://127.0.0.1:43127",
      siteOrigin: "https://example.com",
    });

    await client.pair("123456");

    expect(client.hasToken()).toBe(true);
    expect(localStorage.getItem("pp-tools.delta.token:https://example.com")).toBe("paired-token");
  });
});


it("compares Companion and API versions independently", () => {
  expect(compareCompanionVersion(
    { version: "0.9.0", api_version: 1 },
    { min_version: "1.0.0", api_version: 1 },
  )).toBe("update_required");
  expect(compareCompanionVersion(
    { version: "1.0.0", api_version: 2 },
    { min_version: "1.0.0", api_version: 1 },
  )).toBe("api_incompatible");
  expect(compareCompanionVersion(
    { version: "1.1.0", api_version: 1 },
    { min_version: "1.0.0", api_version: 1 },
  )).toBe("compatible");
});
