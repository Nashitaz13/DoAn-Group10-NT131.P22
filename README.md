Smart Access (FE static + BE Express + MongoDB)
0) Lấy mã nguồn
git clone https://github.com/Nashitaz13/DoAn-Group10-NT131.P22.git
cd DoAn-Group10-NT131.P22

# (nếu repo có nhánh Server)
## Check branch
git branch -a
## Chuyển sang nhánh Server
git checkout Server
git pull origin Server ## Cập nhật nhánh Server

1) Chạy FE (tĩnh) – chỉ giao diện

FE nằm trong thư mục public/ (SB Admin 2 + JS). Dùng 1 HTTP server đơn giản:

### Use live server with VSCode (Extension)

Cài đặt extension "Live Server" và mở thư mục public/ trong VSCode. Chạy Live Server và mở: http://localhost:3000

FE chỉ hiển thị giao diện. Các chức năng cần API/WS thì sang mục 2 hoặc 3.

2) Chạy BE (local) + FE (do BE phục vụ) + Mongo (local)
2.1 Chuẩn bị MongoDB (tuỳ chọn 1)

Nếu máy đã cài Mongo: bỏ qua bước này.

Nếu chưa có Mongo, chạy tạm bằng Docker:

docker run -d --name mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7

2.2 Cài & chạy BE (local)
cd server
npm install
cp .env.example .env
# sửa .env: dùng Mongo local
# MONGODB_URI=mongodb://localhost:27017/smart_access
npm run dev   # hoặc: node server.js


Mở: http://localhost:3000

BE phục vụ luôn thư mục public/ và WebSocket/REST.

Nếu dùng Gmail SMTP: bật 2FA và dùng App Password cho EMAIL_PASS.

Mẫu .env (local):

PORT=3000
BASE_URL=http://localhost:3000
SESSION_SECRET=changethis_in_production
MONGODB_URI=mongodb://localhost:27017/smart_access
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=YOUR_EMAIL@gmail.com
EMAIL_PASS=YOUR_APP_PASSWORD

3) Chạy toàn bộ bằng Docker Compose (khuyên dùng)

Cách này dựng Mongo trong container và build BE; FE được BE phục vụ.

Ở gốc dự án:

cp .env.example .env
# sửa .env: dùng host "mongo" (KHÔNG dùng localhost)
# MONGODB_URI=mongodb://root:password@mongo:27017/smart_access?authSource=admin

docker compose up -d --build
docker compose ps
# Mở: http://localhost:4000


Mẫu .env (Compose):

PORT=4000
BASE_URL=http://localhost:4000
SESSION_SECRET=changethis_in_production
MONGODB_URI=mongodb://root:password@mongo:27017/smart_access?authSource=admin
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=YOUR_EMAIL@gmail.com
EMAIL_PASS=YOUR_APP_PASSWORD

4) Lệnh nhanh kiểm thử
# REST
curl -s http://localhost:4000/api/logs/recent | head
curl -s http://localhost:4000/api/access-logs | head

# Log server (Compose)
docker compose logs -f server

# Docker Compose
docker compose down
# (xoá cả dữ liệu Mongo) docker compose down -v