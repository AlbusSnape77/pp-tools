import { existsSync } from "node:fs";
import path from "node:path";
import { expect, it, vi } from "vitest";


it("streams complete events when response lines arrive in partial chunks", async () => {
  const modulePath = path.resolve("src/tools/local-chat/localChatClient.js");
  expect(existsSync(modulePath), "localChatClient.js 尚未实现").toBe(true);
  const { createLocalChatClient } = await import("./localChatClient.js");
  const encoder = new TextEncoder();
  const chunks = [
    encoder.encode('{"type":"status","status":"ready"}\n{"type":"del'),
    encoder.encode('ta","text":"你"}\n{"type":"done"}\n'),
  ];
  const reader = {
    async read() {
      return chunks.length ? { value: chunks.shift(), done: false } : { done: true };
    },
  };
  const fetchImpl = vi.fn().mockResolvedValue({
    ok: true,
    body: { getReader: () => reader },
  });
  const client = createLocalChatClient({ fetchImpl });

  const events = [];
  for await (const event of client.chat({ request_id: "request-1", messages: [] })) {
    events.push(event);
  }

  expect(events).toEqual([
    { type: "status", status: "ready" },
    { type: "delta", text: "你" },
    { type: "done" },
  ]);
  expect(fetchImpl).toHaveBeenCalledWith(
    "/api/local-chat/chat",
    expect.objectContaining({ method: "POST" }),
  );
});

it("starts the local runtime before chatting", async () => {
  const { createLocalChatClient } = await import("./localChatClient.js");
  const fetchImpl = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status: "idle", model: "Qwen2.5-Coder-7B-Instruct" }),
  });
  const client = createLocalChatClient({ fetchImpl });
  expect(typeof client.start, "start 尚未实现").toBe("function");

  const result = await client.start();

  expect(result.status).toBe("idle");
  expect(fetchImpl).toHaveBeenCalledWith(
    "/api/local-chat/start",
    expect.objectContaining({ method: "POST" }),
  );
});

it("cancels the active request by its identifier", async () => {
  const { createLocalChatClient } = await import("./localChatClient.js");
  const fetchImpl = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ cancelled: true }),
  });
  const client = createLocalChatClient({ fetchImpl });
  expect(typeof client.cancel, "cancel 尚未实现").toBe("function");

  const result = await client.cancel("request-stop");

  expect(result).toEqual({ cancelled: true });
  expect(fetchImpl).toHaveBeenCalledWith(
    "/api/local-chat/cancel",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ request_id: "request-stop" }),
    }),
  );
});

it("unloads the local runtime on request", async () => {
  const { createLocalChatClient } = await import("./localChatClient.js");
  const fetchImpl = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status: "idle" }),
  });
  const client = createLocalChatClient({ fetchImpl });
  expect(typeof client.unload, "unload 尚未实现").toBe("function");

  const result = await client.unload();

  expect(result).toEqual({ status: "idle" });
  expect(fetchImpl).toHaveBeenCalledWith(
    "/api/local-chat/unload",
    expect.objectContaining({ method: "POST" }),
  );
});
