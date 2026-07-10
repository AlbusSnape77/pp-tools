from app import create_app


def make_client(tmp_path):
    app = create_app(
        {
            "TESTING": True,
            "DB_PATH": tmp_path / "shop.db",
            "ADMIN_PASSWORD": "secret",
            "SECRET_KEY": "test-secret",
        }
    )
    return app.test_client()


def auth_headers(client):
    token = client.post("/api/admin/login", json={"password": "secret"}).get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_can_create_edit_and_disable_product(tmp_path):
    client = make_client(tmp_path)
    headers = auth_headers(client)

    created = client.post(
        "/api/admin/milk-tea/products",
        json={
            "name": "Taro Milk",
            "category": "Milk Tea",
            "price": 19,
            "description": "Taro and fresh milk.",
        },
        headers=headers,
    )
    product_id = created.get_json()["product"]["id"]
    updated = client.put(
        f"/api/admin/milk-tea/products/{product_id}",
        json={
            "name": "Taro Cloud",
            "category": "Milk Tea",
            "price": 21,
            "description": "Taro, fresh milk, and foam.",
        },
        headers=headers,
    )
    disabled = client.patch(
        f"/api/admin/milk-tea/products/{product_id}/status",
        json={"active": False},
        headers=headers,
    )

    assert created.status_code == 201
    assert updated.get_json()["product"]["name"] == "Taro Cloud"
    assert disabled.get_json()["product"]["active"] is False
    admin_products = client.get("/api/admin/milk-tea/products", headers=headers).get_json()["products"]
    assert any(product["id"] == product_id for product in admin_products)
    public_products = client.get("/api/milk-tea/products").get_json()["products"]
    assert all(product["id"] != product_id for product in public_products)


def test_admin_summary_counts_orders_and_revenue(tmp_path):
    client = make_client(tmp_path)
    product = client.get("/api/milk-tea/products").get_json()["products"][0]
    client.post(
        "/api/milk-tea/orders",
        json={
            "customer_name": "Ada",
            "items": [{"product_id": product["id"], "quantity": 2, "options": {}}],
        },
    )

    response = client.get("/api/admin/milk-tea/summary", headers=auth_headers(client))

    assert response.status_code == 200
    assert response.get_json()["summary"] == {
        "order_count": 1,
        "revenue": product["price"] * 2,
    }


def test_admin_product_status_requires_boolean(tmp_path):
    client = make_client(tmp_path)
    headers = auth_headers(client)
    product = client.get("/api/admin/milk-tea/products", headers=headers).get_json()["products"][0]

    response = client.patch(
        f"/api/admin/milk-tea/products/{product['id']}/status",
        json={"active": "false"},
        headers=headers,
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": "Active must be true or false."}


def test_admin_missing_product_returns_not_found(tmp_path):
    client = make_client(tmp_path)
    headers = auth_headers(client)

    response = client.put(
        "/api/admin/milk-tea/products/9999",
        json={"name": "Missing", "category": "Tea", "price": 12, "description": "Missing."},
        headers=headers,
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "Product not found."}
