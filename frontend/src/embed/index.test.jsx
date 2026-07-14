import { cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { mountToolCenter } from "./index";

afterEach(cleanup);

it("mounts, updates, and unmounts the tool center", async () => {
  const container = document.createElement("div");
  const controller = mountToolCenter(container, {
    language: "zh",
    route: "home",
    assetBaseUrl: "/tools/pp-tools",
    apiBaseUrl: "",
    onNavigate: vi.fn(),
  });

  expect(container).toHaveTextContent("我的在线工具箱");
  controller.update({ language: "en", route: "home" });
  expect(container).toHaveTextContent("My Online Toolbox");
  controller.unmount();
  expect(container).toBeEmptyDOMElement();
});

it("replaces the existing controller when mounting the same container twice", () => {
  const container = document.createElement("div");
  const first = mountToolCenter(container, { language: "zh", route: "home" });
  const firstUnmount = vi.spyOn(first, "unmount");

  const second = mountToolCenter(container, { language: "ja", route: "home" });

  expect(firstUnmount).toHaveBeenCalledOnce();
  expect(container).toHaveTextContent("オンラインツールボックス");
  second.unmount();
});
