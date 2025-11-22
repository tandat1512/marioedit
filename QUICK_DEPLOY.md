# ⚡ DEPLOY NHANH - 5 PHÚT

## 🎯 Mục tiêu: Có link chia sẻ cho 5-10 người dùng

### BƯỚC 1: Deploy Backend (Render.com) - 3 phút

1. Vào https://render.com → Đăng nhập bằng GitHub
2. **New +** → **Web Service**
3. Connect repo: `tandat1512/MARIO-EDITER-AI`
4. Điền thông tin:
   ```
   Name: beauty-editor-backend
   Environment: Python 3
   Python Version: 3.11.0 (QUAN TRỌNG!)
   Build Command: pip install --upgrade pip && pip install -r backend/requirements.txt
   Start Command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
   
   ⚠️ **LƯU Ý QUAN TRỌNG**: 
   - Phải chọn **Python Version: 3.11.0** (KHÔNG dùng 3.13 vì mediapipe không hỗ trợ)
   - Nếu không thấy option chọn version, Render sẽ tự động đọc từ file `runtime.txt` trong repo
5. Click **Create Web Service**
6. ⏳ Chờ 5-10 phút → Copy URL (ví dụ: `https://beauty-editor-backend-xxx.onrender.com`)

---

### BƯỚC 2: Deploy Frontend (Vercel) - 2 phút

1. Vào https://vercel.com → Đăng nhập bằng GitHub
2. **Add New...** → **Project**
3. Import repo: `tandat1512/MARIO-EDITER-AI`
4. Cấu hình:
   ```
   Framework: Vite
   Build Command: npm run build
   Output Directory: dist
   ```
5. Thêm Environment Variables:
   ```
   VITE_BEAUTY_BACKEND = [URL backend từ bước 1]
   GEMINI_API_KEY = [API key của bạn]
   ```
6. Click **Deploy**
7. ⏳ Chờ 2-3 phút → Copy URL (ví dụ: `https://mario-editer-ai.vercel.app`)

---

### BƯỚC 3: Cập nhật CORS - 1 phút

1. Quay lại Render.com
2. Vào **Environment** tab
3. Thêm/Update:
   ```
   ALLOWED_ORIGINS = [URL frontend từ bước 2]
   ```
4. Click **Save Changes** → Service sẽ tự động restart

---

## ✅ XONG! 

Chia sẻ link frontend cho người dùng: `https://your-app.vercel.app`

---

## 🔧 Nếu Backend bị Sleep (Render Free Tier)

Render free tier sẽ sleep sau 15 phút không dùng. Giải pháp:

**Option 1: Dùng UptimeRobot (Miễn phí)**
1. Đăng ký: https://uptimerobot.com
2. Add Monitor:
   - Type: HTTP(s)
   - URL: [URL backend của bạn]
   - Interval: 5 minutes
3. Monitor sẽ tự động ping backend mỗi 5 phút → Không bị sleep

**Option 2: Upgrade Render (Nếu cần)**
- Render Starter: $7/tháng → Không bị sleep

---

## 📱 Test nhanh

1. Mở link frontend
2. Upload ảnh
3. Test tính năng làm đẹp
4. Xong! 🎉

