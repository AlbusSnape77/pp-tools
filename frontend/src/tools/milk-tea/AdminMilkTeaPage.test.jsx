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

    await user.type(screen.getByLabelText("Admin password"), "secret");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("2 orders")).toBeInTheDocument();
    expect(screen.getByText("¥36 revenue")).toBeInTheDocument();
    expect(screen.getByText("Brown Sugar Milk Tea")).toBeInTheDocument();
    expect(screen.getByText("ORDER007")).toBeInTheDocument();
  });

  it("creates a product and updates an order", async () => {
    const fetchMock = stubAdminApi();
    const user = userEvent.setup();
    render(<AdminMilkTeaPage />);
    await user.type(screen.getByLabelText("Admin password"), "secret");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    const form = await screen.findByRole("form", { name: "Create product" });

    await user.type(within(form).getByLabelText("Product name"), "Taro Milk");
    await user.type(within(form).getByLabelText("Category"), "Milk Tea");
    await user.type(within(form).getByLabelText("Price"), "19");
    await user.type(within(form).getByLabelText("Description"), "Taro and milk.");
    await user.click(within(form).getByRole("button", { name: "Create product" }));
    await user.click(screen.getByRole("button", { name: "Mark ready" }));

    expect(fetchMock.mock.calls.some(([path, options]) =>
      path === "/api/admin/milk-tea/products" && options.method === "POST",
    )).toBe(true);
    expect(fetchMock.mock.calls.some(([path, options]) =>
      path === "/api/admin/milk-tea/orders/7/status" && options.method === "PATCH",
    )).toBe(true);
  });
});
