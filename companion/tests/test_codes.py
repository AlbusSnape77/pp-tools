from delta_companion.codes import ERROR_CODES, JOB_STEPS


def test_codes_are_stable_and_unique():
    assert JOB_STEPS == (
        "prepare_game",
        "open_social",
        "type_query",
        "search",
        "open_result",
        "capture_home",
        "capture_overview",
        "capture_ranked",
        "capture_recent",
        "ocr",
        "store",
    )
    assert len(ERROR_CODES) == len(set(ERROR_CODES))
    assert "game_not_running" in ERROR_CODES
    assert "calibration_required" in ERROR_CODES
