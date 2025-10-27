// server.js
const express = require('express');
const http = require('http');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// 1) Common config
app.set('trust proxy', 1); // nếu sau này reverse proxy
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,              // true nếu dùng HTTPS/proxy set secure
    sameSite: 'lax',            // an toàn cho session cơ bản
    maxAge: 7 * 24 * 3600 * 1000
  }
}));

// 2) Thư mục FE tĩnh (PUBLIC_DIR)
// In container, server.js is at /app/server.js and public is at /app/public
// Use path.join(__dirname, 'public') so it resolves to /app/public
const PUBLIC_DIR = path.join(__dirname, 'public');
app.locals.PUBLIC_DIR = PUBLIC_DIR;        // để routes dùng
app.use(express.static(PUBLIC_DIR));       // ⚠️ ĐẶT TRƯỚC routes

// 3) Routes (dùng PUBLIC_DIR trong routes)
const routes = require('./routes');        // xem hướng dẫn sửa routes bên dưới
app.use('/', routes);

// 4) 404 fallback về file trong public
app.use((req, res) =>
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'))
);

// 5) WebSocket
const setupWebSocket = require('./socket_server');
setupWebSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP & WS chạy tại http://localhost:${PORT}`);
});
