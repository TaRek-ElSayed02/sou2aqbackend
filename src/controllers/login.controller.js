const loginService = require('../services/login.service');
const { sanitizeInput } = require('../utils/security');

class LoginController {
  constructor() {
    this.login = this.login.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.logout = this.logout.bind(this);
    this.logoutAll = this.logoutAll.bind(this);
    this.getActiveSessions = this.getActiveSessions.bind(this);
  }

  async login(req, res) {
    try {
      const { identifier, password } = req.body;
      const deviceId = req.deviceId;

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: {
            type: 'ValidationError',
            message: 'يجب إدخال اسم المستخدم/البريد الإلكتروني وكلمة المرور'
          }
        });
      }

      // تنظيف المدخلات
      const cleanedIdentifier = sanitizeInput(identifier);

      // المصادقة
      const user = await loginService.authenticate(cleanedIdentifier, password);

      // إنشاء التوكنات
      const tokens = await loginService.generateTokens(user, deviceId);

      // الحصول على بيانات الملف الشخصي
      const userProfile = await loginService.getUserProfile(user.id);

      // بناء الرد المنظم
      const responseData = {
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
            status: userProfile.isActive === 'yes' ? 'yes' : 'no',
            profileImage: userProfile.profileImage || null,
            emailVerified: !!userProfile.emailVerifiedAt,
            lastLogin: userProfile.lastLogin
          }
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer'
        },
        session: {
          deviceId: deviceId,
          note: 'تم تسجيل الخروج من جميع الأجهزة الأخرى تلقائياً'
        },
        meta: {
          loginTime: new Date().toISOString()
        }
      };

      res.status(200).json({
        success: true,
        code: 200,
        message: 'تم تسجيل الدخول بنجاح',
        data: responseData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
          version: '1.0.0'
        }
      });
    } catch (error) {
      console.error('Login error:', error);

      const errorResponse = {
        success: false,
        code: 400,
        error: {
          type: 'AuthenticationError',
          message: error.message,
          details: this.getErrorDetails(error.message)
        },
        suggestions: this.getErrorSuggestions(error.message),
        meta: {
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        }
      };

      // إذا كان الحساب مغلقاً
      if (error.message.includes('مغلق مؤقتاً')) {
        errorResponse.code = 423; // Locked
      }

      res.status(errorResponse.code).json(errorResponse);
    }
  }

  async refreshToken(req, res) {
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

      const tokens = await loginService.refreshAccessToken(refreshToken, deviceId);

      res.status(200).json({
        success: true,
        code: 200,
        data: {
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId()
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);

      res.status(403).json({
        success: false,
        code: 403,
        error: {
          type: 'TokenError',
          message: error.message
        }
      });
    }
  }

  async logout(req, res) {
    try {
      const userId = req.user?.id;
      const deviceId = req.body.deviceId || req.deviceId;

      if (!userId || !deviceId) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: {
            type: 'ValidationError',
            message: 'معرف المستخدم والجهاز مطلوبان'
          }
        });
      }

      await loginService.logout(userId, deviceId);

      res.status(200).json({
        success: true,
        code: 200,
        message: 'تم تسجيل الخروج بنجاح',
        data: {
          logoutTime: new Date().toISOString(),
          deviceId: deviceId
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId()
        }
      });
    } catch (error) {
      console.error('Logout error:', error);

      res.status(500).json({
        success: false,
        code: 500,
        error: {
          type: 'ServerError',
          message: 'حدث خطأ أثناء تسجيل الخروج'
        }
      });
    }
  }

  async logoutAll(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: {
            type: 'ValidationError',
            message: 'معرف المستخدم مطلوب'
          }
        });
      }

      await loginService.logoutAllDevices(userId);

      res.status(200).json({
        success: true,
        code: 200,
        message: 'تم تسجيل الخروج من جميع الأجهزة بنجاح',
        data: {
          logoutTime: new Date().toISOString(),
          devicesLoggedOut: 'all'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId()
        }
      });
    } catch (error) {
      console.error('Logout all error:', error);

      res.status(500).json({
        success: false,
        code: 500,
        error: {
          type: 'ServerError',
          message: 'حدث خطأ أثناء تسجيل الخروج من جميع الأجهزة'
        }
      });
    }
  }

  async getActiveSessions(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: {
            type: 'ValidationError',
            message: 'معرف المستخدم مطلوب'
          }
        });
      }

      const sessions = await loginService.getUserSessions(userId);

      res.status(200).json({
        success: true,
        code: 200,
        data: {
          activeSessions: sessions,
          totalSessions: sessions.length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId()
        }
      });
    } catch (error) {
      console.error('Get sessions error:', error);

      res.status(500).json({
        success: false,
        code: 500,
        error: {
          type: 'ServerError',
          message: 'حدث خطأ أثناء جلب الجلسات'
        }
      });
    }
  }

  // دوال مساعدة
  generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getErrorDetails(errorMessage) {
    const details = {
      'غير موجود': 'المستخدم غير مسجل في النظام',
      'غير صحيحة': 'كلمة المرور المدخلة غير صحيحة',
      'غير مفعل': 'الحساب غير مفعل. يرجى التحقق من بريدك الإلكتروني',
      'مغلق مؤقتاً': 'تم تجاوز عدد المحاولات المسموح بها',
      'يجب التحقق': 'يجب التحقق من البريد الإلكتروني أولاً'
    };

    for (const [key, value] of Object.entries(details)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }

    return 'فشل في عملية المصادقة';
  }

  getErrorSuggestions(errorMessage) {
    const suggestions = {
      'غير موجود': [
        'تأكد من صحة اسم المستخدم أو البريد الإلكتروني',
        'إذا كنت جديداً، قم بالتسجيل أولاً',
        'تحقق من وجود أخطاء إملائية'
      ],
      'غير صحيحة': [
        'تأكد من صحة كلمة المرور',
        'جرب استعادة كلمة المرور إذا نسيتها',
        'تحقق من حالة Caps Lock'
      ],
      'غير مفعل': [
        'تحقق من بريدك الإلكتروني للتفعيل',
        'اطلب إعادة إرسال بريد التفعيل',
        'اتصل بالدعم الفني إذا لم تستلم البريد'
      ],
      'مغلق مؤقتاً': [
        'انتظر 15 دقيقة ثم حاول مرة أخرى',
        'استخدم خاصية استعادة كلمة المرور',
        'اتصل بالدعم الفني إذا استمرت المشكلة'
      ],
      'يجب التحقق': [
        'قم بالتحقق من بريدك الإلكتروني أولاً',
        'اطلب إعادة إرسال كود التحقق',
        'تحقق من مجلد البريد العشوائي (Spam)'
      ]
    };

    for (const [key, value] of Object.entries(suggestions)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }

    return ['حاول مرة أخرى', 'تحقق من البيانات المدخلة', 'اتصل بالدعم الفني إذا استمرت المشكلة'];
  }
}

module.exports = new LoginController();