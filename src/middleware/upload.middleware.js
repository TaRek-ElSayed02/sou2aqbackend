// middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إنشاء مجلد التخزين إذا لم يكن موجوداً
const uploadDir = 'uploads/profileImages';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// إعداد multer للتخزين
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // اسم الملف: userId + timestamp + extension
    const userId = req.user?.userName || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${userId}${ext}`;
    cb(null, filename);
  }
});

// فلترة الملفات المسموح بها
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// إنشاء middleware الرفع
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 5MB max
  fileFilter: fileFilter
});

// Middleware لرفع صورة واحدة باسم 'profileImage'
exports.uploadProfileImage = upload.single('profileImage');

// Helper function لحذف الصورة القديمة
exports.deleteOldImage = (imagePath) => {
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      fs.unlinkSync(imagePath);
      console.log(`Deleted old image: ${imagePath}`);
    } catch (error) {
      console.error(`Error deleting old image: ${error.message}`);
    }
  }
};

// Helper function لبناء URL الصورة
exports.getImageUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/profileImages/${filename}`;
};