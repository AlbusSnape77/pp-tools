import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useDeltaCompanion } from "./useDeltaCompanion";


it("moves from unavailable through launch and pairing to ready", async () => {
  const client = {
    hasToken: vi.fn(() => false),
    health: vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("offline"), { code: "companion_unavailable" }))
      .mockResolvedValue({ version: "1.0.0" }),
    getUsage: vi.fn().mockResolvedValue({ today_count: 0, daily_limit: 100 }),
    pair: vi.fn().mockImplementation(async () => {
      client.hasToken.mockReturnValue(true);
    }),
    clearToken: vi.fn(),
  };
  const launchProtocol = vi.fn();
  const { result } = renderHook(() => useDeltaCompanion({
    client,
    protocolUrl: "delta-stats://start",
    launchProtocol,
  }));

  await waitFor(() => expect(result.current.state).toBe("unavailable"));
  act(() => result.current.launch());
  expect(result.current.state).toBe("launching");
  expect(launchProtocol).toHaveBeenCalledWith("delta-stats://start");

  await act(() => result.current.pair("123456"));

  expect(client.pair).toHaveBeenCalledWith("123456");
  expect(result.current.state).toBe("ready");
});


it("requires pairing when the companion is online without a token", async () => {
  const client = {
    hasToken: vi.fn(() => false),
    health: vi.fn().mockResolvedValue({ version: "1.0.0" }),
  };
  const { result } = renderHook(() => useDeltaCompanion({ client }));

  await waitFor(() => expect(result.current.state).toBe("pairing_required"));
});
