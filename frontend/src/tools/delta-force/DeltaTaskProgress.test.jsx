import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import DeltaTaskProgress from "./DeltaTaskProgress";
import { I18nProvider } from "../../i18n/I18nContext";


it("shows a stable task step and exposes stop while running", () => {
  const onStop = vi.fn();
  render(
    <I18nProvider language="zh">
      <DeltaTaskProgress
        job={{ state: "running", step: "capture_recent", message: "截取最近战绩" }}
        onStop={onStop}
      />
    </I18nProvider>,
  );

  expect(screen.getByText("截取最近战绩")).toBeInTheDocument();
  screen.getByRole("button", { name: "停止任务" }).click();
  expect(onStop).toHaveBeenCalledOnce();
});
