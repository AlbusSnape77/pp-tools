import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeltaForcePage from "./DeltaForcePage";
import { STORAGE_KEY } from "./deltaRecordStore";


const recognizedResult = {
  nickname: "PeRo追风君子",
  home: { nickname: "PeRo追风君子", uid: "45130520309978485133", total_assets: "515.8M" },
  overview: {
    kd: ["7.2", "1.2", "1.9"], escape_rate: "35.3%", matches: 853,
    rank_name: "三角洲巅峰", rank_star: 44,
    radar: { 战斗: 68, 生存: 73, 合作: 62, 搜索: 72, 财富: 100 },
  },
  recent: { hidden: false, matches: [] },
};

const recognizedPlayer = {
  id: 1,
  nickname: recognizedResult.nickname,
  tags: ["猛攻"],
  note: "重点观察",
  data: recognizedResult,
  created_at: "2026-07-10T10:00:00.000Z",
  updated_at: "2026-07-10T10:00:00.000Z",
};

function fakeCompanionClient({ players = [], jobs = [] } = {}) {
  let jobIndex = 0;
  return {
    health: vi.fn().mockResolvedValue({ version: "1.0.0" }),
    hasToken: vi.fn(() => true),
    getUsage: vi.fn().mockResolvedValue({ today_count: 2, daily_limit: 100 }),
    listPlayers: vi.fn().mockResolvedValue(players),
    manualLookup: vi.fn().mockResolvedValue({ player: recognizedPlayer, recognized_nickname: recognizedPlayer.nickname }),
    autoLookup: vi.fn().mockResolvedValue({ job_id: "job-1" }),
    getJob: vi.fn().mockImplementation(async () => jobs[Math.min(jobIndex++, jobs.length - 1)]),
    cancelJob: vi.fn().mockResolvedValue({ id: "job-1", state: "cancelled" }),
    updatePlayer: vi.fn().mockImplementation(async (id, patch) => ({ ...recognizedPlayer, id, ...patch })),
    deletePlayer: vi.fn().mockResolvedValue(null),
    revokePairing: vi.fn().mockResolvedValue(null),
  };
}


beforeEach(() => {
  localStorage.clear();
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


describe("DeltaForcePage Companion workflow", () => {
  it("highlights Companion startup while the local service is unavailable", async () => {
    const client = fakeCompanionClient();
    client.health.mockRejectedValue({ code: "companion_unavailable" });
    client.hasToken.mockReturnValue(false);

    render(<DeltaForcePage companionClient={client} />);

    const guide = await screen.findByRole("region", { name: "Delta 使用指南" });
    expect(within(guide).getByText("启动 Companion").closest("li")).toHaveClass("is-active");
  });

  it("moves the guide to game preparation after Companion is ready", async () => {
    const client = fakeCompanionClient();

    render(<DeltaForcePage companionClient={client} />);

    const guide = await screen.findByRole("region", { name: "Delta 使用指南" });
    expect(within(guide).getByText("打开游戏并停留在可操作的大厅界面").closest("li")).toHaveClass("is-active");
  });

  it("keeps rendering when a migrated match has no map time", async () => {
    const playerWithIncompleteMatch = {
      ...recognizedPlayer,
      data: {
        ...recognizedPlayer.data,
        recent: {
          hidden: false,
          matches: [{ result: "failed", map_time: null, kills: null }],
        },
      },
    };
    const client = fakeCompanionClient({ players: [playerWithIncompleteMatch] });

    render(<DeltaForcePage companionClient={client} />);

    expect(await screen.findByDisplayValue(recognizedPlayer.nickname)).toBeInTheDocument();
  });

  it("submits an automatic lookup, polls progress, and opens the stored player", async () => {
    const client = fakeCompanionClient({
      jobs: [
        { id: "job-1", state: "running", step: "type_query", message: "输入昵称或 UID" },
        { id: "job-1", state: "running", step: "capture_recent", message: "截取最近战绩" },
        { id: "job-1", state: "done", step: "store", player: recognizedPlayer },
      ],
    });
    render(<DeltaForcePage companionClient={client} countdownSeconds={0} pollInterval={1} />);
    await waitFor(() => expect(client.listPlayers).toHaveBeenCalled());

    await userEvent.type(
      screen.getByPlaceholderText("输入对方昵称或编号(UID)，回车查询"),
      "123456",
    );
    await userEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(await screen.findByDisplayValue(recognizedPlayer.nickname)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 220));
    expect(screen.getByDisplayValue(recognizedPlayer.nickname)).toBeInTheDocument();
    expect(client.autoLookup).toHaveBeenCalledWith("123456");
  });

  it("uses Companion for manual recognition instead of browser storage", async () => {
    const client = fakeCompanionClient();
    render(<DeltaForcePage companionClient={client} />);
    await waitFor(() => expect(client.listPlayers).toHaveBeenCalled());

    const file = new File(["content"], "sample.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("资料页截图"), file);
    await userEvent.click(screen.getByRole("button", { name: "识别并记录" }));

    expect(await screen.findByDisplayValue(recognizedPlayer.nickname)).toBeInTheDocument();
    expect(client.manualLookup).toHaveBeenCalledWith([file]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("loads, edits, and deletes players through Companion", async () => {
    const client = fakeCompanionClient({ players: [recognizedPlayer] });
    render(<DeltaForcePage companionClient={client} />);
    expect(await screen.findByDisplayValue("重点观察")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("玩家备注"));
    await userEvent.type(screen.getByLabelText("玩家备注"), "远程观察");
    await userEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(client.updatePlayer).toHaveBeenCalledWith(
      recognizedPlayer.id,
      expect.objectContaining({ note: "远程观察" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(client.deletePlayer).toHaveBeenCalledWith(recognizedPlayer.id);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
