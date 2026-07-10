import os
from pathlib import Path
from secrets import token_urlsafe

from flask import Flask

from routes import register_routes


def create_app(config=None):
    app = Flask(__name__)
    root = Path(__file__).parent
    app.config.update(
        DB_PATH=Path(os.environ.get("DB_PATH", root / "data" / "app.db")),
        ADMIN_PASSWORD=os.environ.get("ADMIN_PASSWORD"),
        SECRET_KEY=os.environ.get("SECRET_KEY") or token_urlsafe(32),
        ADMIN_TOKEN_MAX_AGE=int(os.environ.get("ADMIN_TOKEN_MAX_AGE", "43200")),
    )
    app.config.update(config or {})
    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5175, debug=True)
