from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import cv2
import numpy as np
import os
import sqlite3
import json
import io
import zipfile
import uuid
import qrcode
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
DATA_FOLDER   = os.path.join(BASE_DIR, 'data')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}

app = Flask(__name__)
CORS(app)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATA_FOLDER,   exist_ok=True)

# ── Database ──────────────────────────────────────────────────────────────────
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

# ── Face Detection & Encoding (OpenCV, no external deps) ─────────────────────
# Load multiple cascades for better detection coverage
_face_cascades = []
for cascade_name in [
    'haarcascade_frontalface_default.xml',
    'haarcascade_frontalface_alt2.xml',
    'haarcascade_profileface.xml',
]:
    path = cv2.data.haarcascades + cascade_name
    c = cv2.CascadeClassifier(path)
    if not c.empty():
        _face_cascades.append(c)

def detect_faces(gray_img):
    """Detect all faces using multiple cascades, deduplicate overlaps."""
    rects = []
    for cascade in _face_cascades:
        found = cascade.detectMultiScale(
            gray_img, scaleFactor=1.05, minNeighbors=4, minSize=(60, 60)
        )
        if len(found):
            rects.extend(found.tolist())
    if not rects:
        return []
    # NMS-style dedup: remove heavily overlapping boxes
    unique = []
    for r in rects:
        x, y, w, h = r
        dup = False
        for u in unique:
            ix = max(x, u[0]); iy = max(y, u[1])
            iw = min(x+w, u[0]+u[2]) - ix
            ih = min(y+h, u[1]+u[3]) - iy
            if iw > 0 and ih > 0:
                overlap = (iw * ih) / float(w*h)
                if overlap > 0.5:
                    dup = True; break
        if not dup:
            unique.append(r)
    return unique

def extract_encoding(image, x, y, w, h):
    """
    Extract a rich 256-d face descriptor combining:
      - LBP histogram (face texture)
      - Gradient orientation histogram (shape/edges)
      - Colour histogram in HSV (skin tone)
    All normalised → cosine-comparable.
    """
    face = image[y:y+h, x:x+w]
    face = cv2.resize(face, (128, 128))
    gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)

    # ── 1. LBP-like texture (64 dims) ──────────────────────────────
    radius   = 1
    lbp_hist = np.zeros(256)
    h8, w8   = gray.shape
    for dy in range(-radius, radius+1):
        for dx in range(-radius, radius+1):
            if dx == 0 and dy == 0:
                continue
            shifted = np.roll(np.roll(gray, dy, 0), dx, 1)
            lbp_hist += np.histogram(
                (gray.astype(np.int16) - shifted.astype(np.int16)).flatten(),
                bins=32, range=(-128, 128)
            )[0]
    lbp_hist = lbp_hist[:64] / (lbp_hist[:64].sum() + 1e-7)

    # ── 2. HOG-like gradient orientation histogram (64 dims) ───────
    gx   = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy   = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    mag, ang = cv2.cartToPolar(gx, gy, angleInDegrees=True)
    hog_hist = np.zeros(64)
    # 8×8 cells → 16×16 grid → 256 cells; use 4×4 grid for 64-d
    cell = 32  # 128/4
    for i in range(4):
        for j in range(4):
            m = mag[i*cell:(i+1)*cell, j*cell:(j+1)*cell]
            a = ang[i*cell:(i+1)*cell, j*cell:(j+1)*cell]
            h, _ = np.histogram(a, bins=4, range=(0, 360), weights=m)
            hog_hist[i*16 + j*4 : i*16 + j*4 + 4] = h
    hog_hist = hog_hist / (hog_hist.sum() + 1e-7)

    # ── 3. HSV colour histogram (64 dims) ──────────────────────────
    hsv = cv2.cvtColor(face, cv2.COLOR_BGR2HSV)
    h_hist = cv2.calcHist([hsv],[0],None,[32],[0,180]).flatten()
    s_hist = cv2.calcHist([hsv],[1],None,[16],[0,256]).flatten()
    v_hist = cv2.calcHist([hsv],[2],None,[16],[0,256]).flatten()
    col_hist = np.concatenate([h_hist, s_hist, v_hist])
    col_hist = col_hist / (col_hist.sum() + 1e-7)

    # ── Combine ─────────────────────────────────────────────────────
    enc = np.concatenate([lbp_hist, hog_hist, col_hist]).astype(np.float32)
    norm = np.linalg.norm(enc)
    return (enc / (norm + 1e-7)).tolist()

