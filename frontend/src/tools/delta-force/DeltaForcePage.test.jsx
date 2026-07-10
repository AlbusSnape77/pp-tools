import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeltaForcePage from "./DeltaForcePage";
import { STORAGE_KEY } from "./deltaRecordStore";

const recognizedResult = {
  nickname: "PeRo追风君子",
  home: {
    nickname: "PeRo追风君子",
    uid: "45130520309978485133",
    title: "铜陵猛攻大师",
    total_matches: 853,
    total_assets: "515.8M",
  },
  overview: {
    kd: ["7.2", "1.2", "1.9"],
    escape_rate: "35.3%",
    matches: 853,
    rank_name: "三角洲巅峰",
    rank_star: 44,
    radar: { 战斗: 68, 生存: 73, 合作: 62, 搜索: 72, 财富: 100 },
  },
  ranked: {
    kd: [null, "1.3", "2"],
    escape_rate: "30.7%",
    matches: 492,
  },
  recent: {
    hidden: false,
    matches: [{
      result: "撤离成功",
      map_time: "航天基地-机密 昨天 22:14",
      kills: 4,
    }],
  },
};

function makeRecord() {
  return {
    id: "record-1",
    nickname: recognizedResult.nickname,
    uid: recognizedResult.home.uid,
    title: recognizedResult.home.title,
    tags: ["猛攻"],
    note: "重点观察",
    data: recognizedResult,
    created_at: "2026-07-10T10:00:00.000Z",
    updated_at: "2026-07-10T10:00:00.000Z",
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:preview"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("DeltaForcePage", () => {
  it("recognizes screenshots and stores the dossier in the local roster", async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({
      result: recognizedResult,
      warnings: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<DeltaForcePage />);
    const file = new File(["content"], "sample.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("资料页截图"), file);
    await userEvent.click(screen.getByRole("button", { name: "识别并记录" }));

    expect(await screen.findByDisplayValue("PeRo追风君子")).toBeInTheDocument();
    expect(screen.getAllByText("三角洲巅峰 ★44")).toHaveLength(2);
    expect(screen.getByText("515.8M")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith("/api/delta-force/analyze", expect.objectContaining({
      method: "POST",
      body: expect.any(FormData),
    }));
  });

  it("searches, edits, saves, and deletes a local dossier", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeRecord()]));
    render(<DeltaForcePage />);

    await userEvent.type(screen.getByPlaceholderText("输入对方昵称或编号(UID)，回车查询"), recognizedResult.home.uid);
    await userEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(screen.getByDisplayValue("重点观察")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("玩家备注"));
    await userEvent.type(screen.getByLabelText("玩家备注"), "改为远程观察");
    await userEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))[0].note).toBe("改为远程观察");
    await userEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(confirm).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(0);
    expect(screen.getByText("从左侧花名册选择玩家，或在顶部直接查询")).toBeInTheDocument();
  });

  it("keeps a partial result and reports the recognition status", async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({
      result: { nickname: "只识别到昵称" },
      warnings: ["Some fields were not recognized."],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<DeltaForcePage />);
    await userEvent.upload(
      screen.getByLabelText("资料页截图"),
      new File(["content"], "partial.png", { type: "image/png" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "识别并记录" }));

    expect(await screen.findByDisplayValue("只识别到昵称")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("部分字段未识别");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(1);
  });

  it("does not store an empty recognition result", async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({
      result: {},
      warnings: ["No supported result screens were recognized."],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<DeltaForcePage />);
    await userEvent.upload(
      screen.getByLabelText("资料页截图"),
      new File(["content"], "empty.png", { type: "image/png" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "识别并记录" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("没有识别到可用资料");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")).toHaveLength(0);
  });

  it("shows the server error when analysis fails", async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({
      error: "Screenshot could not be read.",
    }), { status: 422, headers: { "Content-Type": "application/json" } }));

    render(<DeltaForcePage />);
    const file = new File(["content"], "sample.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("资料页截图"), file);
    await userEvent.click(screen.getByRole("button", { name: "识别并记录" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Screenshot could not be read.");
  });
});
