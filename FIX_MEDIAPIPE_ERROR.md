# 🔧 SỬA LỖI: Mediapipe không cài được trên Render

## ❌ Lỗi gặp phải

```
ERROR: Could not find a version that satisfies the requirement mediapipe>=0.10.0
ERROR: No matching distribution found for mediapipe>=0.10.0
Build failed
```

## 🔍 Nguyên nhân

- Render.com đang dùng **Python 3.13** (mặc định)
- **Mediapipe chỉ hỗ trợ Python 3.7 - 3.12**
- Python 3.13 quá mới, mediapipe chưa có bản build cho version này

## ✅ Giải pháp

### Cách 1: Cấu hình trong Render Dashboard (KHUYẾN NGHỊ)

1. Vào **Render Dashboard** → Chọn service của bạn
2. Vào tab **Settings**
3. Scroll xuống phần **Environment**
4. Tìm **Python Version** hoặc tạo Environment Variable:
   ```
   Key: PYTHON_VERSION
   Value: 3.11.0
   ```
5. Click **Save Changes**
6. Render sẽ tự động rebuild với Python 3.11

### Cách 2: Dùng file runtime.txt (Tự động)

File `runtime.txt` đã được tạo trong repo với nội dung:
```
3.11.0
```

Render sẽ tự động đọc file này và dùng Python 3.11.0

**Nếu vẫn lỗi:**
1. Đảm bảo file `runtime.txt` ở **root directory** (cùng cấp với `render.yaml`)
2. Format đúng: `3.11.0` (không có prefix `python-`)
3. Commit và push lên GitHub
4. Render sẽ tự động rebuild

### Cách 3: Cập nhật render.yaml

File `render.yaml` đã được cấu hình với:
```yaml
envVars:
  - key: PYTHON_VERSION
    value: 3.11.0
```

Nếu deploy bằng cách import `render.yaml`, Render sẽ tự động dùng Python 3.11.0

## 🚀 Các bước thực hiện

1. **Kiểm tra file `runtime.txt`**:
   ```bash
   cat runtime.txt
   # Phải hiển thị: 3.11.0
   ```

2. **Commit và push**:
   ```bash
   git add runtime.txt .python-version render.yaml
   git commit -m "Fix: Set Python 3.11.0 for mediapipe compatibility"
   git push origin main
   ```

3. **Trong Render Dashboard**:
   - Vào service → **Settings** → **Environment**
   - Đảm bảo có `PYTHON_VERSION=3.11.0`
   - Nếu chưa có, thêm vào và Save

4. **Trigger rebuild**:
   - Vào tab **Events** → Click **Manual Deploy** → **Deploy latest commit**
   - Hoặc đợi Render tự động rebuild sau khi push

5. **Kiểm tra logs**:
   - Vào tab **Logs**
   - Xem build log, phải thấy: `Python 3.11.0` thay vì `3.13`
   - Mediapipe sẽ cài được thành công

## ✅ Kiểm tra thành công

Sau khi rebuild, trong logs bạn sẽ thấy:
```
Collecting mediapipe>=0.10.0
  Downloading mediapipe-0.10.x-cp311-cp311-...
Successfully installed mediapipe-0.10.x
```

Thay vì lỗi:
```
ERROR: Could not find a version that satisfies the requirement mediapipe>=0.10.0
```

## 📝 Lưu ý

- **Python 3.11.0** là version ổn định và được mediapipe hỗ trợ tốt
- **Python 3.12** cũng được hỗ trợ, nhưng 3.11.0 an toàn hơn
- **KHÔNG dùng Python 3.13** cho đến khi mediapipe hỗ trợ

## 🔗 Tham khảo

- Mediapipe Python support: https://pypi.org/project/mediapipe/
- Render Python version docs: https://render.com/docs/python-version

