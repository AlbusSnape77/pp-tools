from app import create_app


def make_frontend(tmp_path):
    frontend_dist = tmp_path / "dist"
    assets = frontend_dist / "assets"
    assets.mkdir(parents=True)
    (frontend_dist / "index.html").write_text("<main>PP Tools production</main>", encoding="utf-8")
    (assets / "site.css").write_text("body { color: green; }", encoding="utf-8")
    return frontend_dist


def test_frontend_index_and_tool_routes_use_built_app(tmp_path):
    app = create_app({
        "TESTING": True,
        "DB_PATH": tmp_path / "app.db",
        "FRONTEND_DIST": make_frontend(tmp_path),
    })
    client = app.test_client()

    assert b"PP Tools production" in client.get("/").data
    assert b"PP Tools production" in client.get("/tools/milk-tea").data
    assert b"PP Tools production" in client.get("/admin/milk-tea").data


def test_frontend_assets_are_served_without_api_fallback(tmp_path):
    app = create_app({
        "TESTING": True,
        "DB_PATH": tmp_path / "app.db",
        "FRONTEND_DIST": make_frontend(tmp_path),
    })
    client = app.test_client()

    response = client.get("/assets/site.css")

    assert response.status_code == 200
    assert response.mimetype == "text/css"
    assert b"color: green" in response.data
