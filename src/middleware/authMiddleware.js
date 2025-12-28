const jwtService = require('../config/jwt');
const sessionManager = require('../config/sessions');

const authMiddleware = {
  // التحقق من توكن الوصول
  authenticateToken: async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          code: 401,
          error: {
            type: 'AuthenticationError',
            message: 'مطلوب توكن للمصادقة'
          }
        });
      }

      const decoded = jwtService.verifyAccessToken(token);
      
      // تخزين بيانات المستخدم في الطلب
      req.user = {
        id: decoded.id,
        email: decoded.email,
        userName: decoded.userName,
        role: decoded.role
      };

      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        code: 403,
        error: {
          type: 'TokenError',
          message: error.message || 'توكن غير صالح'
        }
      });
    }
  },

  // التحقق من دور المستخدم
  authorizeRole: (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          code: 401,
          error: { message: 'غير مصرح به' }
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          code: 403,
          error: {
            type: 'AuthorizationError',
            message: 'ليس لديك صلاحيات للقيام بهذا الإجراء'
          }
        });
      }

      next();
    };
  },

  // التحقق من الجلسة وتوكن التحديث
  authenticateRefreshToken: async (req, res, next) => {
    try {
      const { refreshToken, deviceId } = req.body;

      if (!refreshToken || !deviceId) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: {
            type: 'ValidationError',
            message: 'مطلوب refreshToken و deviceId'
          }
        });
      }

      const decoded = jwtService.verifyRefreshToken(refreshToken);
      
      // التحقق من وجود الجلسة في قاعدة البيانات
      const isValidSession = await sessionManager.validateSession(
        decoded.id,
        deviceId,
        refreshToken
      );

      if (!isValidSession) {
        return res.status(403).json({
          success: false,
          code: 403,
          error: {
            type: 'SessionError',
            message: 'الجلسة غير صالحة أو منتهية'
          }
        });
      }

      req.user = {
        id: decoded.id,
        deviceId: deviceId
      };

      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        code: 403,
        error: {
          type: 'TokenError',
          message: error.message || 'توكن التحديث غير صالح'
        }
      });
    }
  },

  // توليد معرف الجهاز
  generateDeviceId: (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress;
    
    // إنشاء معرف فريد للجهاز
    const deviceHash = require('crypto')
      .createHash('md5')
      .update(userAgent + ip)
      .digest('hex');

    req.deviceId = deviceHash;
    req.userAgent = userAgent;
    req.ipAddress = ip;
    
    next();
  }
};

module.exports = authMiddleware;