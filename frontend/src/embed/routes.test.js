import { expect, it } from "vitest";
import { normalizeToolRoute } from "./routes";

it("normalizes supported and unknown tool routes", () => {
  expect(normalizeToolRoute("home")).toBe("home");
  expect(normalizeToolRoute("delta-force")).toBe("delta-force");
  expect(normalizeToolRoute("delta-force/calibration")).toBe("delta-force/calibration");
  expect(normalizeToolRoute("delta-force/unknown")).toBe("home");
  expect(normalizeToolRoute("beauty-cam")).toBe("beauty-cam");
  expect(normalizeToolRoute("milk-tea")).toBe("milk-tea");
  expect(normalizeToolRoute("unknown")).toBe("home");
});
