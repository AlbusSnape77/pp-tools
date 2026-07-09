from flask import Flask

from routes import register_routes


def create_app(config=None):
    app = Flask(__name__)
    app.config.update(config or {})
    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5175, debug=True)
