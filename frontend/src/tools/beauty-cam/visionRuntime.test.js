import { describe, expect, it } from "vitest";
import { buildVisionPaths, createAdaptiveDetectionScheduler } from "./visionRuntime";

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

describe("createAdaptiveDetectionScheduler", () => {
  it("allows fast detection and backs off when processing becomes expensive", () => {
    const scheduler = createAdaptiveDetectionScheduler();

    expect(scheduler.shouldDetect(0)).toBe(true);
    scheduler.recordDuration(8);
    expect(scheduler.getInterval()).toBe(16);
    expect(scheduler.shouldDetect(15)).toBe(false);
    expect(scheduler.shouldDetect(16)).toBe(true);

    scheduler.recordDuration(50);
    expect(scheduler.getInterval()).toBe(75);
    expect(scheduler.shouldDetect(80)).toBe(false);
    expect(scheduler.shouldDetect(91)).toBe(true);
  });
});
