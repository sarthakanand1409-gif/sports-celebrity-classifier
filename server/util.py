import json
import joblib
import numpy as np
import cv2
import base64
import os

# Global variables
__class_name_to_number = {}
__class_number_to_name = {}
__model = None

# Paths to haar cascade files (relative to ICP directory)
_haar_face_cascade = None
_haar_eye_cascade = None


def classify_image(image_base64_data, file_path=None):
    """
    Classify a sports person image.
    Returns a list of dictionaries with class name and probability,
    or None if no face with 2 eyes is detected.
    """
    imgs = get_cropped_image_if_2_eyes(file_path, image_base64_data)

    if imgs is None or len(imgs) == 0:
        return None

    result = []
    for img in imgs:
        scaled_raw_img = cv2.resize(img, (32, 32))
        img_har = w2d(img, 'db1', 5)
        scaled_img_har = cv2.resize(img_har, (32, 32))

        combined_img = np.vstack((
            scaled_raw_img.reshape(32 * 32 * 3, 1),
            scaled_img_har.reshape(32 * 32, 1)
        ))

        len_image_array = 32 * 32 * 3 + 32 * 32

        final = combined_img.reshape(1, len_image_array).astype(float)

        class_probabilities = __model.predict_proba(final)[0]
        class_prediction = __model.predict(final)[0]

        result.append({
            'class': class_number_to_name(class_prediction),
            'class_probability': [
                {
                    'class': class_number_to_name(i),
                    'probability': round(float(prob) * 100, 2)
                }
                for i, prob in enumerate(class_probabilities)
            ],
            'class_dictionary': __class_name_to_number
        })

    return result


def class_number_to_name(class_num):
    """Convert class number to human-readable name."""
    return __class_number_to_name.get(class_num, "Unknown")


def load_saved_artifacts():
    """Load the saved model and class dictionary."""
    global __class_name_to_number, __class_number_to_name, __model
    global _haar_face_cascade, _haar_eye_cascade

    print("Loading saved artifacts...start")

    # Determine base directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    artifacts_dir = os.path.join(base_dir, "artifacts")
    icp_dir = os.path.join(os.path.dirname(base_dir), "ICP")

    # Load class dictionary
    class_dict_path = os.path.join(artifacts_dir, "class_dictionary.json")
    with open(class_dict_path, "r") as f:
        __class_name_to_number = json.load(f)
        __class_number_to_name = {v: k for k, v in __class_name_to_number.items()}

    # Load model
    model_path = os.path.join(artifacts_dir, "saved_model.pkl")
    __model = joblib.load(model_path)

    # Load haar cascades
    face_cascade_path = os.path.join(icp_dir, "haarcascade_frontalface_default.xml")
    eye_cascade_path = os.path.join(icp_dir, "haarcascade_eye.xml")

    if os.path.exists(face_cascade_path) and os.path.exists(eye_cascade_path):
        _haar_face_cascade = cv2.CascadeClassifier(face_cascade_path)
        _haar_eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
    else:
        # Fallback to OpenCV's built-in cascades
        _haar_face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        _haar_eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )

    print("Loading saved artifacts...done")


def get_cv2_image_from_base64_string(b64str):
    """Convert base64 string to cv2 image."""
    # Handle data URL format
    if ',' in b64str:
        b64str = b64str.split(',')[1]

    encoded_data = base64.b64decode(b64str)
    nparr = np.frombuffer(encoded_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def get_cropped_image_if_2_eyes(image_path, image_base64_data):
    """
    Detect face and eyes. Return cropped face images
    only if 2 eyes are detected.
    """
    if image_path is not None:
        img = cv2.imread(image_path)
    else:
        img = get_cv2_image_from_base64_string(image_base64_data)

    if img is None:
        return None

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = _haar_face_cascade.detectMultiScale(gray, 1.3, 5)

    cropped_faces = []
    for (x, y, w, h) in faces:
        roi_gray = gray[y:y + h, x:x + w]
        roi_color = img[y:y + h, x:x + w]
        eyes = _haar_eye_cascade.detectMultiScale(roi_gray)
        if len(eyes) >= 2:
            cropped_faces.append(roi_color)

    return cropped_faces


def w2d(img, mode='db1', level=5):
    """Wavelet transform for feature extraction."""
    import pywt

    imArray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    # Convert to float
    imArray = np.float32(imArray)
    imArray /= 255.0

    # Compute coefficients
    coeffs = pywt.wavedec2(imArray, mode, level=level)

    # Process coefficients
    coeffs_H = list(coeffs)
    coeffs_H[0] *= 0

    # Reconstruct
    imArray_H = pywt.waverec2(coeffs_H, mode)
    imArray_H *= 255
    imArray_H = np.uint8(imArray_H)

    return imArray_H


def get_class_dictionary():
    """Return the class dictionary."""
    return __class_name_to_number


if __name__ == '__main__':
    load_saved_artifacts()
    print("Class dictionary:", __class_name_to_number)
    print("Model loaded successfully!")
