import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import DeltaRadar from "./DeltaRadar";


afterEach(cleanup);


it("keeps radar colors on the SVG elements used by image export", () => {
  const { container } = render(
    <I18nProvider language="zh">
      <DeltaRadar radar={{ battle: 69, wealth: 100, search: 65, cooperation: 63, survival: 70 }} caption="overview" />
    </I18nProvider>,
  );

  expect(container.querySelector(".radar-grid")).toHaveAttribute("fill", "none");
  expect(container.querySelector(".radar-axis")).toHaveAttribute("stroke", "#262e31");
  expect(container.querySelector(".radar-data")).toHaveAttribute("fill", "#25e08d");
  expect(container.querySelector(".radar-data")).toHaveAttribute("fill-opacity", "0.16");
  expect(container.querySelector(".radar-data")).toHaveAttribute("stroke", "#25e08d");
  expect(container.querySelector(".radar-dot")).toHaveAttribute("fill", "#25e08d");
  expect(container.querySelector(".radar-label")).toHaveAttribute("fill", "#93a0a4");
  expect(container.querySelector(".radar-number")).toHaveAttribute("fill", "#e8edee");
});
