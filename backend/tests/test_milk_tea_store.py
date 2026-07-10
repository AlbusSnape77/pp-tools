import pytest

from services.milk_tea_store import MilkTeaStore


def order_item(product, **overrides):
    item = {
        "product_id": product["id"],
        "name": product["name"],
        "quantity": 1,
        "options": {"sweetness": "50%", "ice": "less"},
        "unit_price": product["price"],
    }
    item.update(overrides)
    return item


def test_seed_products_are_returned_and_initialization_is_idempotent(tmp_path):
    store = MilkTeaStore(tmp_path / "shop.db")
    store.initialize()
    first_products = store.list_products()

    store.initialize()
    second_products = store.list_products()

    assert len(first_products) >= 3
    assert second_products == first_products
    assert all(product["active"] for product in second_products)


def test_product_can_be_found_by_id(tmp_path):
    store = MilkTeaStore(tmp_path / "shop.db")
    store.initialize()
    product = store.list_products()[0]

    assert store.get_product(product["id"]) == product


def test_missing_product_returns_none(tmp_path):
    store = MilkTeaStore(tmp_path / "shop.db")
    store.initialize()

    assert store.get_product(9999) is None


def test_create_order_returns_lookup_code_and_saved_items(tmp_path):
    store = MilkTeaStore(tmp_path / "shop.db")
    store.initialize()
    product = store.list_products()[0]

    order = store.create_order(
        customer_name="  Test User  ",
        items=[order_item(product, quantity=2)],
    )

    assert order["lookup_code"]
    assert order["customer_name"] == "Test User"
    assert order["status"] == "pending"
    assert order["total"] == product["price"] * 2
    assert order["items"][0]["options"] == {"sweetness": "50%", "ice": "less"}
    assert store.get_order_by_lookup(order["lookup_code"]) == order


def test_order_uses_catalog_name_and_price(tmp_path):
    store = MilkTeaStore(tmp_path / "shop.db")
    store.initialize()
    product = store.list_products()[0]

    order = store.create_order(
        customer_name="Test User",
        items=[order_item(product, name="Changed Name", unit_price=1)],
    )

    assert order["total"] == product["price"]
    assert order["items"][0]["name"] == product["name"]
    assert order["items"][0]["unit_price"] == product["price"]


@pytest.mark.parametrize(
    ("customer_name", "items", "message"),
    [
        ("", [{"product_id": 1, "quantity": 1, "options": {}}], "Customer name is required."),
        ("Test User", [], "At least one item is required."),
        ("Test User", [{"product_id": 1, "quantity": 0, "options": {}}], "Quantity must be at least 1."),
        ("Test User", [{"product_id": 9999, "quantity": 1, "options": {}}], "Product not found."),
    ],
)
def test_create_order_rejects_invalid_input(tmp_path, customer_name, items, message):
    store = MilkTeaStore(tmp_path / "shop.db")
    store.initialize()

    with pytest.raises(ValueError, match=message):
        store.create_order(customer_name=customer_name, items=items)


def test_orders_can_be_listed_and_status_updated(tmp_path):
    store = MilkTeaStore(tmp_path / "shop.db")
    store.initialize()
    product = store.list_products()[0]
    first = store.create_order("First", [order_item(product)])
    second = store.create_order("Second", [order_item(product)])

    updated = store.update_order_status(first["id"], "ready")

    assert updated["status"] == "ready"
    assert [order["id"] for order in store.list_orders()] == [second["id"], first["id"]]
    assert store.update_order_status(9999, "ready") is None


def test_unsupported_order_status_is_rejected(tmp_path):
    store = MilkTeaStore(tmp_path / "shop.db")
    store.initialize()

    with pytest.raises(ValueError, match="Unsupported order status."):
        store.update_order_status(1, "unknown")
