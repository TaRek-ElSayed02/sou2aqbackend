const db = require('../config/database');
const bcrypt = require('bcrypt');
const { generateOTP } = require('../utils/security');
const validator = require('../utils/validators');
const emailService = require('../utils/emailService');

class RegisterService {
    async createUser(userData) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();

            // التحقق من وجود المستخدم مسبقاً
            const [existingUser] = await connection.execute(
                'SELECT id FROM users WHERE email = ? OR userName = ?',
                [userData.email, userData.userName]
            );

            if (existingUser.length > 0) {
                throw new Error('البريد الإلكتروني أو اسم المستخدم موجود مسبقاً');
            }

            // التحقق من صحة البيانات
            this.validateUserData(userData);

            // توليد ID فريد
            const { v4: uuidv4 } = require('uuid');
            const userId = uuidv4();

            // تشفير كلمة المرور
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

            // توليد OTP
            const emailOTP = generateOTP();
            const emailOTPExpiresAt = new Date(Date.now() + 90 * 1000);

            // إرسال البريد الإلكتروني
            try {
                await emailService.sendOTPEmail(userData.email, userData.userName, emailOTP);
            } catch (emailError) {
                console.warn('⚠️ تم حفظ المستخدم ولكن فشل إرسال البريد:', emailError.message);
                // يمكنك اختيار: throw emailError إذا أردت إيقاف العملية
            }

            // إدخال المستخدم في قاعدة البيانات
            const [result] = await connection.execute(
                `INSERT INTO users (
          id, fullName, userName, email, password, role, 
          DoB, phone, isActive, profileImage, 
          emailOTP, emailOTPExpiresAt, createdAt, modifiedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    userId,
                    userData.fullName,
                    userData.userName,
                    userData.email,
                    hashedPassword,
                    userData.role || 'user',
                    userData.DoB,
                    userData.phone,
                    'no',
                    userData.profileImage || null,
                    emailOTP,
                    emailOTPExpiresAt
                ]
            );

            await connection.commit();

            // جلب بيانات المستخدم لعرضها (بدون OTP)
            const [userDataResult] = await connection.execute(
                `SELECT 
          id, fullName, userName, email, role,
          DATE_FORMAT(DoB, '%Y-%m-%d') as DoB,
          phone, isActive, profileImage,
          emailVerifiedAt, createdAt
        FROM users WHERE id = ?`,
                [userId]
            );

            return userDataResult[0];
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    validateUserData(userData) {
        // التحقق من البريد الإلكتروني
        if (!validator.validateEmail(userData.email)) {
            throw new Error('البريد الإلكتروني غير صالح');
        }

        // التحقق من اسم المستخدم
        if (!validator.validateUsername(userData.userName)) {
            throw new Error('اسم المستخدم يجب أن يكون بين 3 و50 حرفاً ويحتوي على أحرف وأرقام وشرطة سفلية فقط');
        }

        // التحقق من كلمة المرور
        if (!validator.validatePassword(userData.password)) {
            throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        }

        // التحقق من تاريخ الميلاد
        if (!validator.validateDate(userData.DoB)) {
            throw new Error('تاريخ الميلاد غير صالح');
        }

        // التحقق من العمر (18 سنة على الأقل)
        const age = validator.calculateAge(userData.DoB);
        if (age < 18) {
            throw new Error('يجب أن يكون عمرك 18 سنة على الأقل');
        }

        // التحقق من رقم الهاتف
        if (!validator.validatePhone(userData.phone)) {
            throw new Error('رقم الهاتف يجب أن يتكون من 10 إلى 15 رقم');
        }

        // التأكد من أن role هو user فقط
        if (userData.role && !['user', 'admin'].includes(userData.role)) {
            userData.role = 'user'; // القيمة الافتراضية إذا كانت غير صحيحة
        }

        // التأكد من أن isActive هو no فقط
        if (userData.isActive && userData.isActive !== 'no') {
            userData.isActive = 'no';
        }

        return true;
    }

    async updateOTP(userId, newOTP) {
        // هذه الدالة يمكن استدعاؤها فقط من قبل superAdmin
        const connection = await db.pool.getConnection();
        try {
            const emailOTPExpiresAt = new Date(Date.now() + 90 * 1000);

            await connection.execute(
                'UPDATE users SET emailOTP = ?, emailOTPExpiresAt = ?, modifiedAt = NOW() WHERE id = ?',
                [newOTP, emailOTPExpiresAt, userId]
            );

            return true;
        } catch (error) {
            throw error;
        } finally {
            connection.release();
        }
    }

    async verifyOTP(email, otp) {
        const connection = await db.pool.getConnection();
        try {
            const [users] = await connection.execute(
                'SELECT emailOTP, emailOTPExpiresAt FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                throw new Error('المستخدم غير موجود');
            }

            const user = users[0];

            // التحقق من صلاحية OTP
            if (user.emailOTP !== otp) {
                throw new Error('كود التحقق غير صحيح');
            }

            if (new Date() > new Date(user.emailOTPExpiresAt)) {
                throw new Error('كود التحقق منتهي الصلاحية');
            }

            // تحديث حالة التحقق وتفعيل الحساب
            await connection.execute(
                'UPDATE users SET emailVerifiedAt = NOW(), isActive = ?, modifiedAt = NOW() WHERE email = ?',
                ['yes', email]
            );

            return true;
        } catch (error) {
            throw error;
        } finally {
            connection.release();
        }
    }

    async checkEmailExists(email) {
        const connection = await db.pool.getConnection();
        try {
            const [users] = await connection.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            return users.length > 0;
        } catch (error) {
            throw error;
        } finally {
            connection.release();
        }
    }

    async resendVerificationOTP(email) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();

            // التحقق من وجود المستخدم
            const [users] = await connection.execute(
                'SELECT id, userName FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                throw new Error('البريد الإلكتروني غير مسجل');
            }

            const user = users[0];

            // توليد OTP جديد
            const newOTP = generateOTP();
            const emailOTPExpiresAt = new Date(Date.now() + 90 * 1000);

            // تحديث OTP في قاعدة البيانات
            await connection.execute(
                'UPDATE users SET emailOTP = ?, emailOTPExpiresAt = ?, modifiedAt = NOW() WHERE id = ?',
                [newOTP, emailOTPExpiresAt, user.id]
            );

            // إرسال البريد الإلكتروني
            try {
                await emailService.sendOTPEmail(email, user.userName, newOTP);
            } catch (emailError) {
                console.warn('⚠️ فشل إرسال البريد لإعادة التحقق:', emailError.message);
                await connection.rollback();
                throw new Error('فشل إرسال كود التحقق. الرجاء المحاولة لاحقاً');
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = new RegisterService();