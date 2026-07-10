import { describe, expect, it } from "vitest";
import {
  bestVerdict,
  displayValue,
  kdClass,
  radarValue,
  rateClass,
  verdict,
} from "./deltaViewModel";

describe("deltaViewModel", () => {
  it("formats missing values and grades stats", () => {
    expect(displayValue(null)).toBe("—");
    expect(kdClass("2.1")).toBe("good");
    expect(kdClass("1.2")).toBe("mid");
    expect(rateClass("20%")).toBe("bad");
  });

  it("builds a verdict and selects the stronger mode", () => {
    expect(verdict({ kd: ["1", "1", "2.2"], escape_rate: "50%" })).toEqual({
      text: "大佬",
      className: "v-top",
    });
    expect(bestVerdict({
      overview: { kd: ["1", "1", "0.5"], escape_rate: "20%" },
      ranked: { kd: ["1", "1", "1.5"], escape_rate: "35%" },
    })).toEqual({ text: "高手", className: "v-good" });
  });

  it("reads Chinese and normalized radar keys", () => {
    expect(radarValue({ 战斗: 68 }, "战斗")).toBe(68);
    expect(radarValue({ combat: 72 }, "战斗")).toBe(72);
  });
});
