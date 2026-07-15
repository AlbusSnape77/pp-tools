import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import HomePage from "./HomePage";

afterEach(cleanup);

describe("HomePage", () => {
  it("renders the Chinese tool gallery with real previews", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "我的在线工具箱" })).toBeInTheDocument();
    expect(screen.getByText("三个网页工具和一个小程序源码项目。"))
      .toBeInTheDocument();
    expect(screen.queryByText("三个完整项目，打开网页即可直接使用。"))
      .not.toBeInTheDocument();
    const gallery = screen.getByRole("region", { name: "在线工具" });
    const entryLinks = [
      within(gallery).getByRole("link", { name: "进入Delta 战绩分析" }),
      within(gallery).getByRole("link", { name: "进入手势美颜相机" }),
      within(gallery).getByRole("link", { name: "进入本地编程助手" }),
    ];
    expect(entryLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/tools/delta-force",
      "/tools/beauty-cam",
      "/tools/local-chat",
    ]);
    const download = within(gallery).getByRole("link", { name: "下载三平方奶茶店小程序源码" });
    expect(download).toHaveAttribute("href", "/downloads/sanpingfang-miniprogram-source.zip");
    expect(download).toHaveAttribute("download", "sanpingfang-miniprogram-source.zip");
    expect(within(gallery).getAllByRole("img")).toHaveLength(4);
    expect(within(gallery).getAllByText("可直接使用")).toHaveLength(2);
    expect(within(gallery).getByText("源码可下载")).toBeInTheDocument();
    expect(within(gallery).getByText("仅供作者使用")).toBeInTheDocument();
    expect(within(gallery).getByText(/当前页面仅作项目展示，不提供在线模型服务/))
      .toBeInTheDocument();
  });

  it("uses host navigation and English copy in embedded mode", async () => {
    const onNavigate = vi.fn();
    render(
      <I18nProvider language="en">
        <HomePage embedded onNavigate={onNavigate} assetBaseUrl="/tools/pp-tools" />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "My Online Toolbox" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Browse all tools" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "View stats" }));
    expect(onNavigate).toHaveBeenCalledWith("delta-force");
    await userEvent.click(screen.getByRole("link", { name: "View source" }));
    expect(onNavigate).toHaveBeenCalledWith("milk-tea");
  });
});
