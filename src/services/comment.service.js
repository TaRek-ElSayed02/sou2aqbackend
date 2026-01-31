const db = require('../config/database');

// ========== SERVICE FUNCTIONS ==========

// إنشاء تعليق جديد
exports.createComment = async (commentData, userId, userRole) => {
  console.log('💬 Creating comment with data:', commentData);
  console.log('👤 User:', { userId, role: userRole });
  
  // التحقق من أن الموقع موجود
  const siteCheck = await this.checkSiteExists(commentData.siteId);
  if (!siteCheck) {
    throw new Error('Site not found');
  }
  
  // التحقق من أن التقييم صحيح (1-5)
  if (commentData.rate && (commentData.rate < 1 || commentData.rate > 5)) {
    throw new Error('Rate must be between 1 and 5');
  }
  
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  
  const sql = `
    INSERT INTO comments (
      id, siteId, comment, rate, customerName, createdAt, modifiedAt
    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `;
  
  const values = [
    id,
    commentData.siteId,
    commentData.comment || null,
    commentData.rate || null,
    commentData.customerName || null
  ];
  
  console.log('📊 SQL Values for comment:', values);
  
  try {
    const [result] = await db.query(sql, values);
    console.log('✅ Comment created successfully, ID:', id);
    
    // جلب التعليق المنشأ
    const newComment = await this.getCommentById(id);
    return newComment;
    
  } catch (error) {
    console.error('❌ Error creating comment:', error);
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new Error('Site not found');
    }
    
    throw new Error(error.message || 'Database error');
  }
};

// الحصول على تعليق بواسطة ID
exports.getCommentById = async (id) => {
  const sql = 'SELECT * FROM comments WHERE id = ?';
  try {
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting comment by ID:', error);
    throw error;
  }
};

// الحصول على جميع التعليقات لموقع معين (عام)
exports.getCommentsBySiteIdPublic = async (siteId) => {
  const sql = `
    SELECT * FROM comments 
    WHERE siteId = ?
    ORDER BY createdAt DESC
  `;
  try {
    const [rows] = await db.query(sql, [siteId]);
    return rows;
  } catch (error) {
    console.error('Error getting comments by site ID (public):', error);
    throw error;
  }
};

// الحصول على جميع التعليقات لموقع معين (مع الصلاحيات)
exports.getCommentsBySiteId = async (siteId, userId, userRole) => {
  console.log('🔍 Getting comments for site:', { siteId, userId, userRole });
  
  // التحقق من الملكية (صاحب الموقع أو سوبر أدمن فقط)
  const siteCheck = await this.checkSiteOwnership(siteId, userId, userRole);
  if (!siteCheck.allowed && userRole !== 'superAdmin') {
    throw new Error(siteCheck.message);
  }
  
  const sql = 'SELECT * FROM comments WHERE siteId = ? ORDER BY createdAt DESC';
  const params = [siteId];
  
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (error) {
    console.error('Error getting comments by site ID:', error);
    throw error;
  }
};