def get_face_encodings(image_path):
    """Return list of encodings (one per face) for the given image."""
    img = cv2.imread(image_path)
    if img is None:
        return []
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)          # improve contrast
    faces = detect_faces(gray)
    if not faces:
        return []
    # Sort by face area (largest = primary subject)
    faces.sort(key=lambda r: r[2]*r[3], reverse=True)
    return [extract_encoding(img, *f) for f in faces]

def cosine_sim(a, b):
    a, b = np.array(a, np.float32), np.array(b, np.float32)
    d = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9)
    return float(np.clip(d, 0.0, 1.0))

def allowed_file(fn):
    return '.' in fn and fn.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ── Frontend routes ───────────────────────────────────────────────────────────
@app.route('/')
def serve_index(): return send_from_directory(FRONTEND_DIR, 'index.html')
@app.route('/find.html')
def serve_find():  return send_from_directory(FRONTEND_DIR, 'find.html')
@app.route('/admin.html')
def serve_admin(): return send_from_directory(FRONTEND_DIR, 'admin.html')
@app.route('/style.css')
def serve_css():   return send_from_directory(FRONTEND_DIR, 'style.css')
@app.route('/script.js')
def serve_js():    return send_from_directory(FRONTEND_DIR, 'script.js')
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'assets'), filename)

# ── API ───────────────────────────────────────────────────────────────────────
@app.route('/api/health')
def health():
    return jsonify({"status":"running","message":"IET Expo Backend Running","face_model":"OpenCV-HOG+LBP+HSV"})

@app.route('/api/upload-event', methods=['POST'])
def upload_event_photos():
    if 'photos' not in request.files:
        return jsonify({"error":"No photos uploaded"}), 400
    files = request.files.getlist('photos')
    processed = faces_found = 0
    errors = []
    db = get_db()
    for file in files:
        if file and allowed_file(file.filename):
            try:
                filename = secure_filename(f"{uuid.uuid4().hex[:8]}_{file.filename}")
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                cur = db.execute("INSERT INTO photos (filename,original_name) VALUES (?,?)",
                                 (filename, file.filename))
                photo_id = cur.lastrowid
                encs = get_face_encodings(filepath)
                faces_found += len(encs)
                for enc in encs:
                    db.execute("INSERT INTO face_encodings (photo_id,encoding) VALUES (?,?)",
                               (photo_id, json.dumps(enc)))
                processed += 1
            except Exception as e:
                errors.append(f"{file.filename}: {e}")
        elif file:
            errors.append(f"{file.filename}: Invalid file type")
    db.commit(); db.close()
    return jsonify({"status":"success","photos_processed":processed,"faces_detected":faces_found,"errors":errors})

