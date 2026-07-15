export function createLocalChatClient({ fetchImpl = window.fetch.bind(window), baseUrl = "" } = {}) {
  const prefix = String(baseUrl || "").replace(/\/+$/, "");

  async function requestJson(path, options = {}) {
    const response = await fetchImpl(`${prefix}${path}`, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
    return payload;
  }

  function start() {
    return requestJson("/api/local-chat/start", { method: "POST" });
  }

  function cancel(requestId) {
    return requestJson("/api/local-chat/cancel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request_id: requestId }),
    });
  }

  function unload() {
    return requestJson("/api/local-chat/unload", { method: "POST" });
  }

  async function* chat(payload) {
    const response = await fetchImpl(`${prefix}/api/local-chat/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }
    if (!response.body) throw new Error("当前浏览器不支持流式回答");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = pending.split("\n");
      pending = lines.pop() || "";
      for (const line of lines) {
        if (line.trim()) yield JSON.parse(line);
      }
      if (done) break;
    }
    if (pending.trim()) yield JSON.parse(pending);
  }

  return { cancel, chat, start, unload };
}
