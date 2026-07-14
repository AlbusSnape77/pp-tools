import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminMilkTeaPage from "./AdminMilkTeaPage";

const product = {
  id: 1,
  name: "Brown Sugar Milk Tea",
  category: "Milk Tea",
  price: 18,
  description: "Brown sugar.",
  active: true,
};
const order = {
  id: 7,
  lookup_code: "ORDER007",
  customer_name: "Ada",
  status: "pending",
  total: 18,
  items: [],
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubAdminApi() {
  const fetchMock = vi.fn((path, options = {}) => {
    if (path === "/api/admin/login") return Promise.resolve(jsonResponse({ token: "token" }));
    if (path === "/api/admin/milk-tea/summary") {
      return Promise.resolve(jsonResponse({ summary: { order_count: 2, revenue: 36 } }));
    }
    if (path === "/api/admin/milk-tea/orders") {
      return Promise.resolve(jsonResponse({ orders: [order] }));
    }
    if (path === "/api/admin/milk-tea/products" && options.method === "POST") {
      return Promise.resolve(jsonResponse({ product: { ...product, id: 2, name: "Taro Milk" } }, 201));
    }
    if (path === "/api/admin/milk-tea/products") {
      return Promise.resolve(jsonResponse({ products: [product] }));
    }
    if (path === "/api/admin/milk-tea/orders/7/status") {
      return Promise.resolve(jsonResponse({ order: { ...order, status: "ready" } }));
    }
    return Promise.resolve(jsonResponse({ error: "Not found." }, 404));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdminMilkTeaPage", () => {
  it("logs in and displays summary, products, and orders", async () => {
    stubAdminApi();
    const user = userEvent.setup();
    render(<AdminMilkTeaPage />);

    await user.type(screen.getByLabelText("管理密码"), "secret");
    await user.click(screen.getByRole("button", { name: "进入管理台" }));

    expect(await screen.findByText("2 单")).toBeInTheDocument();
    expect(screen.getByText("¥36")).toBeInTheDocument();
    expect(screen.getByText("黑糖珍珠鲜奶")).toBeInTheDocument();
    expect(screen.getByText("ORDER007")).toBeInTheDocument();
  });

  it("creates a product and updates an order", async () => {
    const fetchMock = stubAdminApi();
    const user = userEvent.setup();
    render(<AdminMilkTeaPage />);
    await user.type(screen.getByLabelText("管理密码"), "secret");
    await user.click(screen.getByRole("button", { name: "进入管理台" }));
    const form = await screen.findByRole("form", { name: "新增商品" });

    await user.type(within(form).getByLabelText("商品名称"), "香芋牛乳");
    await user.type(within(form).getByLabelText("分类"), "奶茶");
    await user.type(within(form).getByLabelText("价格"), "19");
    await user.type(within(form).getByLabelText("商品描述"), "香芋与鲜牛乳。 ");
    await user.click(within(form).getByRole("button", { name: "新增商品" }));
    await user.click(screen.getByRole("button", { name: "通知取餐" }));

    expect(fetchMock.mock.calls.some(([path, options]) =>
      path === "/api/admin/milk-tea/products" && options.method === "POST",
    )).toBe(true);
    expect(fetchMock.mock.calls.some(([path, options]) =>
      path === "/api/admin/milk-tea/orders/7/status" && options.method === "PATCH",
    )).toBe(true);
  });
});
