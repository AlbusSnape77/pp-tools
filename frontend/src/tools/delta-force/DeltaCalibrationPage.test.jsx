import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DeltaCalibrationPage from "./DeltaCalibrationPage";
import { I18nProvider } from "../../i18n/I18nContext";


beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:screenshot"),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    strokeRect: vi.fn(),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
    callback(new Blob(["crop"], { type: "image/png" }));
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, width: 800, height: 450, right: 800, bottom: 450,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});


it("captures the desktop, saves a selected crop, and deletes a template", async () => {
  const client = {
    getCalibration: vi.fn().mockResolvedValue({
      templates: {
        social_icon: { exists: false },
        add_friend_btn: { exists: true },
        all_ready: false,
      },
    }),
    getScreenshot: vi.fn().mockResolvedValue(new Blob(["screen"], { type: "image/png" })),
    saveCalibration: vi.fn().mockResolvedValue({ ok: true }),
    deleteCalibration: vi.fn().mockResolvedValue(null),
  };
  render(
    <I18nProvider language="zh">
      <DeltaCalibrationPage client={client} onBack={vi.fn()} />
    </I18nProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "获取桌面截图" }));
  const canvas = await screen.findByRole("img", { name: "当前桌面截图" });
  fireEvent.pointerDown(canvas, { clientX: 10, clientY: 20, pointerId: 1 });
  fireEvent.pointerMove(canvas, { clientX: 210, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(canvas, { clientX: 210, clientY: 100, pointerId: 1 });

  await userEvent.selectOptions(screen.getByLabelText("校准模板"), "social_icon");
  await userEvent.click(screen.getByRole("button", { name: "保存所选区域" }));
  await waitFor(() => expect(client.saveCalibration).toHaveBeenCalledWith("social_icon", expect.any(Blob)));

  await userEvent.click(screen.getByRole("button", { name: "删除 add_friend_btn 模板" }));
  expect(client.deleteCalibration).toHaveBeenCalledWith("add_friend_btn");
});
