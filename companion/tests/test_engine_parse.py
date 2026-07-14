import json
from pathlib import Path

import cv2
import pytest

from delta_companion.engine import parse
from delta_companion.engine.classify import classify


SAMPLES = Path(__file__).parent / "fixtures" / "delta-samples"


@pytest.fixture(scope="module")
def sample_ocr():
    return json.loads((SAMPLES / "ocr_result.json").read_text(encoding="utf-8"))


def dimensions(name):
    image = cv2.imread(str(SAMPLES / name))
    height, width = image.shape[:2]
    return width, height


def test_real_samples_keep_original_classification(sample_ocr):
    roles = {classify(tokens): name for name, tokens in sample_ocr.items()}

    assert {"overview", "ranked", "recent", "home"}.issubset(roles)


def test_real_overview_sample_keeps_original_values(sample_ocr):
    roles = {classify(tokens): name for name, tokens in sample_ocr.items()}
    name = roles["overview"]
    width, height = dimensions(name)
    result = parse.parse_overview(sample_ocr[name], width, height)

    assert result["matches"] == 853
    assert result["play_hours"] == "175h"
    assert result["escape_rate"] == "35.3%"
    assert result["profit_ratio"] == "1.8M"
    assert result["rank_star"] == 44
    assert result["rank_score"] == 8168
    assert result["kills"] == "951"
    assert result["hit_rate"] == "23.2%"
    assert result["precise_kill_rate"] == "52.6%"
    assert result["carry_value"] == "987.7M"
    assert result["radar"] == {
        "战斗": 68,
        "财富": 100,
        "生存": 73,
        "搜索": 72,
        "合作": 62,
    }


def test_overview_finds_a_wide_merged_kd_value_below_its_label():
    tokens = [
        {"text": "战损比", "x": 981, "y": 914, "x2": 1048, "y2": 939, "score": 0.9},
        {"text": "2.1 1.9 1.6", "x": 986, "y": 952, "x2": 1328, "y2": 998, "score": 0.9},
    ]

    result = parse.parse_overview(tokens, 2560, 1440)

    assert result["kd_raw"] == "2.1 1.9 1.6"
    assert result["kd_box"] == [986, 952, 1328, 998]


def test_real_ranked_sample_keeps_original_values(sample_ocr):
    roles = {classify(tokens): name for name, tokens in sample_ocr.items()}
    name = roles["ranked"]
    width, height = dimensions(name)
    result = parse.parse_overview(sample_ocr[name], width, height)

    assert result["matches"] == 492
    assert result["play_hours"] == "114h"
    assert result["escape_rate"] == "30.7%"
    assert result["profit_ratio"] == "2.1M"
    assert result["radar"]["战斗"] == 73
    assert result["radar"]["财富"] == 100
    assert result["radar"]["搜索"] == 75


def test_real_recent_sample_keeps_original_values(sample_ocr):
    roles = {classify(tokens): name for name, tokens in sample_ocr.items()}
    name = roles["recent"]
    width, height = dimensions(name)
    result = parse.parse_recent(sample_ocr[name], width, height)

    assert result["hidden"] is False
    assert len(result["matches"]) == 7
    assert result["matches"][0]["result"] == "撤离失败"
    assert "22:14" in result["matches"][0]["map_time"]
    assert "-18" in result["matches"][0]["rank_change"]


def test_recent_includes_mid_exit_rows_and_cleans_noisy_currency():
    tokens = [
        {"text": "中途退出", "x": 210, "y": 300, "x2": 300, "y2": 330, "score": 0.9},
        {"text": "航天基地-绝密 昨天 23:51", "x": 210, "y": 334, "x2": 520, "y2": 364, "score": 0.9},
        {"text": "?284,661", "x": 790, "y": 300, "x2": 920, "y2": 330, "score": 0.8},
        {"text": "三角洲巅峰 11 6516(+54)", "x": 1800, "y": 300, "x2": 2200, "y2": 330, "score": 0.9},
        {"text": "撤离失败", "x": 210, "y": 450, "x2": 300, "y2": 480, "score": 0.9},
        {"text": "航天基地-绝密 昨天 23:07", "x": 210, "y": 484, "x2": 520, "y2": 514, "score": 0.9},
        {"text": "?542.180", "x": 790, "y": 450, "x2": 920, "y2": 480, "score": 0.8},
    ]

    result = parse.parse_recent(tokens, 2560, 1440)

    assert result["hidden"] is False
    assert result["matches"][0]["result"] == "中途退出"
    assert result["matches"][0]["map_time"] == "航天基地-绝密 昨天 23:51"
    assert result["matches"][0]["hafu"] == "284,661"
    assert result["matches"][1]["hafu"] == "542,180"


def rank_tokens(name_text, star_text):
    tokens = [
        {"text": name_text, "x": 510, "y": 700, "x2": 581, "y2": 729, "score": 0.6},
        {"text": "3239", "x": 554, "y": 746, "x2": 615, "y2": 771, "score": 0.8},
    ]
    if star_text:
        tokens.append(
            {"text": star_text, "x": 598, "y": 700, "x2": 659, "y2": 728, "score": 0.5}
        )
    return tokens


@pytest.mark.parametrize(
    ("name_text", "star_text", "expected_name", "expected_star"),
    [
        ("三角洲巅峰", "★22", "三角洲巅峰", 22),
        ("黑鹰Ⅴ", "★1", "黑鹰Ⅴ", 1),
        ("钻石Ⅲ", "★4", "钻石Ⅲ", 4),
        ("铂金Ⅱ", "★3", "铂金Ⅱ", 3),
        ("铂金", "★3", "铂金", 3),
        ("白金Ⅱ", "★3", "铂金Ⅱ", 3),
        ("黄金IV", "★5", "黄金IV", 5),
        ("白银Ⅰ", "☆2", "白银Ⅰ", 2),
        ("青铜Ⅴ", "★1", "青铜Ⅴ", 1),
        ("铂金Ⅱ★3", None, "铂金Ⅱ", 3),
    ],
)
def test_rank_tiers_keep_original_normalization(
    name_text, star_text, expected_name, expected_star
):
    result = parse.parse_overview(rank_tokens(name_text, star_text), 2560, 1440)

    assert result["rank_name"] == expected_name
    assert result["rank_star"] == expected_star
    assert result["rank_score"] == 3239


def test_real_home_sample_keeps_original_values(sample_ocr):
    roles = {classify(tokens): name for name, tokens in sample_ocr.items()}
    name = roles["home"]
    width, height = dimensions(name)
    result = parse.parse_home(sample_ocr[name], width, height)

    assert result["nickname"] == "PeRo追风君子"
    assert result["total_assets"] == "515.8M"
    assert result["total_matches"] == 853
    assert result["almanac"] == 81


def test_home_parser_ignores_character_name_above_player_card():
    tokens = [
        {"text": "OperatorName", "x": 1852, "y": 840, "x2": 1930, "y2": 870, "score": 0.9},
        {"text": "TargetPlayer", "x": 1908, "y": 1136, "x2": 2059, "y2": 1162, "score": 0.9},
        {"text": "S10TopRank", "x": 1975, "y": 1170, "x2": 2107, "y2": 1195, "score": 0.9},
    ]

    result = parse.parse_home(tokens, 2560, 1440)

    assert result["nickname"] == "TargetPlayer"
    assert result["title"] == "S10TopRank"
