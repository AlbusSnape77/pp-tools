def test_empty_image_list_returns_hidden_recent_record():
    from delta_companion.engine.lookup import build_record

    assert build_record([]) == {
        "recent": {"hidden": True, "matches": []},
        "nickname": None,
    }
