const registerService = require('../services/register.service');
const { sanitizeInput } = require('../utils/security');
const path = require('path');
const fs = require('fs');

class RegisterController {
  constructor() {
    this.register = this.register.bind(this);
    this.verifyEmail = this.verifyEmail.bind(this);
    this.updateOTP = this.updateOTP.bind(this);
  }
  async register(req, res) {
    try {
      // تنظيف المدخلات
      const cleanedData = {
        fullName: sanitizeInput(req.body.fullName),
        userName: sanitizeInput(req.body.userName),
        email: sanitizeInput(req.body.email),
        password: req.body.password,
        DoB: req.body.DoB,
        phone: sanitizeInput(req.body.phone),
        role: 'user',
        isActive: 'no'
      };

      // إضافة مسار الصورة إذا تم رفعها
      if (req.file) {
        cleanedData.profileImage = `/uploads/profileImages/${req.file.filename}`;
      }

      // إنشاء المستخدم
      const userData = await registerService.createUser(cleanedData);

      // إعادة البيانات بشكل منظم
      const responseData = {
        user: {
          id: userData.id,
          personalInfo: {
            fullName: userData.fullName,
            userName: userData.userName,
            email: userData.email,
            phone: userData.phone,
            dateOfBirth: userData.DoB,
            age: this.calculateAge(userData.DoB)
          },
          accountInfo: {
            role: userData.role,
            status: userData.isActive === 'yes' ? 'yes' : 'no',
            profileImage: userData.profileImage || 'لا توجد صورة',
            emailVerified: !!userData.emailVerifiedAt
          },
          dates: {
            createdAt: userData.createdAt,
            emailVerifiedAt: userData.emailVerifiedAt || 'لم يتم التحقق بعد'
          }
        },
        message: {
          ar: 'تم إنشاء الحساب بنجاح! تم إرسال كود التحقق إلى بريدك الإلكتروني',
          en: 'Account created successfully! Verification code sent to your email'
        },
        nextSteps: [
          'تحقق من بريدك الإلكتروني للحصول على كود التحقق',
          'أدخل كود التحقق في صفحة التحقق',
          'تفعيل الحساب لبدء الاستخدام'
        ],
        otpInfo: {
          validity: '90 ثانية',
          note: 'لم يتم إرسال الـ OTP في الاستجابة لأسباب أمنية'
        }
      };

      res.status(201).json({
        success: true,
        code: 201,
        data: responseData,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      });
    } catch (error) {
      // If a file was uploaded but registration failed, remove the uploaded file
      if (req.file) {
        const uploadedPath = path.join(process.cwd(), 'uploads', 'profileImages', req.file.filename);
        fs.unlink(uploadedPath, (err) => {
          if (err) console.warn('Failed to remove uploaded file after failed registration:', err.message || err);
        });
      }
      console.error('Registration error:', error);
      
      const errorResponse = {
        success: false,
        code: 400,
        error: {
          type: 'ValidationError',
          message: error.message,
          details: this.getErrorDetails(error.message)
        },
        suggestions: this.getErrorSuggestions(error.message),
        meta: {
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        }
      };
      
      res.status(400).json(errorResponse);
    }
  }

  async verifyEmail(req, res) {
    try {
      const { email, otp } = req.body || {};

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: {
            type: 'ValidationError',
            message: 'يجب إدخال البريد الإلكتروني وكود التحقق'
          }
        });
      }

      await registerService.verifyOTP(email, otp);

      const responseData = {
        verification: {
          status: 'verified',
          message: 'تم التحقق من البريد الإلكتروني بنجاح',
          email: email,
          verifiedAt: new Date().toISOString()
        },
        account: {
          nextStep: 'يمكنك الآن تسجيل الدخول إلى حسابك',
          features: [
            'الوصول الكامل إلى التطبيق',
            'إمكانية تحديث الملف الشخصي',
            'بدء التسوق والشراء'
          ]
        }
      };

      res.json({
        success: true,
        code: 200,
        data: responseData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId()
        }
      });
    } catch (error) {
      const errorResponse = {
        success: false,
        code: 400,
        error: {
          type: 'VerificationError',
          message: error.message,
          remainingAttempts: 3 // يمكنك إضافة منطق للمحاولات
        },
        suggestions: [
          'تأكد من صحة كود التحقق',
          'تحقق من تاريخ انتهاء الصلاحية',
          'اطلب إرسال كود جديد إذا انتهت صلاحية هذا الكود'
        ]
      };
      
      res.status(400).json(errorResponse);
    }
  }

  async updateOTP(req, res) {
    try {
      const userId = req.params.userId;
      const { newOTP } = req.body;

      if (!newOTP) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: { message: 'يرجى تقديم OTP جديد في الجسم (newOTP)' }
        });
      }

      await registerService.updateOTP(userId, newOTP);

      res.json({
        success: true,
        code: 200,
        message: 'تم تحديث كود التحقق (OTP) بنجاح',
        meta: { timestamp: new Date().toISOString(), requestId: this.generateRequestId() }
      });
    } catch (error) {
      console.error('Update OTP error:', error);
      res.status(400).json({
        success: false,
        code: 400,
        error: { message: error.message }
      });
    }
  }

  // دوال مساعدة
  calculateAge(dateString) {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getErrorDetails(errorMessage) {
    const details = {
      'موجود مسبقاً': 'البريد الإلكتروني أو اسم المستخدم مسجل بالفعل',
      'غير صالح': 'صيغة البيانات المدخلة غير صحيحة',
      '8 أحرف': 'كلمة المرور قصيرة جداً',
      '18 سنة': 'يجب أن يكون عمرك 18 سنة على الأقل',
      '10 إلى 15 رقم': 'رقم الهاتف غير صالح'
    };
    
    for (const [key, value] of Object.entries(details)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }
    
    return 'حدث خطأ في التحقق من البيانات';
  }

  getErrorSuggestions(errorMessage) {
    const suggestions = {
      'موجود مسبقاً': [
        'استخدم بريد إلكتروني مختلف',
        'استخدم اسم مستخدم مختلف',
        'جرب استعادة كلمة المرور إذا كنت تملك الحساب'
      ],
      'غير صالح': [
        'تأكد من صيغة البريد الإلكتروني (example@domain.com)',
        'تأكد من أن جميع الحقول مملوءة'
      ],
      '8 أحرف': [
        'استخدم 8 أحرف على الأقل',
        'أضف أرقاماً وحروفاً كبيرة',
        'استخدم رموزاً خاصة مثل @#$%'
      ],
      '18 سنة': [
        'يجب أن تكون بالغاً لاستخدام التطبيق',
        'تأكد من تاريخ الميلاد المدخل'
      ],
      '10 إلى 15 رقم': [
        'أدخل رقم هاتف صحيح',
        'تأكد من أن الرقم يحتوي على أرقام فقط',
        'لا تستخدم مسافات أو رموز'
      ]
    };
    
    for (const [key, value] of Object.entries(suggestions)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }
    
    return ['حاول مرة أخرى', 'تحقق من جميع الحقول', 'اتصل بالدعم الفني إذا استمرت المشكلة'];
  }
}

module.exports = new RegisterController();