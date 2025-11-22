<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎨 Beauty Editor Pro - AI-Powered Face Editing

Ứng dụng chỉnh sửa ảnh làm đẹp khuôn mặt sử dụng AI, với frontend React + TypeScript và backend FastAPI + Python.

## 🚀 Quick Deploy (5 phút)

**Muốn có link chia sẻ ngay?** Xem [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)

**Hướng dẫn chi tiết:** Xem [DEPLOY.md](./DEPLOY.md)

## 📋 Tính năng

- ✨ Phân tích khuôn mặt tự động
- 💆 Làm mịn da (Skin Smoothing)
- ✨ Làm sáng da (Skin Brightening)
- 👁️ Chỉnh sửa mắt (Eye Enhancement)
- 💋 Chỉnh sửa môi (Lip Enhancement)
- 👃 Chỉnh sửa mũi (Nose Reshaping)
- 😊 Chỉnh sửa khuôn mặt (Face Reshaping)
- 🎨 AI Color Transfer
- 🖼️ Background Removal
- 📸 Image Upscaling

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: FastAPI + Python 3.11
- **AI**: Google Gemini API, MediaPipe, OpenCV
- **Deployment**: Vercel (Frontend) + Render.com (Backend)

## 📦 Run Locally

### Prerequisites
- Node.js >= 18.0.0
- Python >= 3.9
- Gemini API Key

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local`:
   ```
   VITE_BEAUTY_BACKEND=http://127.0.0.1:8000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

   Frontend sẽ chạy tại: http://localhost:5173

### Backend Setup

1. Create virtual environment:
   ```bash
   python -m venv venv
   ```

2. Activate virtual environment:
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Run backend server:
   ```bash
   uvicorn backend.main:app --reload
   ```

   Backend sẽ chạy tại: http://localhost:8000
   API Documentation: http://localhost:8000/docs

## 🌐 Deploy to Production

### Option 1: Vercel + Render.com (Recommended)

1. **Deploy Backend** lên Render.com:
   - Import GitHub repo
   - Set build command: `pip install -r backend/requirements.txt`
   - Set start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Add environment variable: `ALLOWED_ORIGINS=https://your-frontend.vercel.app`

2. **Deploy Frontend** lên Vercel:
   - Import GitHub repo
   - Add environment variables:
     - `VITE_BEAUTY_BACKEND=https://your-backend.onrender.com`
     - `GEMINI_API_KEY=your_api_key`

3. **Update CORS** trong Render với frontend URL

Xem chi tiết trong [DEPLOY.md](./DEPLOY.md)

## 📚 Documentation

- [DEPLOY.md](./DEPLOY.md) - Hướng dẫn deploy chi tiết
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - Deploy nhanh 5 phút
- [FIX_MEDIAPIPE_ERROR.md](./FIX_MEDIAPIPE_ERROR.md) - Sửa lỗi mediapipe không cài được
- [backend/README.txt](./backend/README.txt) - Backend documentation

## 🔗 Links

- **GitHub**: https://github.com/tandat1512/MARIO-EDITER-AI
- **AI Studio**: https://ai.studio/apps/drive/1tlN6bu38gttQ8ZlhLXnLEeDltm9PTjSx

## 📝 License

MIT License
