export function createVideoFrameLoop(video, onFrame, options = {}) {
  const useVideoFrames = typeof video?.requestVideoFrameCallback === "function";
  const requestFrame = options.requestFrame || ((callback) => requestAnimationFrame(callback));
  const cancelFrame = options.cancelFrame || ((id) => cancelAnimationFrame(id));
  let active = true;
  let frameId = 0;

  const schedule = () => {
    if (!active) return;
    frameId = useVideoFrames
      ? video.requestVideoFrameCallback(tick)
      : requestFrame(tick);
  };

  const tick = (now, metadata) => {
    if (!active) return;
    onFrame(now, metadata);
    schedule();
  };

  schedule();
  return () => {
    active = false;
    if (useVideoFrames) video.cancelVideoFrameCallback?.(frameId);
    else cancelFrame(frameId);
  };
}
