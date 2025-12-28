const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendOTPEmail(userEmail, userName, otp) {
    try {
      // تصميم HTML جميل للبريد الإلكتروني
      const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تأكيد البريد الإلكتروني</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                
                body {
                    background-color: #f5f7fa;
                    padding: 20px;
                }
                
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }
                
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 40px 20px;
                    text-align: center;
                    color: white;
                }
                
                .logo {
                    font-size: 32px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    letter-spacing: 1px;
                }
                
                .header h1 {
                    font-size: 24px;
                    margin-bottom: 10px;
                    font-weight: 600;
                }
                
                .content {
                    padding: 40px;
                    background-color: white;
                }
                
                .otp-box {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    color: white;
                    padding: 25px;
                    border-radius: 15px;
                    text-align: center;
                    margin: 30px 0;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 10px;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                }
                
                .user-info {
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    border-right: 5px solid #667eea;
                }
                
                .info-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                }
                
                .info-item:last-child {
                    border-bottom: none;
                }
                
                .info-label {
                    color: #666;
                    font-weight: 600;
                }
                
                .info-value {
                    color: #333;
                    font-weight: 500;
                }
                
                .timer {
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 15px;
                    border-radius: 10px;
                    text-align: center;
                    margin: 20px 0;
                    font-size: 18px;
                }
                
                .steps {
                    margin: 30px 0;
                }
                
                .step {
                    display: flex;
                    align-items: center;
                    margin-bottom: 20px;
                    padding: 15px;
                    background-color: #f8f9fa;
                    border-radius: 10px;
                    transition: transform 0.3s;
                }
                
                .step:hover {
                    transform: translateX(-5px);
                }
                
                .step-number {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    margin-left: 15px;
                    flex-shrink: 0;
                }
                
                .step-text {
                    color: #333;
                }
                
                .footer {
                    text-align: center;
                    padding: 20px;
                    background-color: #f8f9fa;
                    color: #666;
                    font-size: 14px;
                    border-top: 1px solid #eee;
                }
                
                .warning {
                    background-color: #ffeaa7;
                    color: #856404;
                    padding: 15px;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: center;
                    font-weight: 600;
                }
                
                .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 30px;
                    font-weight: bold;
                    margin: 20px 0;
                    transition: transform 0.3s;
                }
                
                .button:hover {
                    transform: translateY(-3px);
                }
                
                @media (max-width: 600px) {
                    .content {
                        padding: 20px;
                    }
                    
                    .otp-box {
                        font-size: 24px;
                        letter-spacing: 5px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="logo">SOU2AQ</div>
                    <h1>أهلاً وسهلاً بك في تطبيق سوق</h1>
                    <p>نشكرك على انضمامك إلينا</p>
                </div>
                
                <div class="content">
                    <div class="user-info">
                        <div class="info-item">
                            <span class="info-label">اسم المستخدم:</span>
                            <span class="info-value">${userName}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">البريد الإلكتروني:</span>
                            <span class="info-value">${userEmail}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">تاريخ التسجيل:</span>
                            <span class="info-value">${new Date().toLocaleString('ar-EG')}</span>
                        </div>
                    </div>
                    
                    <p style="text-align: center; color: #666; line-height: 1.6; margin: 20px 0;">
                        لتفعيل حسابك، يرجى استخدام كود التحقق المكون من 6 خانات أدناه
                    </p>
                    
                    <div class="otp-box">
                        ${otp}
                    </div>
                    
                    <div class="timer">
                        ⏰ هذا الكود صالح لمدة <strong>90 ثانية</strong> فقط
                    </div>
                    
                    <div class="steps">
                        <div class="step">
                            <div class="step-number">1</div>
                            <div class="step-text">انتقل إلى صفحة التحقق من البريد</div>
                        </div>
                        <div class="step">
                            <div class="step-number">2</div>
                            <div class="step-text">أدخل كود التحقق أعلاه</div>
                        </div>
                        <div class="step">
                            <div class="step-number">3</div>
                            <div class="step-text">استمتع بجميع مزايا التطبيق</div>
                        </div>
                    </div>
                    
                    <div class="warning">
                        ⚠️ الرجاء عدم مشاركة هذا الكود مع أي شخص
                    </div>
                    
                    <p style="text-align: center; color: #666; font-size: 14px;">
                        إذا لم تطلب هذا البريد، يمكنك تجاهله بأمان
                    </p>
                </div>
                
                <div class="footer">
                    <p>© ${new Date().getFullYear()} SOU2AQ App. جميع الحقوق محفوظة</p>
                    <p>هذا البريد تم إرساله تلقائياً، الرجاء عدم الرد عليه</p>
                </div>
            </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"SOU2AQ App" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '🔐 كود التحقق من البريد الإلكتروني - تطبيق سوق',
        html: htmlTemplate,
        text: `كود التحقق: ${otp}\nصالح لمدة 90 ثانية`
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 تم إرسال البريد إلى:', userEmail);
      return info;
    } catch (error) {
      console.error('❌ خطأ في إرسال البريد:', error);
      throw new Error('فشل إرسال البريد الإلكتروني');
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    // يمكنك إضافة بريد ترحيبي بعد التحقق
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>مرحباً بك</title>
          <style>
              /* تصميم مشابه للقالب السابق */
          </style>
      </head>
      <body>
          <!-- تصميم بريد ترحيبي -->
      </body>
      </html>
    `;

    // ... رمز إرسال البريد الترحيبي
  }
}

module.exports = new EmailService();