// server/src/config.js
require('dotenv').config();
const mongoose = require('mongoose');

// Ưu tiên .env, fallback local dev
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_access';

// Tuỳ chọn khuyến nghị cho Mongoose 7+
mongoose.set('strictQuery', true);

(async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      // Các tuỳ chọn hiện không còn cần thiết như useNewUrlParser/useUnifiedTopology
      serverSelectionTimeoutMS: 5000, // fail nhanh nếu không bắt được server
    });
    console.log('✅ MongoDB connected:', MONGODB_URI);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
})();

// Log lỗi runtime
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB runtime error:', err.message);
});

// Đóng kết nối gọn khi process dừng
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed (SIGINT).');
  process.exit(0);
});

module.exports = mongoose; // CHỈ EXPORT mongoose
