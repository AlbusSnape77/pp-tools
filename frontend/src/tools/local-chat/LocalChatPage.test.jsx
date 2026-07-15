import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import LocalChatPage from "./LocalChatPage";


afterEach(cleanup);

it("connects the local service and renders the conversation shell", async () => {
  const client = {
    start: vi.fn().mockResolvedValue({ status: "idle", model: "Qwen2.5-Coder-7B-Instruct" }),
  };

  render(
    <I18nProvider language="zh">
      <LocalChatPage client={client} onBack={() => {}} />
    </I18nProvider>,
  );

  expect(screen.getByRole("heading", { level: 1, name: "本地编程助手" })).toBeInTheDocument();
  expect(screen.getByPlaceholderText("输入消息，Enter 发送，Shift + Enter 换行")).toBeInTheDocument();
  await waitFor(() => expect(client.start).toHaveBeenCalledOnce());
  expect(await screen.findByText("本地服务已连接")).toBeInTheDocument();
});

it("sends conversation context and renders a streaming reply", async () => {
  const client = {
    start: vi.fn().mockResolvedValue({ status: "idle" }),
    chat: vi.fn(async function* () {
      yield { type: "status", status: "loading" };
      yield { type: "status", status: "ready" };
      yield { type: "delta", text: "你" };
      yield { type: "delta", text: "好" };
      yield { type: "done" };
    }),
  };
  render(
    <I18nProvider language="zh">
      <LocalChatPage client={client} onBack={() => {}} />
    </I18nProvider>,
  );
  const input = screen.getByPlaceholderText("输入消息，Enter 发送，Shift + Enter 换行");

  await userEvent.type(input, "只回复你好");
  await userEvent.click(screen.getByRole("button", { name: "发送" }));

  expect(await screen.findByText("你好")).toBeInTheDocument();
  expect(screen.getByText("只回复你好")).toBeInTheDocument();
  expect(client.chat).toHaveBeenCalledOnce();
  expect(client.chat.mock.calls[0][0]).toEqual(expect.objectContaining({
    messages: [
      { role: "system", content: "你是一个可靠的本地编程助手。请使用中文回答，代码要完整且可运行。" },
      { role: "user", content: "只回复你好" },
    ],
    max_new_tokens: 512,
    temperature: 0.7,
    top_p: 0.9,
  }));
});

it("stops the active streaming reply", async () => {
  let releaseStream;
  const streamGate = new Promise((resolve) => { releaseStream = resolve; });
  const client = {
    start: vi.fn().mockResolvedValue({ status: "idle" }),
    chat: vi.fn(async function* () {
      yield { type: "status", status: "ready" };
      await streamGate;
      yield { type: "stopped" };
    }),
    cancel: vi.fn().mockImplementation(async () => {
      releaseStream();
      return { cancelled: true };
    }),
  };
  render(
    <I18nProvider language="zh">
      <LocalChatPage client={client} onBack={() => {}} />
    </I18nProvider>,
  );
  await userEvent.type(screen.getByLabelText("消息"), "写一段长回答");
  await userEvent.click(screen.getByRole("button", { name: "发送" }));

  const stopButton = await screen.findByRole("button", { name: "停止" });
  await userEvent.click(stopButton);

  await waitFor(() => expect(client.cancel).toHaveBeenCalledOnce());
  expect(client.cancel).toHaveBeenCalledWith(client.chat.mock.calls[0][0].request_id);
});

it("clears the current conversation", async () => {
  const client = {
    start: vi.fn().mockResolvedValue({ status: "idle" }),
    chat: vi.fn(async function* () {
      yield { type: "delta", text: "这是一条回答" };
      yield { type: "done" };
    }),
  };
  render(
    <I18nProvider language="zh">
      <LocalChatPage client={client} onBack={() => {}} />
    </I18nProvider>,
  );

  await userEvent.type(screen.getByLabelText("消息"), "测试问题");
  await userEvent.click(screen.getByRole("button", { name: "发送" }));
  expect(await screen.findByText("这是一条回答")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "清空对话" }));
  expect(screen.queryByText("测试问题")).not.toBeInTheDocument();
  expect(screen.getByText("今天想一起解决什么？")).toBeInTheDocument();
});

it("releases model memory on demand", async () => {
  const client = {
    start: vi.fn().mockResolvedValue({ status: "idle" }),
    unload: vi.fn().mockResolvedValue({ unloaded: true }),
  };
  render(
    <I18nProvider language="zh">
      <LocalChatPage client={client} onBack={() => {}} />
    </I18nProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "释放显存" }));
  await waitFor(() => expect(client.unload).toHaveBeenCalledOnce());
  expect(screen.getByText("显存已释放，下次发送时会重新加载模型")).toBeInTheDocument();
});

it("uses the generation settings selected by the user", async () => {
  const client = {
    start: vi.fn().mockResolvedValue({ status: "idle" }),
    chat: vi.fn(async function* () { yield { type: "done" }; }),
  };
  render(
    <I18nProvider language="zh">
      <LocalChatPage client={client} onBack={() => {}} />
    </I18nProvider>,
  );

  await userEvent.click(screen.getByText("生成设置"));
  const systemPrompt = screen.getByLabelText("系统设定");
  await userEvent.clear(systemPrompt);
  await userEvent.type(systemPrompt, "请只用一句话回答。");
  const maxTokens = screen.getByLabelText("最大回答长度");
  await userEvent.clear(maxTokens);
  await userEvent.type(maxTokens, "128");
  const temperature = screen.getByLabelText("随机性");
  await userEvent.clear(temperature);
  await userEvent.type(temperature, "0.2");
  const topP = screen.getByLabelText("候选范围");
  await userEvent.clear(topP);
  await userEvent.type(topP, "0.8");
  await userEvent.type(screen.getByLabelText("消息"), "开始测试");
  await userEvent.click(screen.getByRole("button", { name: "发送" }));

  await waitFor(() => expect(client.chat).toHaveBeenCalledOnce());
  expect(client.chat.mock.calls[0][0]).toEqual(expect.objectContaining({
    messages: [
      { role: "system", content: "请只用一句话回答。" },
      { role: "user", content: "开始测试" },
    ],
    max_new_tokens: 128,
    temperature: 0.2,
    top_p: 0.8,
  }));
});
