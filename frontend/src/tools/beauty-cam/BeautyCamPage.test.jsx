import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BeautyCamPage from "./BeautyCamPage";
import { I18nProvider } from "../../i18n/I18nContext";

function makeStream() {
  const tracks = [{ stop: vi.fn() }];
  return {
    getTracks: () => tracks,
  };
}

beforeEach(() => {
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn() },
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,capture");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BeautyCamPage", () => {
  it("只在用户点击后申请相机权限，并允许关闭相机", async () => {
    const stream = makeStream();
    navigator.mediaDevices.getUserMedia.mockResolvedValue(stream);
    render(<BeautyCamPage />);

    expect(screen.getByRole("heading", { name: "手势美颜相机" })).toBeInTheDocument();
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "开启相机" }));
    await waitFor(() => expect(screen.getByText("相机已开启")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "关闭相机" }));
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it("显示授权拒绝说明并允许重新检测", async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue({ name: "NotAllowedError" });
    render(<BeautyCamPage />);

    await userEvent.click(screen.getByRole("button", { name: "开启相机" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("允许摄像头权限");
    expect(screen.getByRole("button", { name: "重新检测" })).toBeInTheDocument();
  });

  it("更新美颜参数并完成拍照和重拍", async () => {
    navigator.mediaDevices.getUserMedia.mockResolvedValue(makeStream());
    render(<BeautyCamPage />);
    await userEvent.click(screen.getByRole("button", { name: "开启相机" }));

    fireEvent.change(screen.getByLabelText("磨皮"), { target: { value: "72" } });
    expect(screen.getByText("72")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "拍照" }));
    expect(screen.getByRole("dialog", { name: "照片预览" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "重新拍摄" }));
    expect(screen.queryByRole("dialog", { name: "照片预览" })).not.toBeInTheDocument();
  });

  it("在英文嵌入模式下提供完整的相机操作文案", async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue({ name: "NotAllowedError" });
    render(
      <I18nProvider language="en" config={{ assetBaseUrl: "/tools/pp-tools/" }}>
        <BeautyCamPage />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "Gesture Beauty Camera" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start camera" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Allow camera access");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByLabelText("Smoothing")).toBeInTheDocument();
  });
});
