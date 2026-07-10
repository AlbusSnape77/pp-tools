from app import create_app


def make_client(tmp_path, **overrides):
    config = {
        "TESTING": True,
        "DB_PATH": tmp_path / "shop.db",
        "ADMIN_PASSWORD": "secret",
        "SECRET_KEY": "test-secret",
        "ADMIN_TOKEN_MAX_AGE": 43200,
    }
    config.update(overrides)
    return create_app(config).test_client()


def first_product(client):
    response = client.get("/api/milk-tea/products")
    assert response.status_code == 200
    return response.get_json()["products"][0]


def create_order(client, **item_overrides):
    product = first_product(client)
    item = {
        "product_id": product["id"],
        "name": product["name"],
        "quantity": 1,
        "unit_price": product["price"],
        "options": {"sweetness": "50%", "ice": "less"},
    }
    item.update(item_overrides)
    response = client.post(
        "/api/milk-tea/orders",
        json={"customer_name": "Ada", "items": [item]},
    )
    assert response.status_code == 201
    return product, response.get_json()["order"]


def admin_token(client):
    response = client.post("/api/admin/login", json={"password": "secret"})
    assert response.status_code == 200
    return response.get_json()["token"]


def test_public_products_are_returned(tmp_path):
    client = make_client(tmp_path)

    response = client.get("/api/milk-tea/products")

    assert response.status_code == 200
    assert len(response.get_json()["products"]) >= 3


def test_public_product_detail_is_returned(tmp_path):
    client = make_client(tmp_path)
    product = first_product(client)

    response = client.get(f"/api/milk-tea/products/{product['id']}")

    assert response.status_code == 200
    assert response.get_json()["product"] == product


def test_missing_product_returns_not_found(tmp_path):
    client = make_client(tmp_path)

    response = client.get("/api/milk-tea/products/9999")

    assert response.status_code == 404
    assert response.get_json() == {"error": "Product not found."}


def test_public_order_can_be_created_and_looked_up(tmp_path):
    client = make_client(tmp_path)
    _, order = create_order(client)

    response = client.get(f"/api/milk-tea/orders/{order['lookup_code']}")

    assert response.status_code == 200
    assert response.get_json()["order"] == order


def test_order_uses_server_catalog_price(tmp_path):
    client = make_client(tmp_path)

    product, order = create_order(client, name="Changed Name", unit_price=1)

    assert order["total"] == product["price"]
    assert order["items"][0]["name"] == product["name"]
    assert order["items"][0]["unit_price"] == product["price"]


def test_invalid_order_returns_json_error(tmp_path):
    client = make_client(tmp_path)

    response = client.post("/api/milk-tea/orders", json={"customer_name": "", "items": []})

    assert response.status_code == 400
    assert response.get_json() == {"error": "Customer name is required."}


def test_order_rejects_non_object_json(tmp_path):
    client = make_client(tmp_path)

    response = client.post("/api/milk-tea/orders", json=[{}])

    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body must be a JSON object."}


def test_missing_order_returns_not_found(tmp_path):
    client = make_client(tmp_path)

    response = client.get("/api/milk-tea/orders/NOTFOUND")

    assert response.status_code == 404
    assert response.get_json() == {"error": "Order not found."}


def test_admin_requires_login(tmp_path):
    client = make_client(tmp_path)

    response = client.get("/api/admin/milk-tea/orders")

    assert response.status_code == 401
    assert response.get_json() == {"error": "Admin login is required."}


def test_admin_rejects_invalid_token(tmp_path):
    client = make_client(tmp_path)

    response = client.get(
        "/api/admin/milk-tea/orders",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401


def test_admin_rejects_expired_token(tmp_path):
    client = make_client(tmp_path, ADMIN_TOKEN_MAX_AGE=-1)
    token = admin_token(client)

    response = client.get(
        "/api/admin/milk-tea/orders",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_admin_login_rejects_wrong_password(tmp_path):
    client = make_client(tmp_path)

    response = client.post("/api/admin/login", json={"password": "wrong"})

    assert response.status_code == 401
    assert response.get_json() == {"error": "Invalid password."}


def test_admin_login_rejects_non_object_json(tmp_path):
    client = make_client(tmp_path)

    response = client.post("/api/admin/login", json=[{}])

    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body must be a JSON object."}


def test_admin_login_requires_configuration(tmp_path):
    client = make_client(tmp_path, ADMIN_PASSWORD=None)

    response = client.post("/api/admin/login", json={"password": "secret"})

    assert response.status_code == 503
    assert response.get_json() == {"error": "Admin login is not configured."}


def test_admin_can_list_orders_after_login(tmp_path):
    client = make_client(tmp_path)
    _, order = create_order(client)
    token = admin_token(client)

    response = client.get(
        "/api/admin/milk-tea/orders",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.get_json()["orders"] == [order]


def test_admin_can_update_order_status_after_login(tmp_path):
    client = make_client(tmp_path)
    _, order = create_order(client)
    token = admin_token(client)

    response = client.patch(
        f"/api/admin/milk-tea/orders/{order['id']}/status",
        json={"status": "ready"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.get_json()["order"]["status"] == "ready"


def test_admin_rejects_unsupported_order_status(tmp_path):
    client = make_client(tmp_path)
    _, order = create_order(client)
    token = admin_token(client)

    response = client.patch(
        f"/api/admin/milk-tea/orders/{order['id']}/status",
        json={"status": "unknown"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": "Unsupported order status."}


def test_admin_status_rejects_non_object_json(tmp_path):
    client = make_client(tmp_path)
    _, order = create_order(client)
    token = admin_token(client)

    response = client.patch(
        f"/api/admin/milk-tea/orders/{order['id']}/status",
        json=[{}],
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": "Request body must be a JSON object."}


def test_admin_missing_order_returns_not_found(tmp_path):
    client = make_client(tmp_path)
    token = admin_token(client)

    response = client.patch(
        "/api/admin/milk-tea/orders/9999/status",
        json={"status": "ready"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "Order not found."}
