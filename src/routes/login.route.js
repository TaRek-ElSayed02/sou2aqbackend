const express = require('express');
const router = express.Router();
const loginController = require('../controllers/login.controller');
const authMiddleware = require('../middleware/authMiddleware');

// تسجيل الدخول (مع توليد معرف الجهاز)
router.post(
  '/login',
  authMiddleware.generateDeviceId,
  loginController.login
);

// تحديث التوكن
router.post(
  '/refresh-token',
  authMiddleware.authenticateRefreshToken,
  loginController.refreshToken
);

// تسجيل الخروج (يحتاج توكن)
router.post(
  '/logout',
  authMiddleware.authenticateToken,
  loginController.logout
);

// تسجيل الخروج من جميع الأجهزة (يحتاج توكن)
router.post(
  '/logout-all',
  authMiddleware.authenticateToken,
  loginController.logoutAll
);

// الحصول على الجلسات النشطة (يحتاج توكن)
router.get(
  '/sessions',
  authMiddleware.authenticateToken,
  loginController.getActiveSessions
);

// الحصول على بيانات الملف الشخصي (يحتاج توكن)
router.get(
  '/profile',
  authMiddleware.authenticateToken,
  async (req, res) => {
    try {
      const loginService = require('../services/login.service');
      const userProfile = await loginService.getUserProfile(req.user.id);

      res.status(200).json({
        success: true,
        code: 200,
        data: {
          user: {
            id: userProfile.id,
            personalInfo: {
              fullName: userProfile.fullName,
              userName: userProfile.userName,
              email: userProfile.email,
              phone: userProfile.phone,
              dateOfBirth: userProfile.DoB
            },
            accountInfo: {
              role: userProfile.role,
              status: userProfile.isActive === 'yes' ? 'مفعل' : 'غير مفعل',
              profileImage: userProfile.profileImage || null,
              emailVerified: !!userProfile.emailVerifiedAt,
              lastLogin: userProfile.lastLogin,
              memberSince: userProfile.createdAt
            }
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: 'req_' + Date.now()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        code: 500,
        error: {
          type: 'ServerError',
          message: error.message
        }
      });
    }
  }
);

// تحديث بيانات المستخدم (يحتاج توكن)
router.put(
  '/profile',
  authMiddleware.authenticateToken,
  async (req, res) => {
    try {
      const { fullName, phone, DoB } = req.body;
      const db = require('../../config/database');
      const connection = await db.pool.getConnection();

      const updates = [];
      const values = [];

      if (fullName) {
        updates.push('fullName = ?');
        values.push(fullName);
      }

      if (phone) {
        updates.push('phone = ?');
        values.push(phone);
      }

      if (DoB) {
        updates.push('DoB = ?');
        values.push(DoB);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: {
            type: 'ValidationError',
            message: 'لا توجد بيانات لتحديثها'
          }
        });
      }

      values.push(req.user.id);

      await connection.execute(
        `UPDATE users SET ${updates.join(', ')}, modifiedAt = NOW() WHERE id = ?`,
        values
      );

      connection.release();

      res.status(200).json({
        success: true,
        code: 200,
        message: 'تم تحديث البيانات بنجاح',
        data: {
          updatedFields: updates.map(u => u.split(' = ')[0]),
          updatedAt: new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: 'req_' + Date.now()
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        code: 500,
        error: {
          type: 'ServerError',
          message: 'حدث خطأ أثناء تحديث البيانات'
        }
      });
    }
  }
);

module.exports = router;