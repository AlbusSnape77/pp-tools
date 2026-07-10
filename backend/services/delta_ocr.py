class DeltaRecognizer:
    def analyze(self, files):
        if not files:
            raise ValueError("At least one screenshot is required.")

        return {
            "nickname": "Sample Player",
            "rank": {"name": "Gold", "stars": 3},
            "overview": {
                "kd": ["1.20", "1.50", "1.80"],
                "escape_rate": "42%",
                "matches": "128",
                "play_hours": "76",
            },
            "ranked": {
                "kd": ["1.10", "1.40", "1.70"],
                "escape_rate": "39%",
            },
            "radar": {
                "combat": 72,
                "survival": 68,
                "support": 60,
                "search": 74,
                "wealth": 58,
            },
            "recent_matches": [],
        }
