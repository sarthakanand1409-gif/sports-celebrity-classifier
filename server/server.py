from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import util
import os
import traceback

app = Flask(__name__, static_folder='static')
CORS(app)

# Serve the main HTML page
@app.route('/')
def index():
    return send_from_directory('static', 'app.html')

# Serve static files
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

# API: Classify image
@app.route('/api/classify_image', methods=['POST'])
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
            'error': f'Classification failed: {str(e)}',
            'success': False
        }), 500


# API: Get class dictionary (list of recognizable people)
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
    # Use 0.0.0.0 to allow external connections (important for AWS EC2)
    app.run(host='0.0.0.0', port=5000, debug=True)
