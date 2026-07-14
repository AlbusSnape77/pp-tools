import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DeltaCountdown from "./DeltaCountdown";
import { I18nProvider } from "../../i18n/I18nContext";


afterEach(() => {
  vi.useRealTimers();
});


it("waits five seconds before submitting and can cancel", async () => {
  vi.useFakeTimers();
  const onComplete = vi.fn();
  const onCancel = vi.fn();
  render(
    <I18nProvider language="zh">
      <DeltaCountdown seconds={5} onComplete={onComplete} onCancel={onCancel} />
    </I18nProvider>,
  );

  expect(screen.getByText("5")).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(4000);
  expect(onComplete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  await vi.advanceTimersByTimeAsync(2000);

  expect(onComplete).not.toHaveBeenCalled();
  expect(onCancel).toHaveBeenCalledOnce();
});
