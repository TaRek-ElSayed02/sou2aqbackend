const jwt = require('jsonwebtoken');

const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this-too',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};

class JWTService {
  // إنشاء توكن الوصول
  generateAccessToken(payload) {
    return jwt.sign(payload, JWT_CONFIG.secret, {
      expiresIn: JWT_CONFIG.expiresIn,
      issuer: 'SOU2AQ-API',
      audience: 'SOU2AQ-Users'
    });
  }

  // إنشاء توكن التحديث
  generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_CONFIG.refreshSecret, {
      expiresIn: JWT_CONFIG.refreshExpiresIn,
      issuer: 'SOU2AQ-API',
      audience: 'SOU2AQ-Users'
    });
  }

  // التحقق من توكن الوصول
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_CONFIG.secret);
    } catch (error) {
      throw new Error('توكن غير صالح أو منتهي الصلاحية');
    }
  }

  // التحقق من توكن التحديث
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, JWT_CONFIG.refreshSecret);
    } catch (error) {
      throw new Error('توكن التحديث غير صالح');
    }
  }

  // فك تشفير التوكن بدون التحقق (لمعلومات فقط)
  decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = new JWTService();