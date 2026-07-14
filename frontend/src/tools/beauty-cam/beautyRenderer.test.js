import { describe, expect, it } from "vitest";
import { BEAUTY_DEFAULTS, BEAUTY_FILTERS, clampBeautySettings } from "./beautyRenderer";

describe("beautyRenderer", () => {
  it("限制美颜参数并保留完整默认值", () => {
    expect(clampBeautySettings({ skin: 120, white: -8, eye: 50 })).toEqual({
      ...BEAUTY_DEFAULTS,
      skin: 100,
      white: 0,
      eye: 50,
    });
  });

  it("提供五个稳定滤镜", () => {
    expect(BEAUTY_FILTERS.map((filter) => filter.name)).toEqual(["原图", "奶油", "蜜桃", "初恋", "樱花"]);
  });
});
