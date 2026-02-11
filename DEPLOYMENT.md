# Hướng Dẫn Deploy (Triển Khai) FAF Backend

Tài liệu này hướng dẫn cách đưa Backend lên server để người khác (Frontend, Mobile App, Users) có thể truy cập qua Internet.

## Cách 1: Dùng Render.com (Miễn phí, Dễ nhất)

**Render** là nền tảng Cloud miễn phí cho phép deploy Node.js + PostgreSQL dễ dàng.

### Bước 1: Chuẩn bị
1.  Đẩy code hiện tại lên **GitHub/GitLab** (Public hoặc Private repository).
2.  Đăng ký tài khoản tại [render.com](https://render.com).

### Bước 2: Tạo Database (PostgreSQL)
1.  Trên Render Dashboard, chọn **New +** -> **PostgreSQL**.
2.  Đặt tên (vd: `faf-db`).
3.  Chọn **Free Plan**.
4.  Bấm **Create Database**.
5.  Sau khi tạo xong, copy dòng **Internal Database URL** (dùng trong nội bộ Render) hoặc **External Database URL**.

### Bước 3: Deploy Backend (Web Service)
1.  Chọn **New +** -> **Web Service**.
2.  Kết nối với GitHub repo của bạn.
3.  Cấu hình:
    *   **Name**: `faf-backend`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node bin/www`
4.  Kéo xuống phần **Environment Variables**, bấm **Add Environment Variable** để thêm các biến từ file `.env` của bạn:
    *   `PORT`: `10000` (Render tự động gán nếu để trống, nhưng nên set cứng nếu code bạn hardcode)
    *   `DATABASE_URL`: (Paste link PostgreSQL vừa copy ở Bước 2)
    *   `JWT_SECRET`: (Tự đặt một chuỗi bảo mật bất kỳ)
    *   `CLIENT_URL`: (Link frontend của bạn, ví dụ `https://faf-frontend.onrender.com`)
    *   `MAIL_USER` / `MAIL_PASS`: (Nếu có dùng gửi mail)
5.  Bấm **Create Web Service**.

### Bước 4: Hoàn tất
*   Render sẽ tự động chạy `npm install` và start server.
*   Khi thấy log báo `Listening on port...`, server đã online.
*   Copy link web service (ví dụ: `https://faf-backend.onrender.com`) để dùng.
*   **Swagger Docs**: Truy cập `https://faf-backend.onrender.com/api-docs`.

---

## Cách 2: Dùng VPS (Ubuntu, DigitalOcean/AWS) - Nâng cao

Dành cho production thực tế, chi phí thấp (~$5/tháng) nhưng cần kiến thức Linux.

### Bước 1: Cài đặt môi trường
SSH vào VPS và chạy:
```bash
# Cập nhật
sudo apt update && sudo apt upgrade -y

# Cài Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Cài PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Cài PM2 (Quản lý process chạy ngầm)
sudo npm install -g pm2
```

### Bước 2: Setup Database
```bash
sudo -u postgres psql
# Trong SQL:
CREATE DATABASE faf_db;
CREATE USER faf_user WITH ENCRYPTED PASSWORD 'mat_khau_bao_mat';
GRANT ALL PRIVILEGES ON DATABASE faf_db TO faf_user;
\q
```

### Bước 3: Clone Code & Start
```bash
git clone https://github.com/your-username/faf-backend.git
cd faf-backend
npm install

# Tạo file .env
nano .env
# (Paste nội dung env vào, sửa DATABASE_URL theo user vừa tạo)

# Chạy Migration (nếu có script)

# Start bằng PM2
pm2 start bin/www --name "faf-backend"
pm2 save
pm2 startup
```

Server sẽ chạy ngầm và tự khởi động lại nếu crash hoặc reboot VPS.