@app.route('/api/find-matches', methods=['POST'])
def find_matches():
    if 'selfie' not in request.files:
        return jsonify({"error":"No selfie uploaded"}), 400
    file = request.files['selfie']
    if not file or not allowed_file(file.filename):
        return jsonify({"error":"Invalid file type"}), 400
    filename = secure_filename(f"selfie_{uuid.uuid4().hex[:8]}_{file.filename}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    session_id = uuid.uuid4().hex
    try:
        selfie_encs = get_face_encodings(filepath)
        if not selfie_encs:
            return jsonify({"error":"No face detected. Use a clear, well-lit frontal photo."}), 400
        selfie_enc = selfie_encs[0]

        db = get_db()
        rows = db.execute('''
            SELECT fe.encoding, p.filename, p.original_name
            FROM face_encodings fe JOIN photos p ON fe.photo_id = p.id
        ''').fetchall()

        matched, seen = [], set()
        THRESHOLD = 0.82   # cosine similarity — tune up/down for precision/recall

        for row in rows:
            sim = cosine_sim(selfie_enc, json.loads(row['encoding']))
            if sim >= THRESHOLD and row['filename'] not in seen:
                matched.append({
                    "filename":      row['filename'],
                    "original_name": row['original_name'],
                    "similarity":    round(sim * 100, 1),
                })
                seen.add(row['filename'])

        matched.sort(key=lambda x: x['similarity'], reverse=True)
        db.execute("INSERT INTO match_logs (session_id,matches_count) VALUES (?,?)",
                   (session_id, len(matched)))
        db.commit(); db.close()
    finally:
        if os.path.exists(filepath): os.remove(filepath)

    return jsonify({"status":"success","matches":matched,"count":len(matched),"session_id":session_id})

@app.route('/api/stats')
def get_stats():
    db = get_db()
    photos   = db.execute("SELECT COUNT(*) as c FROM photos").fetchone()['c']
    faces    = db.execute("SELECT COUNT(*) as c FROM face_encodings").fetchone()['c']
    searches = db.execute("SELECT COUNT(*) as c FROM match_logs").fetchone()['c']
    matched  = db.execute("SELECT COALESCE(SUM(matches_count),0) as t FROM match_logs").fetchone()['t']
    recent   = db.execute("SELECT filename,original_name,upload_time FROM photos ORDER BY upload_time DESC LIMIT 20").fetchall()
    db.close()
    return jsonify({"total_photos":photos,"total_faces":faces,"total_searches":searches,
                    "total_matched":matched,"recent_uploads":[dict(r) for r in recent]})

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

@app.route('/api/delete-all', methods=['POST'])
def delete_all():
    data = request.get_json() or {}
    if data.get('password','') != ADMIN_PASSWORD:
        return jsonify({"error":"Unauthorized"}), 401
    db = get_db()
    for t in ('face_encodings','match_logs','photos'):
        db.execute(f"DELETE FROM {t}")
    db.commit(); db.close()
    for f in os.listdir(UPLOAD_FOLDER):
        fp = os.path.join(UPLOAD_FOLDER, f)
        if os.path.isfile(fp):
            try: os.remove(fp)
            except: pass
    return jsonify({"status":"success","message":"All data deleted"})

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/download/<filename>')
def download_photo(filename):
    fp = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(fp): return jsonify({"error":"File not found"}), 404
    return send_file(fp, as_attachment=True, download_name=filename)

@app.route('/api/download-zip', methods=['POST'])
def download_zip():
    filenames = (request.json or {}).get('filenames', [])
    if not filenames: return jsonify({"error":"No files specified"}), 400
    buf = io.BytesIO()
    added = 0
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for fn in filenames:
            fp = os.path.join(UPLOAD_FOLDER, fn)
            if os.path.exists(fp): zf.write(fp, fn); added += 1
    if not added: return jsonify({"error":"Files not found"}), 404
    buf.seek(0)
    return send_file(buf, mimetype='application/zip', as_attachment=True,
                     download_name='IET_Expo_My_Photos.zip')

@app.route('/api/generate-qr', methods=['POST'])
def generate_qr():
    url = (request.json or {}).get('url','')
    if not url: return jsonify({"error":"No URL"}), 400
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(url); qr.make(fit=True)
    img = qr.make_image(fill_color="#0a0a1a", back_color="#ffffff")
    buf = io.BytesIO(); img.save(buf, 'PNG'); buf.seek(0)
    return send_file(buf, mimetype='image/png')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    print(f"[IET Expo] Running at http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
