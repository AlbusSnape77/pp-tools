import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCameraErrorMessage, useCameraStream } from "./useCameraStream";

function makeStream() {
  const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
  return {
    getTracks: () => tracks,
  };
}

beforeEach(() => {
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn() },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useCameraStream", () => {
  it("主动启动视频流并在卸载时停止全部轨道", async () => {
    const stream = makeStream();
    navigator.mediaDevices.getUserMedia.mockResolvedValue(stream);
    const { result, unmount } = renderHook(() => useCameraStream());

    await result.current.startCamera();
    await waitFor(() => expect(result.current.status).toBe("running"));
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));

    unmount();
    for (const track of stream.getTracks()) expect(track.stop).toHaveBeenCalled();
  });

  it("把常见媒体错误转换为中文恢复说明", () => {
    expect(getCameraErrorMessage({ name: "NotAllowedError" })).toContain("允许摄像头权限");
    expect(getCameraErrorMessage({ name: "NotFoundError" })).toContain("没有找到可用摄像头");
    expect(getCameraErrorMessage({ name: "NotReadableError" })).toContain("正在被其他程序占用");
  });
});
