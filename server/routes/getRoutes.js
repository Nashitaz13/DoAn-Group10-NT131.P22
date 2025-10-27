// server/routes/getRoutes.js (hoặc tên file bạn đang dùng)
const express = require('express');
const path = require('path');
const router = express.Router();

// Models
const AccessLog = require('../src/models/AccessLog');

// Các đường dẫn public (không cần đăng nhập)
const PUBLIC_PATHS = new Set([
  '/login', '/login.html',
  '/register', '/register.html',
  '/forgot-password', '/forgot-password.html',
  '/verify-otp', '/verify-otp.html',
  '/reset-password', '/reset-password.html'
]);

// Tiện ích gửi file HTML từ thư mục public
const DEFAULT_PUBLIC_DIR = path.join(__dirname, '..', 'public');
function sendPublic(req, res, filename) {
  const rootDir = (req.app && req.app.locals && req.app.locals.PUBLIC_DIR) || DEFAULT_PUBLIC_DIR;
  return res.sendFile(filename, { root: rootDir });
}

// Middleware bảo vệ route GET
router.use((req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  const isAsset = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff2', '.woff', '.ttf', '.map']
    .includes(ext);

  if (isAsset || PUBLIC_PATHS.has(req.path) || req.session.user) {
    return next();
  }
  return res.redirect('/login');
});

// ===== Pages =====
router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  return sendPublic(req, res, 'index.html');
});

router.get('/history', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  return sendPublic(req, res, 'history.html');
});

router.get('/tb_tn', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  return sendPublic(req, res, 'tb_tn.html');
});

// Auth pages (public)
router.get('/login',        (req, res) => sendPublic(req, res, 'login.html'));
router.get('/register',     (req, res) => sendPublic(req, res, 'register.html'));
router.get('/forgot-password', (req, res) => sendPublic(req, res, 'forgot-password.html'));
router.get('/verify-otp',   (req, res) => sendPublic(req, res, 'verify-otp.html'));
router.get('/reset-password',(req, res) => sendPublic(req, res, 'reset-password.html'));

// ===== APIs =====
router.get('/api/access-logs', async (_req, res) => {
  try {
    const logs = await AccessLog.find().sort({ time: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.get('/api/logs/recent', async (_req, res) => {
  try {
    const logs = await AccessLog.find({})
      .sort({ time: -1 })
      .limit(20);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
