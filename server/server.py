import os
import uuid
import traceback

from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import util

# Load .env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

app = Flask(__name__, static_folder='static')
CORS(app)

# Read API key from environment
API_KEY = os.environ.get('API_KEY', str(uuid.uuid4()))


def require_api_key(f):
    """Decorator to require a valid API key for external API requests."""
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get('X-API-Key')
        # Browser frontend (same-origin) sends requests without X-API-Key header,
        # external API consumers must include it.
        origin = request.headers.get('Origin', '')
        referer = request.headers.get('Referer', '')
        is_browser_ui = (not origin and not key) or request.referrer is not None

        if not is_browser_ui:
            if not key or key != API_KEY:
                return jsonify({
                    'error': 'Invalid or missing API key. Include X-API-Key header.',
                    'success': False
                }), 401

        if key and key != API_KEY:
            return jsonify({
                'error': 'Invalid API key.',
                'success': False
            }), 401

        return f(*args, **kwargs)

    return decorated


# Serve the main HTML page
@app.route('/')
def index():
    return send_from_directory('static', 'app.html')


# Serve static files
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)


# API: Classify image (protected for external use)
@app.route('/api/classify_image', methods=['POST'])
@require_api_key
def classify_image():
    try:
        image_data = request.form.get('image_data')

        if not image_data:
            return jsonify({
                'error': 'No image data provided'
            }), 400

        result = util.classify_image(image_data)

        if result is None:
            return jsonify({
                'error': 'No face detected. Please upload a clear photo of a face with both eyes visible.',
                'success': False
            }), 200

        return jsonify({
            'result': result,
            'success': True
        })

    except Exception as e:
        print(f"Error classifying image: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'Classification failed. Please try again.',
            'success': False
        }), 500


# API: Get class dictionary
@app.route('/api/get_classes', methods=['GET'])
def get_classes():
    try:
        class_dict = util.get_class_dictionary()
        return jsonify({
            'classes': class_dict,
            'success': True
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500


# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Sports Celebrity Classifier API is running'
    })


if __name__ == '__main__':
    print("Starting Sports Celebrity Classifier Server...")
    util.load_saved_artifacts()
    print("Server is ready!")
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=debug)
