import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import DeltaDossier from "./DeltaDossier";


const { toBlobMock, toSvgMock } = vi.hoisted(() => ({ toBlobMock: vi.fn(), toSvgMock: vi.fn() }));
vi.mock("html-to-image", () => ({ toBlob: toBlobMock, toSvg: toSvgMock }));

const clipboardWrite = vi.fn();
const createObjectURL = vi.fn(() => "blob:result");
const revokeObjectURL = vi.fn();
const imageDecode = vi.fn(() => new Promise(() => {}));
const canvasDrawImage = vi.fn();


const record = {
  id: 1,
  nickname: "测试玩家",
  tags: [],
  note: "",
  updated_at: "2026-07-13T10:00:00.000Z",
  data: {
    home: { uid: "123456789012345678", total_matches: 1 },
    overview: { kd: ["2.1", "1.9", "1.6"] },
    recent: {
      hidden: false,
      matches: [{ result: "中途退出", map_time: "航天基地-绝密 昨天 23:51", hafu: "284,661" }],
    },
  },
};


beforeEach(() => {
  toBlobMock.mockResolvedValue(new Blob(["result"], { type: "image/png" }));
  toSvgMock.mockResolvedValue("data:image/svg+xml;charset=utf-8,export");
  clipboardWrite.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { write: clipboardWrite },
  });
  vi.stubGlobal("ClipboardItem", class ClipboardItem {
    constructor(items) {
      this.items = items;
    }
  });
  vi.stubGlobal("Image", class ExportImage {
    set src(value) {
      this.currentSrc = value;
      queueMicrotask(() => this.onload?.());
    }

    decode() {
      return imageDecode();
    }
  });
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: canvasDrawImage,
    fillRect: vi.fn(),
    fillStyle: "",
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
    callback(new Blob(["result"], { type: "image/png" }));
  });
});


afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});


it("offers copy and save actions for the recognized result image", () => {
  render(
    <I18nProvider language="zh">
      <DeltaDossier record={record} onSave={vi.fn()} onDelete={vi.fn()} onCollapse={vi.fn()} />
    </I18nProvider>,
  );

  expect(screen.getByRole("button", { name: "复制结果图" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "保存结果图" })).toBeInTheDocument();
});


it("shows a mid-exit match as mid-exit instead of elimination", () => {
  render(
    <I18nProvider language="zh">
      <DeltaDossier record={record} onSave={vi.fn()} onDelete={vi.fn()} onCollapse={vi.fn()} />
    </I18nProvider>,
  );

  expect(screen.getByText("中途退出")).toBeInTheDocument();
  expect(screen.queryByText("× 阵亡")).not.toBeInTheDocument();
});


it("copies the rendered result as a PNG image", async () => {
  render(
    <I18nProvider language="zh">
      <DeltaDossier record={record} onSave={vi.fn()} onDelete={vi.fn()} onCollapse={vi.fn()} />
    </I18nProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "复制结果图" }));

  expect(toSvgMock).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
    cacheBust: false,
    skipFonts: true,
  }));
  expect(toBlobMock).not.toHaveBeenCalled();
  expect(imageDecode).not.toHaveBeenCalled();
  expect(canvasDrawImage).toHaveBeenCalledTimes(1);
  expect(clipboardWrite).toHaveBeenCalledTimes(1);
  expect(await screen.findByText("结果图已复制")).toBeInTheDocument();
});


it("downloads the rendered result as a PNG image", async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(
    <I18nProvider language="zh">
      <DeltaDossier record={record} onSave={vi.fn()} onDelete={vi.fn()} onCollapse={vi.fn()} />
    </I18nProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "保存结果图" }));

  expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalledTimes(1);
  expect(await screen.findByText("结果图已保存")).toBeInTheDocument();
});
