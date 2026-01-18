const blogService = require('../services/blog.service');
const fs = require('fs');
const path = require('path');
const { deleteUploadedImage } = require('../middleware/blogUpload.middleware');

exports.createBlog = async (req, res, next) => {
  try {
    console.log('=== 📤 DEBUG UPLOAD START ===');
    console.log('📋 Request body keys:', Object.keys(req.body));
    console.log('📁 Has file?', !!req.file);
    console.log('📁 File details:', req.file);
    console.log('📦 Full body:', req.body);
    console.log('=== 📤 DEBUG UPLOAD END ===');

    // تحقق من البيانات المطلوبة
    if (!req.body.title || !req.body.content) {
      // إذا كان هناك ملف مرفوع، قم بحذفه
      if (req.file) {
        deleteUploadedImage(req.file.filename);
      }
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    let imagePath = null;
    
    // معالجة الصورة إذا كانت موجودة
    if (req.file) {
      imagePath = `/uploads/blogImages/${req.file.filename}`;
      
      // التحقق من وجود الملف فعلياً
      const fullPath = path.join(__dirname, '../..', 'uploads', 'blogImages', req.file.filename);
      console.log('📁 Checking file at:', fullPath);
      
      if (fs.existsSync(fullPath)) {
        console.log('✅ File exists on server');
        const stats = fs.statSync(fullPath);
        console.log('📊 File size:', stats.size, 'bytes');
      } else {
        console.error('❌ File NOT FOUND on server');
        // حاول إعادة إنشاء المجلد
        const uploadDir = path.join(__dirname, '../..', 'uploads', 'blogImages');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
          console.log('📁 Recreated upload directory');
        }
      }
    }

    const blogData = {
      title: req.body.title,
      content: req.body.content,
      image: imagePath,
      description: req.body.description || null,
      url: req.body.url || null,
      category: req.body.category || null,
      imgAlt: req.body.imgAlt || null,
      tags: req.body.tags || null,
      author: req.body.author || null
    };

    console.log('📝 Blog data to save:', blogData);

    const blog = await blogService.createBlog(blogData);

    console.log('✅ Blog created successfully, ID:', blog.id);

    res.status(201).json({
      success: true,
      data: blog,
      message: 'Blog created successfully'
    });
  } catch (error) {
    console.error('❌ Error in createBlog controller:', error);
    
    // إذا كان هناك ملف مرفوع وفشلت العملية، قم بحذفه
    if (req.file) {
      deleteUploadedImage(req.file.filename);
    }
    
    next(error);
  }
};

exports.getAllBlogs = async (req, res, next) => {
  try {
    const blogs = await blogService.getAllBlogs();
    res.status(200).json({ 
      success: true, 
      count: blogs.length,
      data: blogs 
    });
  } catch (error) {
    console.error('❌ Error in getAllBlogs:', error);
    next(error);
  }
};

exports.getBlogById = async (req, res, next) => {
  try {
    const blog = await blogService.getBlogById(req.params.id);
    res.status(200).json({ 
      success: true, 
      data: blog 
    });
  } catch (error) {
    console.error('❌ Error in getBlogById:', error);
    next(error);
  }
};

exports.updateBlog = async (req, res, next) => {
  try {
    console.log('=== 🔄 UPDATE DEBUG ===');
    console.log('Has new file?', !!req.file);
    console.log('Update data:', req.body);
    
    const updatedData = { ...req.body };
    
    // إذا كان هناك صورة جديدة
    if (req.file) {
      const newImagePath = `/uploads/blogImages/${req.file.filename}`;
      updatedData.image = newImagePath;
      
      // حذف الصورة القديمة
      await blogService.deleteOldImage(req.params.id, newImagePath);
      
      console.log('🖼️ New image path:', newImagePath);
    }

    const blog = await blogService.updateBlog(req.params.id, updatedData);

    res.status(200).json({
      success: true,
      data: blog,
      message: 'Blog updated successfully'
    });
  } catch (error) {
    console.error('❌ Error in updateBlog:', error);
    
    // إذا كان هناك ملف جديد وفشلت العملية، قم بحذفه
    if (req.file) {
      deleteUploadedImage(req.file.filename);
    }
    
    next(error);
  }
};

exports.deleteBlog = async (req, res, next) => {
  try {
    const result = await blogService.deleteBlog(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message || 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error in deleteBlog:', error);
    next(error);
  }
};