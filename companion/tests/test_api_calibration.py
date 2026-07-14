import io


def test_screenshot_and_calibration_template_lifecycle(
    app, client, authorized_headers
):
    screenshot = client.get("/api/v1/screenshot.png", headers=authorized_headers)
    saved = client.post(
        "/api/v1/calibration/social_icon",
        data={"image": (io.BytesIO(screenshot.data), "social_icon.png")},
        content_type="multipart/form-data",
        headers=authorized_headers,
    )
    status = client.get("/api/v1/calibration", headers=authorized_headers)
    deleted = client.delete(
        "/api/v1/calibration/social_icon", headers=authorized_headers
    )

    assert screenshot.status_code == 200
    assert screenshot.mimetype == "image/png"
    assert saved.status_code == 200
    assert status.json["templates"]["social_icon"]["exists"] is True
    assert deleted.status_code == 204
    assert not (app.config["CALIBRATION_DIR"] / "social_icon.png").exists()


def test_unknown_calibration_template_is_rejected(client, authorized_headers):
    response = client.post(
        "/api/v1/calibration/not-valid",
        data={"image": (io.BytesIO(b"x"), "x.png")},
        content_type="multipart/form-data",
        headers=authorized_headers,
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "calibration_template_invalid"
