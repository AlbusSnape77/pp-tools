import { expect, it, vi } from "vitest";
import { createVideoFrameLoop } from "./frameScheduler";

it("uses camera video frames when the browser supports them", () => {
  let nextFrame = null;
  const video = {
    requestVideoFrameCallback: vi.fn((callback) => {
      nextFrame = callback;
      return 7;
    }),
    cancelVideoFrameCallback: vi.fn(),
  };
  const onFrame = vi.fn();

  const stop = createVideoFrameLoop(video, onFrame);
  expect(video.requestVideoFrameCallback).toHaveBeenCalledOnce();
  nextFrame(12, { mediaTime: 1 });
  expect(onFrame).toHaveBeenCalledWith(12, { mediaTime: 1 });

  stop();
  expect(video.cancelVideoFrameCallback).toHaveBeenCalledWith(7);
});

it("falls back to animation frames and cancels cleanly", () => {
  let nextFrame = null;
  const requestFrame = vi.fn((callback) => {
    nextFrame = callback;
    return 9;
  });
  const cancelFrame = vi.fn();
  const onFrame = vi.fn();

  const stop = createVideoFrameLoop({}, onFrame, { requestFrame, cancelFrame });
  nextFrame(18);
  expect(onFrame).toHaveBeenCalledWith(18, undefined);
  stop();
  expect(cancelFrame).toHaveBeenCalledWith(9);
});
