# 🚀 HƯỚNG DẪN DEPLOY BEAUTY EDITOR PRO

Hướng dẫn này sẽ giúp bạn deploy ứng dụng lên cloud để chia sẻ link cho 5-10 người dùng.

## 📋 TỔNG QUAN

Ứng dụng bao gồm 2 phần:
- **Frontend**: React + Vite (deploy trên Vercel hoặc Netlify)
- **Backend**: FastAPI + Python (deploy trên Render.com)

## 🎯 PHƯƠNG ÁN DEPLOY (KHUYẾN NGHỊ)

### Option 1: Vercel (Frontend) + Render.com (Backend) - **KHUYẾN NGHỊ**
- ✅ Miễn phí
- ✅ Dễ setup
- ✅ Tự động deploy từ GitHub
- ✅ Hỗ trợ tốt cho React và Python

### Option 2: Netlify (Frontend) + Render.com (Backend)
- ✅ Miễn phí
- ✅ Tương tự Vercel

---

## 📦 BƯỚC 1: DEPLOY BACKEND LÊN RENDER.COM

### 1.1. Chuẩn bị
1. Đảm bảo code đã được push lên GitHub
2. Truy cập: https://render.com
3. Đăng ký/Đăng nhập bằng GitHub

### 1.2. Tạo Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect repository: Chọn repo `MARIO-EDITER-AI`
3. Cấu hình:
   - **Name**: `beauty-editor-backend`
   - **Region**: Singapore (gần Việt Nam nhất)
   - **Branch**: `main`
   - **Root Directory**: `backend` (hoặc để trống nếu file ở root)
   - **Environment**: `Python 3`
   - **Python Version**: `3.11.0` ⚠️ **QUAN TRỌNG** - Mediapipe không hỗ trợ Python 3.13
   - **Build Command**: `pip install --upgrade pip && pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

   **Lưu ý về Python Version:**
   - Render mặc định có thể dùng Python 3.13 (quá mới)
   - Mediapipe chỉ hỗ trợ Python 3.7-3.12
   - File `runtime.txt` trong repo đã được set là `3.11.0`
   - Nếu không thấy option chọn version, Render sẽ tự động đọc từ `runtime.txt`
   - Nếu vẫn lỗi, xem [FIX_MEDIAPIPE_ERROR.md](./FIX_MEDIAPIPE_ERROR.md)

### 1.3. Cấu hình Environment Variables
Trong phần **Environment Variables**, thêm:
```
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```
(Lưu ý: Thay `your-frontend-domain` bằng domain thực tế sau khi deploy frontend)

### 1.4. Deploy
- Click **"Create Web Service"**
- Render sẽ tự động build và deploy
- Chờ 5-10 phút để hoàn tất
- Copy URL backend (ví dụ: `https://beauty-editor-backend.onrender.com`)

---

## 🌐 BƯỚC 2: DEPLOY FRONTEND LÊN VERCEL

### 2.1. Chuẩn bị
1. Truy cập: https://vercel.com
2. Đăng ký/Đăng nhập bằng GitHub

### 2.2. Import Project
1. Click **"Add New..."** → **"Project"**
2. Chọn repository: `MARIO-EDITER-AI`
3. Cấu hình:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 2.3. Cấu hình Environment Variables
Trong phần **Environment Variables**, thêm:
```
VITE_BEAUTY_BACKEND=https://beauty-editor-backend.onrender.com
GEMINI_API_KEY=your_gemini_api_key_here
```
(Lưu ý: Thay URL backend bằng URL thực tế từ Render)

### 2.4. Deploy
- Click **"Deploy"**
- Vercel sẽ tự động build và deploy
- Chờ 2-3 phút
- Copy URL frontend (ví dụ: `https://mario-editer-ai.vercel.app`)

### 2.5. Cập nhật CORS Backend
Quay lại Render.com, cập nhật Environment Variable:
```
ALLOWED_ORIGINS=https://mario-editer-ai.vercel.app
```
Sau đó restart service để áp dụng thay đổi.

---

## 🔄 BƯỚC 3: KIỂM TRA VÀ TEST

1. Truy cập link frontend
2. Upload ảnh và test các tính năng
3. Kiểm tra console (F12) xem có lỗi không
4. Kiểm tra Network tab để đảm bảo API calls thành công

---

## 📝 DEPLOY LÊN NETLIFY (THAY THẾ VERCEL)

### 3.1. Import Project
1. Truy cập: https://netlify.com
2. **"Add new site"** → **"Import an existing project"**
3. Chọn GitHub repository

### 3.2. Cấu hình Build Settings
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Base directory**: `./`

### 3.3. Environment Variables
Trong **Site settings** → **Environment variables**:
```
VITE_BEAUTY_BACKEND=https://beauty-editor-backend.onrender.com
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3.4. Deploy
- Click **"Deploy site"**
- Copy URL và cập nhật CORS trong Render

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Render.com Free Tier:
- ⏱️ Service sẽ "sleep" sau 15 phút không hoạt động
- 🔄 Lần request đầu tiên sau khi sleep sẽ mất ~30 giây để wake up
- 💡 Để tránh sleep, có thể dùng UptimeRobot (miễn phí) để ping service mỗi 5 phút

### Giới hạn:
- Render free tier: 750 giờ/tháng (đủ cho 5-10 users)
- Vercel/Netlify free tier: 100GB bandwidth/tháng (đủ cho 5-10 users)

### Bảo mật:
- ✅ Không commit file `.env` lên GitHub
- ✅ API keys nên được lưu trong Environment Variables của platform
- ✅ CORS đã được cấu hình để chỉ cho phép frontend domain

---

## 🛠️ TROUBLESHOOTING

### Backend không kết nối được:
1. Kiểm tra URL backend trong Environment Variables của frontend
2. Kiểm tra CORS settings trong Render
3. Kiểm tra logs trong Render dashboard

### Frontend build lỗi:
1. Kiểm tra `package.json` có đúng dependencies không
2. Kiểm tra `vite.config.ts`
3. Xem build logs trong Vercel/Netlify

### API trả về 500:
1. Kiểm tra logs trong Render
2. Đảm bảo MediaPipe và OpenCV đã được cài đặt đúng
3. Kiểm tra Python version (>= 3.9)

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Kiểm tra logs trong dashboard của Render/Vercel/Netlify
2. Kiểm tra console browser (F12)
3. Đảm bảo tất cả Environment Variables đã được set đúng

---

## 🎉 HOÀN TẤT

Sau khi deploy xong, bạn sẽ có:
- ✅ Link frontend: `https://your-app.vercel.app`
- ✅ Link backend: `https://your-backend.onrender.com`
- ✅ API docs: `https://your-backend.onrender.com/docs`

Chia sẻ link frontend cho người dùng để họ có thể sử dụng ứng dụng!

