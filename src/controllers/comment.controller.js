const commentService = require('../services/comment.service');

// إنشاء تعليق جديد
exports.createComment = async (req, res) => {
  try {
    console.log('🚀 Starting comment creation process...');
    console.log('📦 Request body:', req.body);
    console.log('👤 User from token:', req.user);
    
    // التأكد من وجود req.body
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: 'Request body is required'
      });
    }
    
    // التحقق من البيانات المطلوبة
    const requiredFields = ['siteId', 'comment', 'customerName'];
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!req.body[field] || req.body[field].trim() === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // التحقق من وجود الموقع
    const siteExists = await commentService.checkSiteExists(req.body.siteId);
    if (!siteExists) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    // التحقق من أن التقييم صحيح إذا كان موجوداً
    if (req.body.rate) {
      const rate = parseInt(req.body.rate);
      if (isNaN(rate) || rate < 1 || rate > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rate must be a number between 1 and 5'
        });
      }
    }
    
    // إعداد بيانات التعليق
    const commentData = {
      siteId: req.body.siteId.trim(),
      comment: req.body.comment.trim(),
      rate: req.body.rate ? parseInt(req.body.rate) : null,
      customerName: req.body.customerName.trim()
    };
    
    console.log('📄 Final comment data to insert:', commentData);
    
    // إنشاء التعليق
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;
    const newComment = await commentService.createComment(commentData, userId, userRole);
    
    console.log('🎉 Comment created successfully:', newComment);
    
    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: newComment
    });
    
  } catch (error) {
    console.error('❌ Error creating comment:', error);
    
    const statusCode = error.message.includes('not found') || 
                      error.message.includes('Rate must be') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error creating comment',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// الحصول على تعليق بواسطة ID
exports.getCommentById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Getting comment by ID:', id);
    
    const comment = await commentService.getCommentById(id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    console.log('✅ Comment found');
    
    res.json({
      success: true,
      data: comment
    });
    
  } catch (error) {
    console.error('❌ Error getting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting comment'
    });
  }
};

// الحصول على التعليقات لموقع معين (عام)
exports.getCommentsBySiteIdPublic = async (req, res) => {
  try {
    const { siteId } = req.params;
    console.log('🔍 Getting public comments for site:', siteId);
    
    const comments = await commentService.getCommentsBySiteIdPublic(siteId);
    
    console.log(`📊 Found ${comments.length} public comments`);
    
    res.json({
      success: true,
      count: comments.length,
      data: comments
    });
    
  } catch (error) {
    console.error('❌ Error getting public comments:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting comments'
    });
  }
};

// الحصول على التعليقات لموقع معين (مصادقة)
exports.getCommentsBySiteId = async (req, res) => {
  try {
    const { siteId } = req.params;
    console.log('🔍 Getting comments for site (auth):', siteId);
    console.log('👤 User:', req.user);
    
    const comments = await commentService.getCommentsBySiteId(siteId, req.user.id, req.user.role);
    
    console.log(`📊 Found ${comments.length} comments`);
    
    res.json({
      success: true,
      count: comments.length,
      data: comments
    });
    
  } catch (error) {
    console.error('❌ Error getting comments:', error);
    
    const statusCode = error.message.includes('do not own') ? 403 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error getting comments'
    });
  }
};

// تحديث تعليق
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Updating comment:', id);
    console.log('📦 Update data:', req.body);
    console.log('👤 User:', req.user);
    
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }
    
    // التحقق من أن التقييم صحيح إذا كان موجوداً
    if (req.body.rate) {
      const rate = parseInt(req.body.rate);
      if (isNaN(rate) || rate < 1 || rate > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rate must be a number between 1 and 5'
        });
      }
      req.body.rate = rate;
    }
    
    // تنظيف البيانات - إزالة الحقول الفارغة
    const updateData = { ...req.body };
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === null) {
        delete updateData[key];
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data provided for update'
      });
    }
    
    console.log('📤 Final update data:', updateData);
    
    // التحديث
    const updated = await commentService.updateComment(id, updateData, req.user.id, req.user.role);
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update comment'
      });
    }
    
    // جلب البيانات المحدثة
    const updatedComment = await commentService.getCommentById(id);
    
    console.log('✅ Comment updated successfully');
    
    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment
    });
    
  } catch (error) {
    console.error('❌ Error updating comment:', error);
    
    const statusCode = error.message.includes('not found') || 
                      error.message.includes('do not own') || 
                      error.message.includes('Rate must be') ? 
                      (error.message.includes('not found') ? 404 : 400) : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error updating comment'
    });
  }
};

// حذف تعليق
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting comment:', id);
    console.log('👤 User:', req.user);
    
    // الحذف
    const deleted = await commentService.deleteComment(id, req.user.id, req.user.role);
    
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete comment'
      });
    }
    
    console.log('✅ Comment deleted successfully');
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting comment:', error);
    
    const statusCode = error.message.includes('not found') || 
                      error.message.includes('do not own') ? 
                      (error.message.includes('not found') ? 404 : 403) : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error deleting comment'
    });
  }
};

// الحصول على متوسط التقييمات لموقع
exports.getAverageRating = async (req, res) => {
  try {
    const { siteId } = req.params;
    console.log('⭐ Getting average rating for site:', siteId);
    
    const ratingStats = await commentService.getAverageRating(siteId);
    
    console.log('✅ Rating stats calculated:', ratingStats);
    
    res.json({
      success: true,
      data: ratingStats
    });
    
  } catch (error) {
    console.error('❌ Error getting average rating:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting rating statistics'
    });
  }
};