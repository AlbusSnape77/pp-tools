import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import MilkTeaSourcePage from "./MilkTeaSourcePage";

afterEach(cleanup);

it("renders Japanese import guidance and the embedded source download", () => {
  render(
    <I18nProvider language="ja">
      <MilkTeaSourcePage assetBaseUrl="/tools/pp-tools" onBack={() => {}} />
    </I18nProvider>,
  );

  expect(screen.getByRole("heading", { name: "三平方ミルクティー・ミニプログラム" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "ソースをダウンロード" })).toHaveAttribute(
    "href",
    "/tools/pp-tools/downloads/sanpingfang-miniprogram-source.zip",
  );
  expect(screen.getByText("WeChat 開発者ツールで解凍フォルダーを読み込む")).toBeInTheDocument();
});
