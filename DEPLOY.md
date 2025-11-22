# 🚀 Hướng dẫn Deploy - Tạo Link Chia Sẻ

Hướng dẫn này giúp bạn deploy ứng dụng lên cloud để có link chia sẻ cho 2-3 người dùng.

## ⏱️ Thời gian: ~10 phút

---

## BƯỚC 1: Deploy Backend lên Render.com (5 phút)

### 1.1. Đăng ký/Đăng nhập Render
- Vào https://render.com    
- Đăng nhập bằng GitHub (khuyến nghị)

### 1.2. Tạo Web Service
1. Click **New +** → **Web Service**
2. Connect GitHub repo của bạn
3. Chọn repo: `tandat1512/MARIO-EDITER-AI` (hoặc repo của bạn)

### 1.3. Cấu hình Backend
Điền thông tin sau:

```
Name: beauty-editor-backend
Environment: Python 3
Region: Singapore (hoặc gần bạn nhất)
Branch: main (hoặc master)

Build Command: pip install -r backend/requirements.txt
Start Command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 1.4. Environment Variables
Thêm biến môi trường (tạm thời để trống, sẽ cập nhật sau):

```
ALLOWED_ORIGINS = (để trống, sẽ cập nhật sau khi có frontend URL)
```

### 1.5. Deploy
- Click **Create Web Service**
- ⏳ Chờ 5-10 phút để build và deploy
- Copy URL backend (ví dụ: `https://beauty-editor-backend-xxx.onrender.com`)

---

## BƯỚC 2: Deploy Frontend lên Vercel (3 phút)

### 2.1. Đăng ký/Đăng nhập Vercel
- Vào https://vercel.com
- Đăng nhập bằng GitHub

### 2.2. Import Project
1. Click **Add New...** → **Project**
2. Import GitHub repo của bạn
3. Chọn repo: `tandat1512/MARIO-EDITER-AI`

### 2.3. Cấu hình Frontend
Vercel sẽ tự động detect Vite, nhưng kiểm tra:

```
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
```

### 2.4. Environment Variables
Thêm các biến sau:

```
VITE_BEAUTY_BACKEND = [URL backend từ bước 1]
GEMINI_API_KEY = [API key Gemini của bạn]
```

**Ví dụ:**
```
VITE_BEAUTY_BACKEND = https://beauty-editor-backend-xxx.onrender.com
GEMINI_API_KEY = AIzaSy...
```

### 2.5. Deploy
- Click **Deploy**
- ⏳ Chờ 2-3 phút
- Copy URL frontend (ví dụ: `https://mario-editer-ai.vercel.app`)

---

## BƯỚC 3: Cập nhật CORS (2 phút)

### 3.1. Quay lại Render.com
1. Vào service backend vừa tạo
2. Vào tab **Environment**
3. Tìm biến `ALLOWED_ORIGINS`

### 3.2. Cập nhật giá trị
Thay đổi giá trị thành URL frontend của bạn:

```
ALLOWED_ORIGINS = https://mario-editer-ai.vercel.app
```

### 3.3. Lưu và chờ restart
- Click **Save Changes**
- Service sẽ tự động restart (~1 phút)

---

## ✅ HOÀN THÀNH!

Bây giờ bạn có link chia sẻ: `https://your-app.vercel.app`

Chia sẻ link này cho 2-3 người để test!

---

## 🔧 Xử lý vấn đề

### Backend bị "sleep" (Render Free Tier)
Render free tier sẽ sleep sau 15 phút không dùng.

**Giải pháp miễn phí:**
1. Đăng ký https://uptimerobot.com (miễn phí)
2. Tạo monitor:
   - Type: HTTP(s)
   - URL: [URL backend của bạn]
   - Interval: 5 minutes
3. Monitor sẽ tự động ping backend → Không bị sleep

### Lỗi CORS
- Kiểm tra `ALLOWED_ORIGINS` trong Render có đúng URL frontend không
- Đảm bảo URL không có dấu `/` ở cuối

### Lỗi build
- Kiểm tra `requirements.txt` có đầy đủ dependencies
- Kiểm tra Python version (3.11.0)

---

## 📝 Tóm tắt URLs

Sau khi deploy xong, bạn sẽ có:
- **Frontend**: `https://your-app.vercel.app` ← Link chia sẻ
- **Backend**: `https://your-backend.onrender.com` ← Dùng cho API

---

## 🎉 Test

1. Mở link frontend
2. Upload ảnh
3. Test các tính năng làm đẹp
4. Chia sẻ link cho bạn bè!

