from companion.tests.conftest import ORIGIN


def test_health_is_public_but_players_require_token(client):
    response = client.get("/api/v1/health", headers={"Origin": ORIGIN})

    assert response.status_code == 200
    assert response.json["version"] == "1.0.0"
    assert response.json["api_version"] == 1

    denied = client.get("/api/v1/players", headers={"Origin": ORIGIN})
    assert denied.status_code == 401
    assert denied.json == {"error": {"code": "token_invalid", "details": {}}}


def test_preflight_only_grants_allowed_origin(client):
    allowed = client.options(
        "/api/v1/players",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
            "Access-Control-Request-Private-Network": "true",
        },
    )

    assert allowed.status_code == 204
    assert allowed.headers["Access-Control-Allow-Origin"] == ORIGIN
    assert allowed.headers["Access-Control-Allow-Private-Network"] == "true"

    denied = client.options(
        "/api/v1/players", headers={"Origin": "https://evil.test"}
    )
    assert "Access-Control-Allow-Origin" not in denied.headers


def test_pairing_code_can_be_exchanged_once(app, client):
    manager = app.extensions["delta_pairing_manager"]
    code = manager.issue_code()

    response = client.post(
        "/api/v1/pair",
        json={"code": code},
        headers={"Origin": ORIGIN},
    )

    assert response.status_code == 200
    token = response.json["token"]
    assert app.extensions["delta_pairing_store"].verify(ORIGIN, token)
    repeated = client.post(
        "/api/v1/pair", json={"code": code}, headers={"Origin": ORIGIN}
    )
    assert repeated.status_code == 400
    assert repeated.json["error"]["code"] == "pairing_code_invalid"


def test_authorized_origin_can_revoke_its_pairing(app, client):
    store = app.extensions["delta_pairing_store"]
    token = store.create(ORIGIN)

    response = client.post(
        "/api/v1/pair/revoke",
        headers={"Origin": ORIGIN, "Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 204
    assert store.list_origins() == []
