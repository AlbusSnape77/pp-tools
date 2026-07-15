import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  window.history.pushState({}, "", "/");
});

describe("App", () => {
  it("renders the Chinese tool center and shared navigation", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "我的在线工具箱" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByRole("link", { name: "返回个人网站" })).toHaveAttribute(
      "href",
      "https://albussnape77.github.io",
    );
  });

  it("renders the immersive Delta route without the shared navigation", async () => {
    window.history.pushState({}, "", "/tools/delta-force");

    const { container } = render(<App />);

    expect(await screen.findByRole("button", { name: "返回工具中心" })).toBeInTheDocument();
    expect(container.querySelector(".brand")).toHaveTextContent("DELTASTATS");
    expect(screen.queryByRole("navigation", { name: "主导航" })).not.toBeInTheDocument();
  });

  it("renders the Beauty Cam route", () => {
    window.history.pushState({}, "", "/tools/beauty-cam");

    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "手势美颜相机" }),
    ).toBeInTheDocument();
  });

  it("renders the immersive local conversation route", () => {
    window.history.pushState({}, "", "/tools/local-chat");

    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "本地编程助手" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "主导航" })).not.toBeInTheDocument();
  });

  it("旧奶茶网页路由回到工具首页，导航指向源码卡片", () => {
    window.history.pushState({}, "", "/tools/milk-tea");

    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "我的在线工具箱" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "奶茶源码" })).toHaveAttribute("href", "/#tools");
  });
});
