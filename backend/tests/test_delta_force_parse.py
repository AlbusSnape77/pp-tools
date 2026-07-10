from services.delta_core import parse


def test_overview_keeps_kd_value_at_horizontal_tolerance_edge():
    label = {"text": "战损比", "x": 984, "y": 1013, "x2": 1080, "y2": 1051}
    value = {"text": "7.21.21.9", "x": 988, "y": 1063, "x2": 1315, "y2": 1110}

    result = parse.parse_overview([label, value], 2388, 1668)

    assert result["kd_raw"] == "7.21.21.9"
    assert result["kd_box"] == [988, 1063, 1315, 1110]
