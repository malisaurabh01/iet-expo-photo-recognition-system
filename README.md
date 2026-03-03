# IET KK Wagh Expo Photo Recognition System

An AI-powered Photo Recognition System developed for the IET KK Wagh Engineering Expo.  
This project uses Deep Learning and Computer Vision to detect and recognize faces from uploaded event photos.

---

## Project Description

The IET KK Wagh Expo Photo Recognition System is designed to simplify event photo management by automatically detecting and recognizing faces in images.

Instead of manually searching through hundreds of event photos, participants can quickly find their photos using AI-based face recognition.

This system combines Artificial Intelligence, Machine Learning, and Web Development to build a real-world application for event photo organization.

---

## Key Features

- Face Detection using OpenCV  
- Face Recognition using DeepFace  
- Image Upload Functionality  
- Organized Photo Storage System  
- Simple and User-Friendly Web Interface  
- AI-Based Photo Matching  

---

##  Tech Stack

- **Python**
- **OpenCV**
- **DeepFace**
- **Flask (Backend Framework)**
- **HTML**
- **CSS**
- **JavaScript**

---

## Project Structure

```
iet-expo-photo-recognition-system/
│
├── backend/
│   ├── uploads/
│   └── (face recognition logic)
│
├── frontend/
│   ├── index.html
│   ├── results.html
│   ├── admin.html
│   ├── style.css
│   └── script.js
│
├── test_deepface.py
├── test_opencv.py
└── .gitignore
```

---

## How to Run the Project

### 1️) Clone the Repository

```bash
git clone https://github.com/malisaurabh01/iet-expo-photo-recognition-system.git
cd iet-expo-photo-recognition-system
```

### 2️) Create Virtual Environment

```bash
python -m venv venv
```

### 3️) Activate Virtual Environment

For Windows:
```bash
venv\Scripts\activate
```

For Mac/Linux:
```bash
source venv/bin/activate
```

### 4️) Install Dependencies

```bash
pip install -r requirements.txt
```

### 5️) Run the Backend Server

```bash
python app.py
```

Then open your browser and go to:

```
http://127.0.0.1:5000
```

---

## How It Works

1. User uploads an image.
2. OpenCV detects faces in the image.
3. DeepFace extracts facial features.
4. The system compares the face with stored images.
5. Matching photos are displayed to the user.

---

## Future Improvements

- Improve recognition accuracy with optimized models  
- Add database integration (MySQL / MongoDB)  
- Deploy system online (Render / Railway / AWS)  
- Add Admin Analytics Dashboard  
- Implement Real-Time Camera Recognition  

---

## Developed For

**IET KK Wagh Engineering Expo**  
AI-Based Innovation Project  

---

## Developer

**Saurabh Mali**  
Electrical Engineering Student  
KK Wagh Institute of Engineering Education & Research

---
