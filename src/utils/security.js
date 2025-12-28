const crypto = require('crypto');

const security = {
  generateOTP: () => {
    // توليد 6 أحرف وأرقام عشوائية
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return otp;
  },

  generateSecureToken: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  },

  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/[<>"'`]/g, '')
      .trim();
  },

  isSuperAdmin: (role) => {
    return role === 'superAdmin';
  }
};

module.exports = security;