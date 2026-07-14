import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MilkTeaPage from "./MilkTeaPage";

const products = [
  {
    id: 1,
    name: "Brown Sugar Milk Tea",
    category: "Milk Tea",
    price: 18,
    description: "Brown sugar, fresh milk, and black tea.",
    active: true,
  },
  {
    id: 2,
    name: "Jasmine Fruit Tea",
    category: "Fruit Tea",
    price: 16,
    description: "Jasmine tea with seasonal fruit.",
    active: true,
  },
  {
    id: 3,
    name: "Cheese Matcha",
    category: "Special",
    price: 20,
    description: "Matcha latte with a cheese foam top.",
    active: true,
  },
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubApi(handler) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MilkTeaPage", () => {
  it("loads products and filters them by category", async () => {
    stubApi(() => Promise.resolve(jsonResponse({ products })));
    const user = userEvent.setup();

    render(<MilkTeaPage />);

    expect(screen.getByText("正在准备今日菜单...")).toBeInTheDocument();
    await screen.findByText("黑糖珍珠鲜奶");
    expect(screen.getByText("茉莉鲜果茶")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "果茶" }));

    expect(screen.getByText("茉莉鲜果茶")).toBeInTheDocument();
    expect(screen.queryByText("黑糖珍珠鲜奶")).not.toBeInTheDocument();
  });

  it("customizes a drink and submits the cart", async () => {
    const fetchMock = stubApi((path, options = {}) => {
      if (path === "/api/milk-tea/products") {
        return Promise.resolve(jsonResponse({ products }));
      }
      if (path === "/api/milk-tea/orders" && options.method === "POST") {
        return Promise.resolve(
          jsonResponse(
            {
              order: {
                lookup_code: "ABCD1234",
                customer_name: "Ada",
                status: "pending",
                total: 36,
                items: [],
              },
            },
            201,
          ),
        );
      }
      return Promise.resolve(jsonResponse({ error: "Not found." }, 404));
    });
    const user = userEvent.setup();
    render(<MilkTeaPage />);
    const productHeading = await screen.findByRole("heading", {
      name: "黑糖珍珠鲜奶",
    });
    const productCard = productHeading.closest("article");

    await user.click(within(productCard).getByRole("button", { name: "选规格" }));
    await user.selectOptions(screen.getByLabelText("杯型"), "large");
    await user.selectOptions(screen.getByLabelText("甜度"), "25%");
    await user.selectOptions(screen.getByLabelText("冰量"), "none");
    await user.click(screen.getByLabelText("珍珠"));
    await user.clear(screen.getByLabelText("数量"));
    await user.type(screen.getByLabelText("数量"), "2");
    await user.click(screen.getByRole("button", { name: "加入购物车" }));
    await user.type(screen.getByLabelText("取餐姓名"), "Ada");
    await user.click(screen.getByRole("button", { name: "确认下单" }));

    await screen.findByText("订单 ABCD1234");
    expect(screen.getAllByText("已接单")).toHaveLength(2);
    const orderCall = fetchMock.mock.calls.find(
      ([path, options]) => path === "/api/milk-tea/orders" && options.method === "POST",
    );
    const payload = JSON.parse(orderCall[1].body);
    expect(payload).toEqual({
      customer_name: "Ada",
      items: [
        {
          product_id: 1,
          quantity: 2,
          options: {
            size: "large",
            sweetness: "25%",
            ice: "none",
            toppings: ["Pearls"],
          },
        },
      ],
    });
  });

  it("looks up an existing order by code", async () => {
    stubApi((path) => {
      if (path === "/api/milk-tea/products") {
        return Promise.resolve(jsonResponse({ products }));
      }
      if (path === "/api/milk-tea/orders/READY123") {
        return Promise.resolve(
          jsonResponse({
            order: {
              lookup_code: "READY123",
              customer_name: "Ada",
              status: "ready",
              total: 18,
              items: [],
            },
          }),
        );
      }
      return Promise.resolve(jsonResponse({ error: "Not found." }, 404));
    });
    const user = userEvent.setup();
    render(<MilkTeaPage />);
    await screen.findByText("黑糖珍珠鲜奶");

    await user.type(screen.getByLabelText("订单编号"), "ready123");
    await user.click(screen.getByRole("button", { name: "查询订单" }));

    const statusRegion = await screen.findByRole("region", { name: "订单状态" });
    expect(within(statusRegion).getByText("订单 READY123")).toBeInTheDocument();
    expect(within(statusRegion).getAllByText("待取餐")).toHaveLength(2);
  });

  it("shows an inline error when products cannot load", async () => {
    stubApi(() => Promise.resolve(jsonResponse({ error: "Menu unavailable." }, 503)));

    render(<MilkTeaPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("暂时无法连接门店服务");
  });

  it("shows an empty state when no products are active", async () => {
    stubApi(() => Promise.resolve(jsonResponse({ products: [] })));

    render(<MilkTeaPage />);

    expect(await screen.findByText("今日饮品暂时售罄，请稍后再来。")).toBeInTheDocument();
  });

  it("在购物车中调整数量并删除饮品", async () => {
    stubApi(() => Promise.resolve(jsonResponse({ products })));
    const user = userEvent.setup();
    render(<MilkTeaPage />);
    const productHeading = await screen.findByRole("heading", { name: "黑糖珍珠鲜奶" });

    await user.click(within(productHeading.closest("article")).getByRole("button", { name: "选规格" }));
    await user.click(screen.getByRole("button", { name: "加入购物车" }));
    await user.click(screen.getByRole("button", { name: "增加 Brown Sugar Milk Tea 数量" }));
    expect(screen.getByText("2 杯")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "移除 Brown Sugar Milk Tea" }));
    expect(screen.getByText("购物车还是空的")).toBeInTheDocument();
  });
});
