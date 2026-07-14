import { describe, expect, it } from "vitest";
import { buildVisionPaths } from "./visionRuntime";

describe("buildVisionPaths", () => {
  it("builds standalone and embedded model paths", () => {
    expect(buildVisionPaths("")).toEqual({
      wasm: "/vision/wasm",
      face: "/vision/models/face_landmarker.task",
      hand: "/vision/models/hand_landmarker.task",
    });
    expect(buildVisionPaths("/tools/pp-tools/")).toEqual({
      wasm: "/tools/pp-tools/vision/wasm",
      face: "/tools/pp-tools/vision/models/face_landmarker.task",
      hand: "/tools/pp-tools/vision/models/hand_landmarker.task",
    });
  });
});
