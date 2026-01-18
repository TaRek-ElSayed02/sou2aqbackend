const multer = require('multer');
const path = require('path');
const fs = require('fs');

// المسار الكامل لمجلد التحميل
const uploadPath = path.join(__dirname, '../../uploads/blogImages');

console.log('📁 Blog upload path:', uploadPath);

// إنشاء الفولدر لو مش موجود
if (!fs.existsSync(uploadPath)) {
  console.log('📁 Creating blog upload directory...');
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
    const uniqueName = 
      Date.now() + 
      '-' + 
      Math.round(Math.random() * 1e9) + 
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

  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const mimetypeValid = allowedTypes.test(file.mimetype);
  const extnameValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (!mimetypeValid || !extnameValid) {
    console.log('❌ File type rejected:', file.mimetype);
    const error = new Error(
      'Only image files are allowed (jpeg, jpg, png, webp, gif)'
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

// معالجة أخطاء multer
const uploadBlogImage = (req, res, next) => {
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
    
    // متابعة إلى الميدلوير التالي
    next();
  });
};

// دالة مساعدة لحذف الصور
exports.deleteUploadedImage = (filename) => {
  if (!filename) return;
  
  const filePath = path.join(uploadPath, filename);
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

exports.uploadBlogImage = uploadBlogImage;