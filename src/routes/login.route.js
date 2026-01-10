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
      const { 
        fullName, 
        userName, 
        email, 
        password, 
        DoB, 
        phone, 
        profileImage 
      } = req.body;
      
      const db = require('../../config/database');
      const bcrypt = require('bcrypt');
      const connection = await db.pool.getConnection();

      const updates = [];
      const values = [];
      const validationErrors = [];

      // 1. التحقق من صحة البيانات وإعداد التحديثات
      
      // fullName - الاسم الكامل
      if (fullName !== undefined) {
        const cleanedName = sanitizeInput(fullName);
        if (cleanedName.length < 2 || cleanedName.length > 100) {
          validationErrors.push('الاسم يجب أن يكون بين 2 و 100 حرف');
        } else {
          updates.push('fullName = ?');
          values.push(cleanedName);
        }
      }

      // userName - اسم المستخدم
      if (userName !== undefined) {
        const cleanedUsername = sanitizeInput(userName);
        // التحقق من أن اسم المستخدم فريد
        const [existingUser] = await connection.execute(
          'SELECT id FROM users WHERE userName = ? AND id != ?',
          [cleanedUsername, req.user.id]
        );
        
        if (existingUser.length > 0) {
          validationErrors.push('اسم المستخدم موجود مسبقاً');
        } else if (cleanedUsername.length < 3 || cleanedUsername.length > 50) {
          validationErrors.push('اسم المستخدم يجب أن يكون بين 3 و 50 حرف');
        } else if (!/^[a-zA-Z0-9_]+$/.test(cleanedUsername)) {
          validationErrors.push('اسم المستخدم يمكن أن يحتوي على حروف إنجليزية وأرقام وشرطة سفلية فقط');
        } else {
          updates.push('userName = ?');
          values.push(cleanedUsername);
        }
      }

      // email - البريد الإلكتروني
      if (email !== undefined) {
        const cleanedEmail = sanitizeInput(email);
        // التحقق من صحة البريد الإلكتروني
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(cleanedEmail)) {
          validationErrors.push('صيغة البريد الإلكتروني غير صالحة');
        } else {
          // التحقق من أن البريد فريد
          const [existingEmail] = await connection.execute(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [cleanedEmail, req.user.id]
          );
          
          if (existingEmail.length > 0) {
            validationErrors.push('البريد الإلكتروني مستخدم بالفعل');
          } else {
            updates.push('email = ?, emailVerifiedAt = NULL');
            values.push(cleanedEmail);
            // ملاحظة: عند تغيير البريد، يجب إعادة التحقق
          }
        }
      }

      // password - كلمة المرور
      if (password !== undefined) {
        const cleanedPassword = sanitizeInput(password);
        if (cleanedPassword.length < 8) {
          validationErrors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        } else {
          // تشفير الباسورد
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(cleanedPassword, saltRounds);
          
          updates.push('password = ?');
          values.push(hashedPassword);
        }
      }

      // DoB - تاريخ الميلاد
      if (DoB !== undefined) {
        const cleanedDoB = sanitizeInput(DoB);
        // التحقق من صحة التاريخ
        const dobDate = new Date(cleanedDoB);
        const currentDate = new Date();
        
        if (isNaN(dobDate.getTime())) {
          validationErrors.push('تاريخ الميلاد غير صالح');
        } else if (dobDate > currentDate) {
          validationErrors.push('تاريخ الميلاد لا يمكن أن يكون في المستقبل');
        } else {
          // حساب العمر (اختياري)
          const age = currentDate.getFullYear() - dobDate.getFullYear();
          if (age < 13) {
            validationErrors.push('يجب أن يكون عمرك 13 سنة على الأقل');
          } else {
            updates.push('DoB = ?');
            values.push(cleanedDoB);
          }
        }
      }

      // phone - رقم الهاتف
      if (phone !== undefined) {
        const cleanedPhone = sanitizeInput(phone);
        // تنظيف رقم الهاتف (إزالة المسافات والإشارات)
        const cleanedPhoneNumber = cleanedPhone.replace(/[^\d+]/g, '');
        
        if (cleanedPhoneNumber.length < 10 || cleanedPhoneNumber.length > 15) {
          validationErrors.push('رقم الهاتف يجب أن يكون بين 10 و 15 رقم');
        } else {
          // التحقق من أن الرقم فريد
          const [existingPhone] = await connection.execute(
            'SELECT id FROM users WHERE phone = ? AND id != ?',
            [cleanedPhoneNumber, req.user.id]
          );
          
          if (existingPhone.length > 0) {
            validationErrors.push('رقم الهاتف مستخدم بالفعل');
          } else {
            updates.push('phone = ?');
            values.push(cleanedPhoneNumber);
          }
        }
      }

      // profileImage - صورة الملف الشخصي
      if (profileImage !== undefined) {
        const cleanedImage = sanitizeInput(profileImage);
        // التحقق من أن الرابط صالح (اختياري)
        const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
        
        if (!urlRegex.test(cleanedImage) && cleanedImage !== '') {
          validationErrors.push('رابط الصورة غير صالح');
        } else {
          updates.push('profileImage = ?');
          values.push(cleanedImage || null);
        }
      }

      // 2. التحقق من وجود أخطاء في البيانات
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: {
            type: 'ValidationError',
            messages: validationErrors
          }
        });
      }

      // 3. التحقق من وجود تحديثات
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: {
            type: 'ValidationError',
            message: 'لا توجد بيانات صالحة لتحديثها'
          }
        });
      }

      // 4. إضافة معرف المستخدم وتنفيذ التحديث
      values.push(req.user.id);

      await connection.execute(
        `UPDATE users 
         SET ${updates.join(', ')}, modifiedAt = NOW() 
         WHERE id = ?`,
        values
      );

      connection.release();

      // 5. إرجاع الاستجابة الناجحة
      res.status(200).json({
        success: true,
        code: 200,
        message: 'تم تحديث البيانات بنجاح',
        data: {
          updatedFields: updates.map(u => {
            // استخراج اسم الحقل فقط
            const match = u.match(/^([a-zA-Z]+)/);
            return match ? match[1] : u;
          }),
          notes: email ? 'تم تغيير البريد الإلكتروني، يرجى التحقق منه' : null,
          updatedAt: new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: 'req_' + Date.now()
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      
      // معالجة أخطاء قاعدة البيانات
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          code: 409,
          error: {
            type: 'DuplicateError',
            message: 'بعض البيانات مستخدمة مسبقاً من قبل مستخدم آخر'
          }
        });
      }

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