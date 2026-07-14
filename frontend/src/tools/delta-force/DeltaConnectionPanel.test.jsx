import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import DeltaConnectionPanel from "./DeltaConnectionPanel";
import { I18nProvider } from "../../i18n/I18nContext";


function runtime(state) {
  return {
    state,
    launch: vi.fn(),
    detect: vi.fn(),
    pair: vi.fn(),
    disconnect: vi.fn(),
  };
}


it("offers download, launch, pairing, permission recovery, and update", async () => {
  const unavailable = runtime("unavailable");
  const view = render(
    <I18nProvider language="zh">
      <DeltaConnectionPanel connection={unavailable} downloadUrl="/downloads/Delta-Companion.exe" />
    </I18nProvider>,
  );

  expect(screen.getByRole("link", { name: "下载 Companion" })).toHaveAttribute("href", "/downloads/Delta-Companion.exe");
  await userEvent.click(screen.getByRole("button", { name: "启动 Companion" }));
  expect(unavailable.launch).toHaveBeenCalledOnce();

  const pairing = runtime("pairing_required");
  view.rerender(
    <I18nProvider language="zh">
      <DeltaConnectionPanel connection={pairing} downloadUrl="/downloads/Delta-Companion.exe" />
    </I18nProvider>,
  );
  await userEvent.type(screen.getByLabelText("6 位配对码"), "123456");
  await userEvent.click(screen.getByRole("button", { name: "配对" }));
  expect(pairing.pair).toHaveBeenCalledWith("123456");

  const permission = runtime("permission_denied");
  view.rerender(
    <I18nProvider language="zh">
      <DeltaConnectionPanel connection={permission} downloadUrl="/downloads/Delta-Companion.exe" />
    </I18nProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "重新检测" }));
  expect(permission.detect).toHaveBeenCalledOnce();

  view.rerender(
    <I18nProvider language="zh">
      <DeltaConnectionPanel connection={runtime("version_incompatible")} downloadUrl="/downloads/Delta-Companion.exe" />
    </I18nProvider>,
  );
  expect(screen.getByRole("link", { name: "下载 Companion" })).toBeInTheDocument();
});
