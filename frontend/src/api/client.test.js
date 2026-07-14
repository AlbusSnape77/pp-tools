import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, buildApiUrl } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("builds same-origin and configured API URLs", () => {
    expect(buildApiUrl("http://127.0.0.1:5175/", "/api/delta-force/analyze"))
      .toBe("http://127.0.0.1:5175/api/delta-force/analyze");
    expect(buildApiUrl("", "/api/health")).toBe("/api/health");
  });

  it("returns parsed JSON from a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/api/health")).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("throws the error message returned by the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Upload is too large" }), {
          status: 413,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiFetch("/api/uploads")).rejects.toThrow("Upload is too large");
  });

  it("lets the browser set the content type for form data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ stored: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const body = new FormData();
    body.append("file", new Blob(["result"]), "result.txt");

    await apiFetch("/api/uploads", { method: "POST", body });

    const requestOptions = fetchMock.mock.calls[0][1];
    expect(requestOptions.headers).toMatchObject({ Accept: "application/json" });
    expect(requestOptions.headers).not.toHaveProperty("Content-Type");
  });
});
