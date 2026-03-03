from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import numpy as np
import os
import sqlite3
import json
import io
import zipfile
import uuid
import qrcode
from datetime import datetime
from werkzeug.utils import secure_filename

# ============================================
# IET K. K. WAGH EXPO - Photo Recognition System
# Backend Server
# ============================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
DATA_FOLDER = os.path.join(BASE_DIR, 'data')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}

app = Flask(__name__)
CORS(app)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATA_FOLDER, exist_ok=True)

# ============================================
# Database Setup
# ============================================

def get_db():
    db = sqlite3.connect(os.path.join(DATA_FOLDER, 'expo.db'))
    db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    db.executescript('''
        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            original_name TEXT,
            upload_time TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS face_encodings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_id INTEGER,
            encoding TEXT NOT NULL,
            FOREIGN KEY (photo_id) REFERENCES photos(id)
        );
        CREATE TABLE IF NOT EXISTS match_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            matches_count INTEGER,
            timestamp TEXT DEFAULT (datetime('now','localtime'))
        );
    ''')
    db.commit()
    db.close()

init_db()

# ============================================
# Face Recognition Helpers
# ============================================

def get_face_encodings(image_path):
    """Extract detailed face encodings using OpenCV"""
    try:
        import cv2
        
        # Load the image
        image = cv2.imread(image_path)
        if image is None:
            return []
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Load cascade classifier for face detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(80, 80))
        
        if len(faces) == 0:
            return []
        
        # Sort by face size and keep the largest
        faces = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[:1]
        
        # Create detailed encodings
        encodings = []
        for (x, y, w, h) in faces:
            face_region = image[y:y+h, x:x+w]
            face_gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
            
            # Calculate multiple feature histograms
            # 1. Grayscale histogram (32 bins)
            hist_gray = cv2.calcHist([face_gray], [0], None, [32], [0, 256])
            hist_gray = hist_gray.flatten() / (hist_gray.sum() + 1e-6)
            
            # 2. Edge detection (Canny)
            edges = cv2.Canny(face_gray, 50, 150)
            hist_edges = cv2.calcHist([edges], [0], None, [32], [0, 256])
            hist_edges = hist_edges.flatten() / (hist_edges.sum() + 1e-6)
            
            # 3. HSV color histograms
            hsv = cv2.cvtColor(face_region, cv2.COLOR_BGR2HSV)
            hist_h = cv2.calcHist([hsv], [0], None, [32], [0, 180])
            hist_s = cv2.calcHist([hsv], [1], None, [32], [0, 256])
            hist_v = cv2.calcHist([hsv], [2], None, [32], [0, 256])
            
            hist_h = hist_h.flatten() / (hist_h.sum() + 1e-6)
            hist_s = hist_s.flatten() / (hist_s.sum() + 1e-6)
            hist_v = hist_v.flatten() / (hist_v.sum() + 1e-6)
            
            # 4. Texture features (LBP-like)
            # Calculate local pixel differences
            kernel = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32)
            sobelx = cv2.filter2D(face_gray, cv2.CV_32F, kernel)
            hist_texture = cv2.calcHist([np.uint8(np.abs(sobelx))], [0], None, [16], [0, 256])
            hist_texture = hist_texture.flatten() / (hist_texture.sum() + 1e-6)
            
            # 5. Mean and std of different regions (9 regions)
            region_features = []
            h3, w3 = h // 3, w // 3
            for i in range(3):
                for j in range(3):
                    region = face_gray[i*h3:(i+1)*h3, j*w3:(j+1)*w3]
                    region_features.append(np.mean(region) / 255.0)
                    region_features.append(np.std(region) / 255.0)
            
            # Combine all features
            encoding = np.concatenate([
                hist_gray[:16],      # 16 gray features
                hist_edges[:16],     # 16 edge features
                hist_h[:16],         # 16 hue features
                hist_s[:16],         # 16 saturation features
                hist_v[:16],         # 16 value features
                hist_texture[:8],    # 8 texture features
                region_features      # 18 region features
            ]).astype(float)
            
            encodings.append(encoding.tolist())
        
        return encodings
    except Exception as e:
        print(f"[WARN] Error processing {image_path}: {e}")
        return []

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors"""
    a = np.array(a, dtype=np.float64)
    b = np.array(b, dtype=np.float64)
    
    # Ensure same length
    min_len = min(len(a), len(b))
    a = a[:min_len]
    b = b[:min_len]
    
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    # Cosine similarity in range [-1, 1]
    similarity = dot / (norm_a * norm_b)
    # Convert to [0, 1] range
    return max(0.0, min(1.0, (similarity + 1) / 2))

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ============================================
# Frontend Routes (Serve HTML pages)
# ============================================

@app.route('/')
def serve_index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/find.html')
def serve_find():
    return send_from_directory(FRONTEND_DIR, 'find.html')

@app.route('/admin.html')
def serve_admin():
    return send_from_directory(FRONTEND_DIR, 'admin.html')

@app.route('/style.css')
def serve_css():
    return send_from_directory(FRONTEND_DIR, 'style.css')

@app.route('/script.js')
def serve_js():
    return send_from_directory(FRONTEND_DIR, 'script.js')

# ============================================
# API Routes
# ============================================

@app.route('/api/health')
def health():
    return jsonify({
        "status": "running",
        "message": "IET Expo Backend Running"
    })

@app.route('/api/upload-event', methods=['POST'])
def upload_event_photos():
    """Upload event photos, detect faces, and store encodings"""
    if 'photos' not in request.files:
        return jsonify({"error": "No photos uploaded"}), 400

    files = request.files.getlist('photos')
    processed = 0
    faces_found = 0
    errors = []

    db = get_db()

    for file in files:
        if file and allowed_file(file.filename):
            try:
                filename = secure_filename(f"{uuid.uuid4().hex[:8]}_{file.filename}")
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)

                # Save photo record
                cursor = db.execute(
                    "INSERT INTO photos (filename, original_name) VALUES (?, ?)",
                    (filename, file.filename)
                )
                photo_id = cursor.lastrowid

                # Detect faces and extract encodings
                encodings = get_face_encodings(filepath)
                faces_found += len(encodings)

                for encoding in encodings:
                    db.execute(
                        "INSERT INTO face_encodings (photo_id, encoding) VALUES (?, ?)",
                        (photo_id, json.dumps(encoding))
                    )

                processed += 1
            except Exception as e:
                errors.append(f"{file.filename}: {str(e)}")
        else:
            if file:
                errors.append(f"{file.filename}: Invalid file type")

    db.commit()
    db.close()

    return jsonify({
        "status": "success",
        "photos_processed": processed,
        "faces_detected": faces_found,
        "errors": errors
    })

@app.route('/api/find-matches', methods=['POST'])
def find_matches():
    """Upload selfie, find matching photos from event gallery"""
    if 'selfie' not in request.files:
        return jsonify({"error": "No selfie uploaded"}), 400

    file = request.files['selfie']
    if not file or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    filename = secure_filename(f"selfie_{uuid.uuid4().hex[:8]}_{file.filename}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        # Get selfie encoding
        selfie_encodings = get_face_encodings(filepath)

        if not selfie_encodings:
            os.remove(filepath)
            return jsonify({"error": "No face detected in the selfie. Please try with a clearer photo."}), 400

        selfie_encoding = selfie_encodings[0]  # Use first/primary face

        # Compare with all stored encodings
        db = get_db()
        all_encodings = db.execute('''
            SELECT fe.encoding, p.filename
            FROM face_encodings fe
            JOIN photos p ON fe.photo_id = p.id
        ''').fetchall()

        matched_photos = []
        seen_filenames = set()
        threshold = 0.80  # High threshold for detailed feature matching

        for row in all_encodings:
            stored_encoding = json.loads(row['encoding'])
            similarity = cosine_similarity(selfie_encoding, stored_encoding)
            # Only match very similar faces
            if similarity > threshold and row['filename'] not in seen_filenames:
                matched_photos.append({
                    "filename": row['filename'],
                    "similarity": round(float(similarity), 3)
                })
                seen_filenames.add(row['filename'])

        # Sort by similarity (best matches first)
        matched_photos.sort(key=lambda x: x['similarity'], reverse=True)

        # Log the match
        session_id = uuid.uuid4().hex
        db.execute(
            "INSERT INTO match_logs (session_id, matches_count) VALUES (?, ?)",
            (session_id, len(matched_photos))
        )
        db.commit()
        db.close()

    finally:
        # Clean up selfie
        if os.path.exists(filepath):
            os.remove(filepath)

    return jsonify({
        "status": "success",
        "matches": matched_photos,
        "count": len(matched_photos),
        "session_id": session_id
    })

@app.route('/api/stats')
def get_stats():
    """Get admin dashboard statistics"""
    db = get_db()
    photos = db.execute("SELECT COUNT(*) as count FROM photos").fetchone()['count']
    faces = db.execute("SELECT COUNT(*) as count FROM face_encodings").fetchone()['count']
    searches = db.execute("SELECT COUNT(*) as count FROM match_logs").fetchone()['count']
    total_matched = db.execute(
        "SELECT COALESCE(SUM(matches_count), 0) as total FROM match_logs"
    ).fetchone()['total']

    recent = db.execute(
        "SELECT filename, original_name, upload_time FROM photos ORDER BY upload_time DESC LIMIT 20"
    ).fetchall()

    db.close()

    return jsonify({
        "total_photos": photos,
        "total_faces": faces,
        "total_searches": searches,
        "total_matched": total_matched,
        "recent_uploads": [dict(r) for r in recent]
    })

# simple admin password (change or set via ENV for production)
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

@app.route('/api/delete-all', methods=['POST'])
def delete_all():
    """Delete all photos and data (admin action)"""
    data = request.get_json() or {}
    pwd = data.get('password', '')
    if pwd != ADMIN_PASSWORD:
        return jsonify({"error": "Unauthorized"}), 401

    db = get_db()
    db.execute("DELETE FROM face_encodings")
    db.execute("DELETE FROM match_logs")
    db.execute("DELETE FROM photos")
    db.commit()
    db.close()

    # Delete uploaded files
    for f in os.listdir(UPLOAD_FOLDER):
        filepath = os.path.join(UPLOAD_FOLDER, f)
        if os.path.isfile(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass

    return jsonify({"status": "success", "message": "All data deleted"})

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve uploaded photo files"""
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/download/<filename>')
def download_photo(filename):
    """Download a single photo"""
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)

@app.route('/api/download-zip', methods=['POST'])
def download_zip():
    """Download multiple matched photos as ZIP"""
    data = request.json
    filenames = data.get('filenames', [])

    if not filenames:
        return jsonify({"error": "No files specified"}), 400

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for filename in filenames:
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(filepath):
                zf.write(filepath, filename)

    memory_file.seek(0)
    return send_file(
        memory_file,
        mimetype='application/zip',
        as_attachment=True,
        download_name='IET_Expo_My_Photos.zip'
    )

@app.route('/api/generate-qr', methods=['POST'])
def generate_qr():
    """Generate QR code for sharing results"""
    data = request.json
    url = data.get('url', '')

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0a0a1a", back_color="#ffffff")

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)

    return send_file(buffer, mimetype='image/png')

# ============================================
# Run Server
# ============================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
