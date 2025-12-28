const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwtService = require('../config/jwt');
const sessionManager = require('../config/sessions');
const validator = require('../utils/validators');

class LoginService {
  async authenticate(identifier, password) {
    const connection = await db.pool.getConnection();
    try {
      // تحديد ما إذا كان المدخل هو email أو username
      const isEmail = validator.validateEmail(identifier);
      
      let query = '';
      let params = [];
      
      if (isEmail) {
        query = 'SELECT * FROM users WHERE email = ?';
        params = [identifier];
      } else {
        query = 'SELECT * FROM users WHERE userName = ?';
        params = [identifier];
      }

      const [users] = await connection.execute(query, params);

      if (users.length === 0) {
        throw new Error('المستخدم غير موجود');
      }

      const user = users[0];

      // التحقق من حالة الحساب
      if (user.isActive !== 'yes') {
        throw new Error('الحساب غير مفعل. يرجى التحقق من بريدك الإلكتروني أولاً');
      }

      if (user.emailVerifiedAt === null) {
        throw new Error('يجب التحقق من البريد الإلكتروني قبل تسجيل الدخول');
      }

      // التحقق من كلمة المرور
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      // تحديث modifiedAt فقط
      await connection.execute(
        'UPDATE users SET modifiedAt = NOW() WHERE id = ?',
        [user.id]
      );

      return user;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }



  async generateTokens(user, deviceId) {
    try {
      // بيانات التوكن
      const tokenPayload = {
        id: user.id,
        email: user.email,
        userName: user.userName,
        role: user.role,
        deviceId: deviceId
      };

      // إنشاء التوكنات
      const accessToken = jwtService.generateAccessToken(tokenPayload);
      const refreshToken = jwtService.generateRefreshToken(tokenPayload);

      // إنشاء جلسة جديدة مع إلغاء الجلسات الأخرى
      await sessionManager.createSession(user.id, deviceId, refreshToken);

      return {
        accessToken,
        refreshToken,
        expiresIn: 24 * 60 * 60 // 24 ساعة بالثواني
      };
    } catch (error) {
      throw error;
    }
  }

  async refreshAccessToken(refreshToken, deviceId) {
    try {
      // التحقق من توكن التحديث
      const decoded = jwtService.verifyRefreshToken(refreshToken);
      
      // التحقق من أن الجلسة لا تزال نشطة
      const isValid = await sessionManager.validateSession(
        decoded.id,
        deviceId,
        refreshToken
      );

      if (!isValid) {
        throw new Error('الجلسة غير صالحة');
      }

      // إنشاء توكن وصول جديد
      const newAccessToken = jwtService.generateAccessToken({
        id: decoded.id,
        email: decoded.email,
        userName: decoded.userName,
        role: decoded.role,
        deviceId: deviceId
      });

      return {
        accessToken: newAccessToken,
        expiresIn: 24 * 60 * 60
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserProfile(userId) {
    const connection = await db.pool.getConnection();
    try {
      const [users] = await connection.execute(
        `SELECT 
          id,
          fullName,
          userName,
          email,
          role,
          DATE_FORMAT(DoB, '%Y-%m-%d') as DoB,
          phone,
          isActive,
          profileImage,
          emailVerifiedAt,
          createdAt
         FROM users WHERE id = ?`,
        [userId]
      );

      if (users.length === 0) {
        throw new Error('المستخدم غير موجود');
      }

      return users[0];
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new LoginService();