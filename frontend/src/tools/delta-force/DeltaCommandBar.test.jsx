import { cleanup, render, screen } from "@testing-library/react";
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
      />
    </I18nProvider>,
  );

  expect(screen.getByRole("alert").parentElement).toHaveClass("is-visible");
});
