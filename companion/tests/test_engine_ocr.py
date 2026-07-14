import numpy as np


def test_recognize_box_supports_current_rapidocr_recognizer_api():
    from delta_companion.engine.ocr import recognize_box

    image = np.zeros((32, 120, 3), dtype=np.uint8)

    assert isinstance(recognize_box(image, (0, 0, 120, 32)), str)
