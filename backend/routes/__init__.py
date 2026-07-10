from .admin import admin_bp
from .health import health_bp
from .milk_tea import milk_tea_bp


def register_routes(app):
    app.register_blueprint(health_bp)
    app.register_blueprint(milk_tea_bp)
    app.register_blueprint(admin_bp)
