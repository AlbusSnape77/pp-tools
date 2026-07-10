from flask import Blueprint, jsonify, request

from services.delta_ocr import DeltaRecognizer

delta_force_bp = Blueprint("delta_force", __name__, url_prefix="/api/delta-force")


@delta_force_bp.post("/analyze")
def analyze():
    files = request.files.getlist("images")
    if not files:
        return jsonify({"error": "At least one screenshot is required."}), 400

    if any(not upload.mimetype.startswith("image/") for upload in files):
        return jsonify({"error": "Only image uploads are supported."}), 400

    try:
        result = DeltaRecognizer().analyze(files)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"result": result, "warnings": []})
