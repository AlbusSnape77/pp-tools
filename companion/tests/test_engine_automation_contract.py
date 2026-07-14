from inspect import signature

import pytest


def test_run_auto_lookup_keeps_original_public_contract():
    from delta_companion.engine.automate import run_auto_lookup

    assert tuple(signature(run_auto_lookup).parameters) == (
        "query",
        "calib_dir",
        "save_dir",
        "on_progress",
        "lead_seconds",
        "on_capture",
    )


def test_cancel_request_is_observed_and_can_be_cleared():
    from delta_companion.engine import automate

    automate.request_cancel()
    with pytest.raises(automate.LookupCancelled):
        automate._ck()

    automate.clear_cancel()
    automate._ck()


def test_search_button_targets_magnifier_instead_of_input_clear_area():
    from delta_companion.engine import automate

    width, height = 2560, 1440
    x = round(width * automate.SEARCH_BTN_FRAC[0])
    y = round(height * automate.SEARCH_BTN_FRAC[1])

    assert (x, y) == (2028, 446)


def test_deliberate_between_step_waits_use_the_fast_pace(monkeypatch):
    from delta_companion.engine import automate

    sleeps = []
    monkeypatch.setattr(automate.random, "gauss", lambda mean, _sigma: mean)
    monkeypatch.setattr(automate.time, "sleep", sleeps.append)

    automate._settle(1.0)

    assert sleeps[0] <= 0.2


def test_screenshot_stability_wait_has_a_short_default_ceiling():
    from delta_companion.engine import automate

    parameters = signature(automate._wait_stable).parameters

    assert parameters["max_wait"].default <= 0.5
    assert parameters["gap"].default <= 0.05


def test_mode_ready_wait_ignores_a_stable_transition_frame(monkeypatch):
    from delta_companion.engine import automate

    class Frame:
        def __init__(self, state):
            self.state = state
            self.shape = (100, 200, 3)

    frames = [Frame("transition"), Frame("ready")]
    monkeypatch.setattr(automate, "_ck", lambda: None)
    monkeypatch.setattr(automate, "_wait_stable", lambda **_kwargs: frames.pop(0))
    monkeypatch.setattr(automate, "_ocr_region", lambda frame, *_args, **_kwargs: [frame.state])
    monkeypatch.setattr(
        automate,
        "locate_text",
        lambda tokens, *_args, **_kwargs: None if tokens == ["transition"] else (120, 20, {"text": "排位赛数据"}),
    )
    monkeypatch.setattr(automate.time, "sleep", lambda _seconds: None)

    hit = automate._wait_mode_ready(["排位赛数据", "排位赛"], (0.4, 0.1, 0.7, 0.2), timeout=1)

    assert hit[2]["text"] == "排位赛数据"
    assert frames == []


def test_select_mode_waits_for_the_selected_header_before_returning(monkeypatch, tmp_path):
    from delta_companion.engine import automate

    class Frame:
        shape = (100, 200, 3)

    clicks = []
    ready_checks = []
    monkeypatch.setattr(automate, "_ck", lambda: None)
    monkeypatch.setattr(automate, "grab_screen", lambda: Frame())
    monkeypatch.setattr(automate, "_ocr_region", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(automate, "_settle", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(automate, "click_at", lambda x, y: clicks.append((x, y)))
    monkeypatch.setattr(
        automate,
        "locate_text",
        lambda _tokens, candidates, **_kwargs: (
            (100, 20, {"text": "数据总览"})
            if "数据总览" in candidates
            else (100, 35, {"text": "排位赛数据"})
        ),
    )
    monkeypatch.setattr(
        automate,
        "_wait_mode_ready",
        lambda aliases, region, timeout=3: ready_checks.append((aliases, region, timeout)),
        raising=False,
    )

    automate.select_mode("排位赛数据", tmp_path)

    assert clicks == [(100, 20), (100, 35)]
    assert len(ready_checks) == 1
    assert ready_checks[0][0] == ["排位赛数据", "排位赛"]
