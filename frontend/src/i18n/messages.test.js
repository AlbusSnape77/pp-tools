import { describe, expect, it } from "vitest";
import { formatMessage, getMessage, listMessageKeys, normalizeLanguage } from "./messages";

describe("tool messages", () => {
  it("keeps zh en and ja message keys aligned", () => {
    expect(listMessageKeys("en")).toEqual(listMessageKeys("zh"));
    expect(listMessageKeys("ja")).toEqual(listMessageKeys("zh"));
  });

  it("normalizes unsupported languages and falls back to Chinese", () => {
    expect(normalizeLanguage("fr")).toBe("zh");
    expect(getMessage("en", "common.retry")).toBe("Retry");
    expect(getMessage("fr", "common.retry")).toBe("重试");
    expect(getMessage("en", "missing.key")).toBe("missing.key");
  });

  it("keeps arrays and objects intact while formatting strings", () => {
    const features = getMessage("en", "home.delta.features");
    expect(formatMessage(features)).toBe(features);
    expect(formatMessage("Added {count} screenshots", { count: 2 })).toBe("Added 2 screenshots");
  });
});
