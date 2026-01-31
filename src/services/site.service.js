const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');

// المسار الكامل لمجلد رفع صور المواقع
const uploadPath = path.join(__dirname, '../../uploads/siteImages');

// إنشاء الفولدر لو مش موجود
const ensureUploadDirectory = () => {
  if (!fs.existsSync(uploadPath)) {
    console.log('📁 Creating site upload directory...');
    try {
      fs.mkdirSync(uploadPath, { recursive: true, mode: 0o755 });
      console.log('✅ Upload directory created successfully');
    } catch (err) {
      console.error('❌ Error creating upload directory:', err.message);
      throw err;
    }
  } else {
    console.log('✅ Upload directory already exists');
    
    // تحقق من صلاحيات الكتابة
    try {
      fs.accessSync(uploadPath, fs.constants.W_OK);
      console.log('✅ Upload directory is writable');
    } catch (err) {
      console.error('❌ Upload directory is not writable:', err.message);
      // حاول إصلاح الصلاحيات
      try {
        fs.chmodSync(uploadPath, 0o755);
        console.log('🔧 Fixed directory permissions to 755');
      } catch (chmodErr) {
        console.error('❌ Could not fix permissions:', chmodErr.message);
      }
    }
  }
};

ensureUploadDirectory();

// إعداد multer لرفع الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📁 Destination called for: ${file.originalname}`);
    
    // تحقق مرة أخرى من وجود المجلد
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // إنشاء اسم ملف فريد
    const siteName = req.body.name ? 
      req.body.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : 
      'site';
    
    const uniqueName = 
      siteName + 
      '-' + 
      Date.now() + 
      path.extname(file.originalname);
    
    console.log(`📁 Generated filename: ${uniqueName}`);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('🔍 Filtering file:', {
    name: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  const allowedTypes = /jpeg|jpg|png|webp|gif|svg/;
  const mimetypeValid = allowedTypes.test(file.mimetype);
  const extnameValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (!mimetypeValid || !extnameValid) {
    console.log('❌ File type rejected:', file.mimetype);
    const error = new Error(
      'Only image files are allowed (jpeg, jpg, png, webp, gif, svg)'
    );
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  console.log('✅ File type accepted');
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

// Middleware لرفع صورة الموقع
const uploadSiteImage = (req, res, next) => {
  console.log('🖼️ Starting image upload process...');
  
  const uploadSingle = upload.single('image');
  
  uploadSingle(req, res, function(err) {
    if (err) {
      console.error('❌ Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 10MB'
        });
      }
      
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`
        });
      }
      
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file'
      });
    }
    
    // إذا تم رفع صورة، احفظ رابطها في req
    if (req.file) {
      req.imageUrl = `/uploads/siteImages/${req.file.filename}`;
      console.log('📸 Image uploaded:', req.imageUrl);
    }
    
    next();
  });
};

exports.uploadSiteImage = uploadSiteImage;

// التحقق من أن المستخدم أدمن
exports.validateUserIsAdmin = (req, res, next) => {
  console.log('🔐 Validating user role:', req.user);
  
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User not authenticated'
    });
  }

  // التحقق من أن المستخدم أدمن أو سوبر أدمن
  if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Admin role required to create sites'
    });
  }

  console.log('✅ User is admin/superAdmin, proceeding with site creation');
  
  // إضافة user_id للبيانات
  req.body = req.body || {};
  req.body.user_id = req.user.id;
  console.log('✅ Added user_id to request:', req.body.user_id);
  
  next();
};

// دالة مساعدة لحذف الصور
exports.deleteUploadedImage = (filename) => {
  if (!filename) return;
  
  const filePath = path.join(uploadPath, path.basename(filename));
  console.log('🗑️ Attempting to delete file:', filePath);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log('✅ Successfully deleted file:', filename);
    } catch (err) {
      console.error('❌ Error deleting file:', err.message);
    }
  } else {
    console.log('⚠️ File not found for deletion:', filePath);
  }
};

// ========== SERVICE FUNCTIONS ==========

// إنشاء موقع جديد مع جميع البيانات
exports.createSite = async (siteData, userRole) => {
  console.log('📝 Creating site with data:', siteData);
  console.log('👤 User role:', userRole);
  
  // إنشاء ID فريد
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  
  const sql = `
    INSERT INTO site (
      id, name, image, imageAlt, description, phone, user_id, 
      about, whyUs, QandA, privacy_policy, termsOfUse, \`returning\`, 
      subdomain, email, isActive, createdAt, modifiedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  
  // الأدمن مايقدرش يخلي isActive = 'yes'
  let isActiveValue = siteData.isActive || 'no';
  if (userRole !== 'superAdmin') {
    isActiveValue = 'no'; // إجبار القيمة لـ 'no' لغير السوبر أدمن
    console.log('⚠️ Non-superAdmin user, forcing isActive to "no"');
  }
  
  const values = [
    id,
    siteData.name || null,
    siteData.image || null,
    siteData.imageAlt || null,
    siteData.description || null,
    siteData.phone || null,
    siteData.user_id, // مطلوب
    siteData.about || null,
    siteData.whyUs || null,
    siteData.QandA || null,
    siteData.privacy_policy || null,
    siteData.termsOfUse || null,
    siteData.returning || null,
    siteData.subdomain || null,
    siteData.email || null,
    isActiveValue
  ];
  
  console.log('📊 SQL Values to insert:', {
    id,
    name: siteData.name,
    user_id: siteData.user_id,
    subdomain: siteData.subdomain,
    isActive: isActiveValue
  });
  
  try {
    const [result] = await db.query(sql, values);
    console.log('✅ Site created successfully, ID:', id);
    
    // جلب الموقع المنشأ
    const newSite = await this.getSiteById(id);
    return newSite;
    
  } catch (error) {
    console.error('❌ Error creating site:', error);
    
    // تحسين رسائل الخطأ
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('Subdomain already exists');
    }
    
    throw new Error(error.message || 'Database error');
  }
};

// الحصول على موقع بواسطة ID
exports.getSiteById = async (id) => {
  const sql = 'SELECT * FROM site WHERE id = ?';
  try {
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting site by ID:', error);
    throw error;
  }
};

// الحصول على موقع بواسطة subdomain
exports.getSiteBySubdomain = async (subdomain) => {
  const sql = 'SELECT * FROM site WHERE subdomain = ? AND isActive = "yes"';
  try {
    const [rows] = await db.query(sql, [subdomain]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting site by subdomain:', error);
    throw error;
  }
};

// الحصول على جميع المواقع الخاصة بمستخدم
exports.getUserSites = async (userId) => {
  const sql = 'SELECT * FROM site WHERE user_id = ? ORDER BY createdAt DESC';
  try {
    const [rows] = await db.query(sql, [userId]);
    return rows;
  } catch (error) {
    console.error('Error getting user sites:', error);
    throw error;
  }
};

// الحصول على جميع المواقع
exports.getAllSites = async () => {
  const sql = 'SELECT * FROM site ORDER BY createdAt DESC';
  try {
    const [rows] = await db.query(sql);
    return rows;
  } catch (error) {
    console.error('Error getting all sites:', error);
    throw error;
  }
};

// تحديث موقع
exports.updateSite = async (id, updateData) => {
  console.log('🔄 Updating site:', id, 'with data:', updateData);
  
  // بناء الاستعلام الديناميكي
  const fields = [];
  const values = [];
  
  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined && updateData[key] !== null) {
      fields.push(`${key} = ?`);
      values.push(updateData[key]);
    }
  });
  
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }
  
  // إضافة modifiedAt
  fields.push('modifiedAt = NOW()');
  
  values.push(id);
  
  const sql = `UPDATE site SET ${fields.join(', ')} WHERE id = ?`;
  
  try {
    const [result] = await db.query(sql, values);
    console.log('✅ Site updated, affected rows:', result.affectedRows);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating site:', error);
    throw error;
  }
};

// حذف موقع
exports.deleteSite = async (id) => {
  const sql = 'DELETE FROM site WHERE id = ?';
  try {
    const [result] = await db.query(sql, [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting site:', error);
    throw error;
  }
};

// التحقق من صلاحية تغيير isActive
exports.validateIsActiveUpdate = (updateData, userRole, currentSite) => {
  console.log('🔍 Validating isActive update:', {
    updateData,
    userRole,
    currentIsActive: currentSite?.isActive
  });
  
  // إذا المستخدم مش سوبر أدمن
  if (userRole !== 'superAdmin') {
    // إذا كان يحاول تغيير isActive
    if ('isActive' in updateData) {
      console.log(`⚠️ Non-superAdmin user (${userRole}) trying to change isActive`);
      
      // نمنع التغيير ونحتفظ بالقيمة الأصلية
      if (currentSite) {
        updateData.isActive = currentSite.isActive;
      } else {
        delete updateData.isActive; // أو نمسح الحقل
      }
      
      return {
        allowed: false,
        message: 'Only superAdmin can change activation status',
        correctedData: updateData
      };
    }
  }
  
  return {
    allowed: true,
    correctedData: updateData
  };
};

// تفعيل/تعطيل الموقع (للسوبر أدمن فقط)
exports.toggleSiteActivation = async (siteId, isActive) => {
  const sql = 'UPDATE site SET isActive = ?, modifiedAt = NOW() WHERE id = ?';
  try {
    const [result] = await db.query(sql, [isActive, siteId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error toggling site activation:', error);
    throw error;
  }
};