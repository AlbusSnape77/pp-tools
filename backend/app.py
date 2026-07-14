import os
from pathlib import Path
from secrets import token_urlsafe

from flask import Flask, abort, jsonify, send_from_directory

from routes import register_routes


def create_app(config=None):
    app = Flask(__name__, static_folder=None)
    root = Path(__file__).parent
    app.config.update(
        DB_PATH=Path(os.environ.get("DB_PATH", root / "data" / "app.db")),
        FRONTEND_DIST=Path(os.environ.get("FRONTEND_DIST", root.parent / "frontend" / "dist")),
        ADMIN_PASSWORD=os.environ.get("ADMIN_PASSWORD"),
        SECRET_KEY=os.environ.get("SECRET_KEY") or token_urlsafe(32),
        ADMIN_TOKEN_MAX_AGE=int(os.environ.get("ADMIN_TOKEN_MAX_AGE", "43200")),
    )
    app.config.update(config or {})
    register_routes(app)

    @app.get("/", defaults={"asset_path": ""})
    @app.get("/<path:asset_path>")
    def serve_frontend(asset_path):
        if asset_path.startswith("api/"):
            abort(404)

        frontend_dist = Path(app.config["FRONTEND_DIST"])
        if asset_path:
            asset = frontend_dist / asset_path
            if asset.is_file():
                return send_from_directory(frontend_dist, asset_path)

        index_path = frontend_dist / "index.html"
        if index_path.is_file():
            return send_from_directory(frontend_dist, "index.html")

        return jsonify({"error": "Frontend build is missing."}), 503

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5175, debug=True)
