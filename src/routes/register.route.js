const express = require('express');
const router = express.Router();
const registerController = require('../controllers/register.controller');
const upload = require('../utils/imageUpload');
const auth = require('../middleware/auth');

// تسجيل مستخدم جديد (مع رفع صورة)
router.post(
  '/register',
  upload.single('profileImage'), // رفع صورة واحدة باسم profileImage
  registerController.register
);

// التحقق من البريد الإلكتروني
router.post('/verify-email', registerController.verifyEmail);

// تحديث OTP (للسوبر أدمن فقط)
router.post(
  '/update-otp/:userId',
  auth.checkSuperAdmin, // ميدل وير للتحقق من صلاحيات superAdmin
  registerController.updateOTP
);

module.exports = router;