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

    expect(screen.getByText("Loading menu...")).toBeInTheDocument();
    await screen.findByText("Brown Sugar Milk Tea");
    expect(screen.getByText("Jasmine Fruit Tea")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fruit Tea" }));

    expect(screen.getByText("Jasmine Fruit Tea")).toBeInTheDocument();
    expect(screen.queryByText("Brown Sugar Milk Tea")).not.toBeInTheDocument();
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
      name: "Brown Sugar Milk Tea",
    });
    const productCard = productHeading.closest("article");

    await user.click(within(productCard).getByRole("button", { name: "Customize" }));
    await user.selectOptions(screen.getByLabelText("Cup size"), "large");
    await user.selectOptions(screen.getByLabelText("Sweetness"), "25%");
    await user.selectOptions(screen.getByLabelText("Ice level"), "none");
    await user.click(screen.getByLabelText("Pearls"));
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "2");
    await user.click(screen.getByRole("button", { name: "Add to cart" }));
    await user.type(screen.getByLabelText("Customer name"), "Ada");
    await user.click(screen.getByRole("button", { name: "Place order" }));

    await screen.findByText("Order ABCD1234");
    expect(screen.getByText("Pending")).toBeInTheDocument();
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
    await screen.findByText("Brown Sugar Milk Tea");

    await user.type(screen.getByLabelText("Order code"), "ready123");
    await user.click(screen.getByRole("button", { name: "Find order" }));

    const statusRegion = await screen.findByRole("region", { name: "Order status" });
    expect(within(statusRegion).getByText("Order READY123")).toBeInTheDocument();
    expect(within(statusRegion).getByText("Ready")).toBeInTheDocument();
  });

  it("shows an inline error when products cannot load", async () => {
    stubApi(() => Promise.resolve(jsonResponse({ error: "Menu unavailable." }, 503)));

    render(<MilkTeaPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Menu unavailable.");
  });

  it("shows an empty state when no products are active", async () => {
    stubApi(() => Promise.resolve(jsonResponse({ products: [] })));

    render(<MilkTeaPage />);

    expect(await screen.findByText("No drinks are available right now.")).toBeInTheDocument();
  });
});
