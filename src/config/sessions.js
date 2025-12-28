const db = require('./database');

class SessionManager {
  constructor() {
    this.sessions = new Map(); // تخزين مؤقت للجلسات النشطة
  }

  // إنشاء جلسة جديدة
  async createSession(userId, deviceId, refreshToken) {
    const connection = await db.pool.getConnection();
    try {
      // حذف الجلسات القديمة لنفس المستخدم على أجهزة أخرى
      await connection.execute(
        'DELETE FROM user_sessions WHERE user_id = ? AND device_id != ?',
        [userId, deviceId]
      );

      // حذف الجلسات المنتهية
      await connection.execute(
        'DELETE FROM user_sessions WHERE expires_at < NOW()'
      );

      // إدخال الجلسة الجديدة
      await connection.execute(
        `INSERT INTO user_sessions 
        (id, user_id, device_id, refresh_token, user_agent, ip_address, expires_at, created_at) 
        VALUES (UUID(), ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
        [userId, deviceId, refreshToken, '', '']
      );

      // تخزين في الذاكرة للوصول السريع
      this.sessions.set(`${userId}_${deviceId}`, {
        userId,
        deviceId,
        refreshToken,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // التحقق من صحة الجلسة
  async validateSession(userId, deviceId, refreshToken) {
    const connection = await db.pool.getConnection();
    try {
      const [sessions] = await connection.execute(
        `SELECT * FROM user_sessions 
         WHERE user_id = ? AND device_id = ? AND refresh_token = ? 
         AND expires_at > NOW() AND is_revoked = 0`,
        [userId, deviceId, refreshToken]
      );

      return sessions.length > 0;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // إلغاء جميع جلسات المستخدم ما عدا الجهاز الحالي
  async revokeOtherSessions(userId, currentDeviceId) {
    const connection = await db.pool.getConnection();
    try {
      await connection.execute(
        'UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ? AND device_id != ?',
        [userId, currentDeviceId]
      );

      // حذف من الذاكرة
      for (const [key, session] of this.sessions.entries()) {
        if (session.userId === userId && session.deviceId !== currentDeviceId) {
          this.sessions.delete(key);
        }
      }

      return true;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // تسجيل الخروج (حذف جلسة محددة)
  async logout(userId, deviceId) {
    const connection = await db.pool.getConnection();
    try {
      await connection.execute(
        'DELETE FROM user_sessions WHERE user_id = ? AND device_id = ?',
        [userId, deviceId]
      );

      // حذف من الذاكرة
      this.sessions.delete(`${userId}_${deviceId}`);

      return true;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // تسجيل الخروج من جميع الأجهزة
  async logoutAllDevices(userId) {
    const connection = await db.pool.getConnection();
    try {
      await connection.execute(
        'DELETE FROM user_sessions WHERE user_id = ?',
        [userId]
      );

      // حذف جميع جلسات المستخدم من الذاكرة
      for (const [key, session] of this.sessions.entries()) {
        if (session.userId === userId) {
          this.sessions.delete(key);
        }
      }

      return true;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // الحصول على جميع جلسات المستخدم النشطة
  async getUserSessions(userId) {
    const connection = await db.pool.getConnection();
    try {
      const [sessions] = await connection.execute(
        `SELECT 
          device_id as deviceId,
          user_agent as userAgent,
          ip_address as ipAddress,
          created_at as createdAt,
          expires_at as expiresAt
         FROM user_sessions 
         WHERE user_id = ? AND expires_at > NOW() AND is_revoked = 0
         ORDER BY created_at DESC`,
        [userId]
      );

      return sessions;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new SessionManager();