// تحديث تعليق
exports.updateComment = async (id, updateData, userId, userRole) => {
  console.log('🔄 Updating comment:', id, 'with data:', updateData);
  
  // التحقق من أن التعليق موجود
  const existingComment = await this.getCommentById(id);
  if (!existingComment) {
    throw new Error('Comment not found');
  }
  
  // التحقق من الصلاحيات
  const permissionCheck = await this.checkCommentPermission(existingComment, userId, userRole);
  if (!permissionCheck.allowed) {
    throw new Error(permissionCheck.message);
  }
  
  // التحقق من أن التقييم صحيح (1-5)
  if (updateData.rate && (updateData.rate < 1 || updateData.rate > 5)) {
    throw new Error('Rate must be between 1 and 5');
  }
  
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
  
  const sql = `UPDATE comments SET ${fields.join(', ')} WHERE id = ?`;
  
  console.log('📝 Update SQL:', sql);
  console.log('📊 Update values:', values);
  
  try {
    const [result] = await db.query(sql, values);
    console.log('✅ Comment updated, affected rows:', result.affectedRows);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
};

// حذف تعليق
exports.deleteComment = async (id, userId, userRole) => {
  console.log('🗑️ Deleting comment:', id);
  
  // التحقق من أن التعليق موجود
  const existingComment = await this.getCommentById(id);
  if (!existingComment) {
    throw new Error('Comment not found');
  }
  
  // التحقق من الصلاحيات
  const permissionCheck = await this.checkCommentPermission(existingComment, userId, userRole);
  if (!permissionCheck.allowed) {
    throw new Error(permissionCheck.message);
  }
  
  const sql = 'DELETE FROM comments WHERE id = ?';
  
  try {
    const [result] = await db.query(sql, [id]);
    console.log('✅ Comment deleted, affected rows:', result.affectedRows);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

// التحقق من وجود الموقع
exports.checkSiteExists = async (siteId) => {
  const sql = 'SELECT id FROM site WHERE id = ?';
  try {
    const [rows] = await db.query(sql, [siteId]);
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking site existence:', error);
    throw error;
  }
};

// التحقق من ملكية الموقع
exports.checkSiteOwnership = async (siteId, userId, userRole) => {
  console.log('🔐 Checking site ownership:', { siteId, userId, userRole });
  
  // السوبر أدمن له صلاحية على كل شيء
  if (userRole === 'superAdmin') {
    return { allowed: true, message: 'SuperAdmin access granted' };
  }
  
  try {
    // جلب الموقع للتحقق من الملكية
    const sql = 'SELECT user_id FROM site WHERE id = ?';
    const [rows] = await db.query(sql, [siteId]);
    
    if (rows.length === 0) {
      return { allowed: false, message: 'Site not found' };
    }
    
    const siteOwnerId = rows[0].user_id;
    
    if (siteOwnerId === userId) {
      return { allowed: true, message: 'Site owner access granted' };
    } else {
      return { allowed: false, message: 'You do not own this site' };
    }
    
  } catch (error) {
    console.error('Error checking site ownership:', error);
    return { allowed: false, message: 'Error checking ownership' };
  }
};

// التحقق من صلاحيات التعليق
exports.checkCommentPermission = async (comment, userId, userRole) => {
  console.log('🔐 Checking comment permission:', { 
    commentId: comment.id, 
    userId, 
    userRole 
  });
  
  // السوبر أدمن له صلاحية على كل شيء
  if (userRole === 'superAdmin') {
    return { allowed: true, message: 'SuperAdmin access granted' };
  }
  
  // التحقق من ملكية الموقع
  const siteCheck = await this.checkSiteOwnership(comment.siteId, userId, userRole);
  if (siteCheck.allowed) {
    return { allowed: true, message: 'Site owner access granted' };
  }
  
  // للتعليقات، نحتاج طريقة للتحقق من ملكية التعليق
  // في هذا النظام البسيط، يمكننا إضافة حقل user_id للتعليقات
  // ولكن بما أن الجدول لا يحتوي على user_id، سنعتبر أن أي مستخدم مصدق يمكنه تعديل أي تعليق
  
  // في النظام الحالي: أي مستخدم مصدق يمكنه تعديل/حذف أي تعليق
  // (يمكن تعديل هذا لاحقاً إذا أضفنا user_id للجدول)
  
  return { allowed: true, message: 'Authenticated user access granted' };
};

// حساب متوسط التقييمات لموقع معين
exports.getAverageRating = async (siteId) => {
  const sql = `
    SELECT 
      COUNT(*) as totalComments,
      AVG(rate) as averageRating,
      SUM(CASE WHEN rate = 5 THEN 1 ELSE 0 END) as fiveStars,
      SUM(CASE WHEN rate = 4 THEN 1 ELSE 0 END) as fourStars,
      SUM(CASE WHEN rate = 3 THEN 1 ELSE 0 END) as threeStars,
      SUM(CASE WHEN rate = 2 THEN 1 ELSE 0 END) as twoStars,
      SUM(CASE WHEN rate = 1 THEN 1 ELSE 0 END) as oneStars
    FROM comments 
    WHERE siteId = ? AND rate IS NOT NULL
  `;
  
  try {
    const [rows] = await db.query(sql, [siteId]);
    const result = rows[0];
    
    if (result.totalComments === 0) {
      return {
        totalComments: 0,
        averageRating: 0,
        ratingBreakdown: { fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0 }
      };
    }
    
    return {
      totalComments: result.totalComments,
      averageRating: parseFloat(result.averageRating).toFixed(1),
      ratingBreakdown: {
        fiveStars: result.fiveStars,
        fourStars: result.fourStars,
        threeStars: result.threeStars,
        twoStars: result.twoStars,
        oneStars: result.oneStars
      }
    };
  } catch (error) {
    console.error('Error calculating average rating:', error);
    throw error;
  }
};