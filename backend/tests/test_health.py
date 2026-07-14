from app import create_app


def test_health_check_returns_runtime_details(tmp_path):
    frontend_dist = tmp_path / "dist"
    frontend_dist.mkdir()
    (frontend_dist / "index.html").write_text("ready", encoding="utf-8")
    app = create_app({
        "TESTING": True,
        "DB_PATH": tmp_path / "data" / "app.db",
        "FRONTEND_DIST": frontend_dist,
    })
    client = app.test_client()

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {
        "status": "ok",
        "checks": {
            "database_directory": "ready",
            "frontend_build": "ready",
        },
    }
