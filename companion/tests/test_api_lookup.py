import io


def test_manual_lookup_stores_recognized_player(client, authorized_headers):
    response = client.post(
        "/api/v1/manual-lookup",
        data={"images": (io.BytesIO(b"image"), "result.png")},
        content_type="multipart/form-data",
        headers=authorized_headers,
    )

    assert response.status_code == 200
    assert response.json["recognized_nickname"] == "追风君子"
    assert response.json["player"]["data"]["home"]["uid"] == "123456"


def test_manual_lookup_rejects_missing_images(client, authorized_headers):
    response = client.post(
        "/api/v1/manual-lookup", headers=authorized_headers
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "images_required"


def test_automatic_lookup_job_contract(client, authorized_headers):
    submitted = client.post(
        "/api/v1/auto-lookup",
        json={"query": "123456"},
        headers=authorized_headers,
    )

    assert submitted.status_code == 202
    job_id = submitted.json["job_id"]
    status = client.get(
        f"/api/v1/jobs/{job_id}", headers=authorized_headers
    )
    usage = client.get("/api/v1/usage", headers=authorized_headers)

    assert status.status_code == 200
    assert status.json["id"] == job_id
    assert usage.status_code == 200


def test_automatic_lookup_rejects_empty_query(client, authorized_headers):
    response = client.post(
        "/api/v1/auto-lookup",
        json={"query": "  "},
        headers=authorized_headers,
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "query_required"
