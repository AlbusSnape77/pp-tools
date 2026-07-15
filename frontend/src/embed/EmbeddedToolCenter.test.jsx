import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import EmbeddedToolCenter from "./EmbeddedToolCenter";

const embedCss = readFileSync(path.resolve("src/embed/embed.css"), "utf8");

afterEach(cleanup);

it("navigates inside the host and updates language without reloading", async () => {
  const onNavigate = vi.fn();
  const { rerender } = render(
    <EmbeddedToolCenter language="zh" route="home" onNavigate={onNavigate} assetBaseUrl="/tools/pp-tools" />,
  );

  expect(screen.getByRole("heading", { name: "我的在线工具箱" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("link", { name: "查看战绩" }));
  expect(onNavigate).toHaveBeenCalledWith("delta-force");

  rerender(
    <EmbeddedToolCenter language="en" route="home" onNavigate={onNavigate} assetBaseUrl="/tools/pp-tools" />,
  );
  expect(screen.getByRole("heading", { name: "My Online Toolbox" })).toBeInTheDocument();
});

it("falls back to the tool gallery for unknown routes", () => {
  render(<EmbeddedToolCenter language="zh" route="unknown" onNavigate={() => {}} />);
  expect(screen.getByRole("heading", { name: "我的在线工具箱" })).toBeInTheDocument();
});

it("renders the Delta detail flush with an in-toolbar back action", async () => {
  const onNavigate = vi.fn();
  const companionClient = {
    health: vi.fn().mockResolvedValue({ version: "1.0.0", api_version: 1 }),
    hasToken: () => false,
  };
  const { container } = render(
    <EmbeddedToolCenter
      language="zh"
      route="delta-force"
      onNavigate={onNavigate}
      companionClient={companionClient}
    />,
  );

  expect(container.querySelector(".embedded-detail")).toHaveClass("embedded-detail--flush");
  expect(container.querySelector(".embed-back")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "返回工具中心" }));
  expect(onNavigate).toHaveBeenCalledWith("home");
  expect(embedCss).toMatch(/\.pp-tools-embed #topbar\s*{[^}]*top:\s*0/);
});

it("renders the local conversation route and returns to the gallery", async () => {
  const onNavigate = vi.fn();
  const chatClient = {
    start: vi.fn().mockResolvedValue({ status: "idle" }),
  };
  render(
    <EmbeddedToolCenter
      language="zh"
      route="local-chat"
      onNavigate={onNavigate}
      chatClient={chatClient}
    />,
  );

  expect(screen.getByRole("heading", { level: 1, name: "本地编程助手" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "返回工具中心" }));
  expect(onNavigate).toHaveBeenCalledWith("home");
});
