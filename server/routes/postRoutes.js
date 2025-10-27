// server/routes/postRoutes.js
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../src/models/User'); 
require('dotenv').config();

const router = express.Router();

// ── SMTP transporter ────────────────────────────────────────────────────────────
const toBool = (v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return ['1','true','yes','on'].includes(v.toLowerCase());
  return false;
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: toBool(process.env.EMAIL_SECURE || false), // 465 => true, 587 => false
  auth: (process.env.EMAIL_USER && process.env.EMAIL_PASS) ? {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  } : undefined
});

transporter.verify()
  .then(() => console.log('✅ [SMTP] connected to SMTP server'))
  .catch(err => console.error('❌ [SMTP] Fail', err?.message || err));

// ── Helpers ────────────────────────────────────────────────────────────────────
const redirect = (res, path, qs = '') => res.redirect(qs ? `${path}?${qs}` : path);

// ── Register ───────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    let { firstName, lastName, userName, gmail, password, confirmPassword } = req.body || {};
    gmail = (gmail || '').toLowerCase().trim();
    userName = (userName || '').trim();

    if (!firstName || !lastName || !userName || !gmail || !password || password !== confirmPassword) {
      console.log('[REGISTER] ❌ Thiếu hoặc sai thông tin');
      return redirect(res, '/register', 'error=invalid');
    }

    const [existsByName, existsByGmail] = await Promise.all([
      User.findOne({ userName }),
      User.findOne({ gmail }),
    ]);
    if (existsByName || existsByGmail) {
      console.log('[REGISTER] ❌ Username/Gmail đã tồn tại');
      return redirect(res, '/register', 'error=exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ firstName, lastName, userName, gmail, password: hashedPassword, createdAt: new Date() });
    console.log('[REGISTER] ✅ Thành công:', { userName, gmail });
    return redirect(res, '/login', 'registered=1');
  } catch (err) {
    console.error('[REGISTER] ❌ Lỗi:', err);
    return redirect(res, '/register', 'error=server');
  }
});

// ── Login ──────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    const id = (identifier || '').trim();
    const query = {
      $or: [{ gmail: id.toLowerCase() }, { userName: id }]
    };

    const user = await User.findOne(query);
    if (!user) {
      console.log('[LOGIN] ❌ Không tìm thấy user:', id);
      return redirect(res, '/login', 'error=notfound');
    }

    const match = await bcrypt.compare(password || '', user.password);
    if (!match) {
      console.log('[LOGIN] ❌ Sai mật khẩu cho user:', id);
      return redirect(res, '/login', 'error=wrong');
    }

    req.session.user = { id: user._id, userName: user.userName };
    console.log('[LOGIN] ✅ Đăng nhập:', { id: user._id, userName: user.userName });
    return redirect(res, '/');
  } catch (err) {
    console.error('[LOGIN] ❌ Lỗi:', err);
    return redirect(res, '/login', 'error=server');
  }
});

// ── Forgot password ────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    let { gmail } = req.body || {};
    gmail = (gmail || '').toLowerCase().trim();

    const user = await User.findOne({ gmail });
    if (!user) {
      console.log('[FORGOT-PASSWORD] ❌ Không tìm thấy user:', gmail);
      return redirect(res, '/forgot-password', 'error=notfound');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOTP = otp;
    user.resetOTPExpiry = Date.now() + 10 * 60 * 1000; // 10 phút
    await user.save();

    await transporter.sendMail({
      from: `"Smart Access" <${process.env.EMAIL_USER || 'no-reply@local'}>`,
      to: gmail,
      subject: 'Your OTP Code',
      html: `<p>Your password reset OTP is: <b>${otp}</b></p>`
    });

    console.log(`[FORGOT-PASSWORD] Gửi OTP ${otp} đến ${gmail}`);
    return redirect(res, '/verify-otp', `email=${encodeURIComponent(gmail)}`);
  } catch (err) {
    console.error('[FORGOT-PASSWORD] ❌ Lỗi:', err?.message || err);
    return redirect(res, '/forgot-password', 'error=server');
  }
});

// ── Verify OTP ─────────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    let { gmail, otp } = req.body || {};
    gmail = (gmail || '').toLowerCase().trim();

    const user = await User.findOne({ gmail });
    if (!user) {
      console.log('[VERIFY-OTP] ❌ Không tìm thấy user:', gmail);
      return redirect(res, '/verify-otp', `error=invalid&email=${encodeURIComponent(gmail)}`);
    }
    if (user.resetOTP !== otp) {
      console.log('[VERIFY-OTP] ❌ OTP KHÔNG KHỚP cho', gmail);
      return redirect(res, '/verify-otp', `error=invalid&email=${encodeURIComponent(gmail)}`);
    }
    if (user.resetOTPExpiry < Date.now()) {
      console.log('[VERIFY-OTP] ❌ OTP HẾT HẠN cho', gmail);
      return redirect(res, '/verify-otp', `error=invalid&email=${encodeURIComponent(gmail)}`);
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 giờ
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    await user.save();

    console.log('[VERIFY-OTP] ✅ Thành công cho', gmail, 'Token:', token);
    return redirect(res, '/reset-password', `token=${token}`);
  } catch (err) {
    console.error('[VERIFY-OTP] ❌ Lỗi:', err?.message || err);
    return redirect(res, '/verify-otp', 'error=server');
  }
});

// ── Reset password ────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (!password || password !== confirmPassword) {
      console.log('[RESET-PASSWORD] ❌ Không khớp mật khẩu. Token:', token);
      return redirect(res, '/reset-password', `token=${encodeURIComponent(token || '')}&error=nomatch`);
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });
    if (!user) {
      console.log('[RESET-PASSWORD] ❌ Token invalid/expired:', token);
      return redirect(res, '/reset-password', 'error=invalid_token');
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    console.log('[RESET-PASSWORD] ✅ Đổi mật khẩu cho', user.userName);
    return redirect(res, '/login', 'reset=success');
  } catch (err) {
    console.error('[RESET-PASSWORD] ❌ Lỗi:', err?.message || err);
    return redirect(res, '/reset-password', 'error=server');
  }
});

module.exports = router;
