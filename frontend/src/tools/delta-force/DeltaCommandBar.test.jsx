import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import DeltaCommandBar from "./DeltaCommandBar";

afterEach(cleanup);

it("keeps an error status in a dedicated visible row", () => {
  render(
    <I18nProvider language="zh">
      <DeltaCommandBar
        query=""
        recordCount={0}
        status={{ kind: "err", text: "automation_failed" }}
        busy={false}
        usage={null}
        ready
        onQueryChange={vi.fn()}
        onSearch={vi.fn()}
        onStop={vi.fn()}
        onCalibration={vi.fn()}
        onBack={vi.fn()}
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("alert").parentElement).toHaveClass("is-visible");
});

it("provides an explicit keyboard-accessible back action", async () => {
  const onBack = vi.fn();
  render(
    <I18nProvider language="zh">
      <DeltaCommandBar
        query=""
        recordCount={0}
        status={null}
        busy={false}
        usage={null}
        ready
        onQueryChange={vi.fn()}
        onSearch={vi.fn()}
        onStop={vi.fn()}
        onCalibration={vi.fn()}
        onBack={onBack}
      />
    </I18nProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "返回工具中心" }));
  expect(onBack).toHaveBeenCalledOnce();
});
