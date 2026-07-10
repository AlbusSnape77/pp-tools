from flask import Blueprint, current_app, jsonify, request

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
    except Exception:
        current_app.logger.exception("Delta Force screenshot analysis failed")
        return jsonify({"error": "Screenshots could not be analyzed."}), 422

    has_result = bool(
        result.get("nickname")
        or result.get("overview")
        or result.get("ranked")
        or result.get("recent_matches")
    )
    warnings = [] if has_result else ["No supported result screens were recognized."]
    return jsonify({"result": result, "warnings": warnings})
