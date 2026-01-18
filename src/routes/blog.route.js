const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { uploadBlogImage } = require('../middleware/blogUpload.middleware');
const { requireSuperAdmin } = require('../middleware/role.middleware');
const { requireAuth } = require('../middleware/auth.middleware');

// Validation middleware
const validateBlogData = (req, res, next) => {
  console.log('🔍 Validating blog data...');
  
  // في حالة multipart/form-data، البيانات تكون في req.body
  const { title, content, author, tags } = req.body;
  
  if (!title || !title.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Title is required' 
    });
  }
  
  if (!content || !content.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Content is required' 
    });
  }
  
  // تحقق من طول العنوان
  if (title.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Title must be at least 3 characters long'
    });
  }
  
  // تحقق من طول المحتوى
  if (content.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Content must be at least 10 characters long'
    });
  }
  
  // تحقق من أن tags إذا كانت موجودة فهي نص
  if (tags && typeof tags !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Tags must be a string' 
    });
  }
  
  // تحقق من أن author إذا كانت موجودة فهي نص
  if (author && typeof author !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Author must be a string' 
    });
  }
  
  console.log('✅ Blog data validation passed');
  next();
};

// إنشاء مقال جديد
router.post(
  '/',
  requireAuth,
  requireSuperAdmin,
  (req, res, next) => {
    console.log('=== 🚀 CREATE BLOG ROUTE START ===');
    console.log('Headers:', req.headers['content-type']);
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    next();
  },
  uploadBlogImage,
  validateBlogData,
  blogController.createBlog
);

// الحصول على جميع المقالات (عام)
router.get('/', blogController.getAllBlogs);

// الحصول على مقال بواسطة ID (عام)
router.get('/:id', blogController.getBlogById);

// تحديث مقال (تحديث جزئي) (للمشرفين فقط)
router.patch(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  uploadBlogImage,
  blogController.updateBlog
);

// حذف مقال (للمشرفين فقط)
router.delete(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  blogController.deleteBlog
);

module.exports = router;