from flask import Blueprint, current_app, jsonify, request

from services.milk_tea_store import MilkTeaStore


milk_tea_bp = Blueprint("milk_tea", __name__, url_prefix="/api/milk-tea")


def store():
    instance = MilkTeaStore(current_app.config["DB_PATH"])
    instance.initialize()
    return instance


@milk_tea_bp.get("/products")
def list_products():
    return jsonify({"products": store().list_products()})


@milk_tea_bp.get("/products/<int:product_id>")
def get_product(product_id):
    product = store().get_product(product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404
    return jsonify({"product": product})


@milk_tea_bp.post("/orders")
def create_order():
    body = request.get_json(silent=True)
    if body is None:
        body = {}
    if not isinstance(body, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400
    try:
        order = store().create_order(
            body.get("customer_name", ""),
            body.get("items", []),
        )
    except (KeyError, TypeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400
    return jsonify({"order": order}), 201


@milk_tea_bp.get("/orders/<lookup_code>")
def get_order(lookup_code):
    order = store().get_order_by_lookup(lookup_code)
    if not order:
        return jsonify({"error": "Order not found."}), 404
    return jsonify({"order": order})
