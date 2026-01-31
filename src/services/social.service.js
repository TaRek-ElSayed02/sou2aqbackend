const db = require('../config/database');

// ========== SERVICE FUNCTIONS ==========

// إنشاء سوشيال ميديا جديد
exports.createSocial = async (socialData, userId, userRole) => {
  console.log('📱 Creating social media with data:', socialData);
  console.log('👤 User:', { userId, role: userRole });
  
  // التحقق من أن الموقع موجود وأن المستخدم مالكه أو سوبر أدمن
  const siteCheck = await this.checkSiteOwnership(socialData.siteId, userId, userRole);
  if (!siteCheck.allowed) {
    throw new Error(siteCheck.message);
  }
  
  // التحقق من صحة رابط السوشيال ميديا
  if (socialData.link && !this.isValidUrl(socialData.link)) {
    throw new Error('Invalid social media URL');
  }
  
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  
  const sql = `
    INSERT INTO social_media (
      id, name, icon, link, siteId, createdAt, modifiedAt
    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `;
  
  const values = [
    id,
    socialData.name || null,
    socialData.icon || null,
    socialData.link || null,
    socialData.siteId
  ];
  
  console.log('📊 SQL Values for social media:', values);
  
  try {
    const [result] = await db.query(sql, values);
    console.log('✅ Social media created successfully, ID:', id);
    
    // جلب السوشيال ميديا المنشأ
    const newSocial = await this.getSocialById(id);
    return newSocial;
    
  } catch (error) {
    console.error('❌ Error creating social media:', error);
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new Error('Site not found');
    }
    
    throw new Error(error.message || 'Database error');
  }
};

// الحصول على سوشيال ميديا بواسطة ID
exports.getSocialById = async (id) => {
  const sql = 'SELECT * FROM social_media WHERE id = ?';
  try {
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting social media by ID:', error);
    throw error;
  }
};

// الحصول على جميع السوشيال ميديا لموقع معين (عام)
exports.getSocialBySiteIdPublic = async (siteId) => {
  const sql = `
    SELECT * FROM social_media 
    WHERE siteId = ?
    ORDER BY createdAt DESC
  `;
  try {
    const [rows] = await db.query(sql, [siteId]);
    return rows;
  } catch (error) {
    console.error('Error getting social media by site ID (public):', error);
    throw error;
  }
};

// الحصول على جميع السوشيال ميديا لموقع معين (مع الصلاحيات)
exports.getSocialBySiteId = async (siteId, userId, userRole) => {
  console.log('🔍 Getting social media for site:', { siteId, userId, userRole });
  
  // التحقق من الملكية
  const siteCheck = await this.checkSiteOwnership(siteId, userId, userRole);
  if (!siteCheck.allowed && userRole !== 'superAdmin') {
    throw new Error(siteCheck.message);
  }
  
  const sql = 'SELECT * FROM social_media WHERE siteId = ? ORDER BY createdAt DESC';
  const params = [siteId];
  
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (error) {
    console.error('Error getting social media by site ID:', error);
    throw error;
  }
};

// تحديث سوشيال ميديا
exports.updateSocial = async (id, updateData, userId, userRole) => {
  console.log('🔄 Updating social media:', id, 'with data:', updateData);
  
  // التحقق من أن السوشيال ميديا موجود
  const existingSocial = await this.getSocialById(id);
  if (!existingSocial) {
    throw new Error('Social media not found');
  }
  
  // التحقق من ملكية الموقع
  const siteCheck = await this.checkSiteOwnership(existingSocial.siteId, userId, userRole);
  if (!siteCheck.allowed) {
    throw new Error(siteCheck.message);
  }
  
  // التحقق من صحة الرابط إذا تم تحديثه
  if (updateData.link && !this.isValidUrl(updateData.link)) {
    throw new Error('Invalid social media URL');
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
  
  const sql = `UPDATE social_media SET ${fields.join(', ')} WHERE id = ?`;
  
  console.log('📝 Update SQL:', sql);
  console.log('📊 Update values:', values);
  
  try {
    const [result] = await db.query(sql, values);
    console.log('✅ Social media updated, affected rows:', result.affectedRows);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating social media:', error);
    throw error;
  }
};

// حذف سوشيال ميديا
exports.deleteSocial = async (id, userId, userRole) => {
  console.log('🗑️ Deleting social media:', id);
  
  // التحقق من أن السوشيال ميديا موجود
  const existingSocial = await this.getSocialById(id);
  if (!existingSocial) {
    throw new Error('Social media not found');
  }
  
  // التحقق من ملكية الموقع
  const siteCheck = await this.checkSiteOwnership(existingSocial.siteId, userId, userRole);
  if (!siteCheck.allowed) {
    throw new Error(siteCheck.message);
  }
  
  const sql = 'DELETE FROM social_media WHERE id = ?';
  
  try {
    const [result] = await db.query(sql, [id]);
    console.log('✅ Social media deleted, affected rows:', result.affectedRows);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting social media:', error);
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

// التحقق من صحة الرابط
exports.isValidUrl = (url) => {
  try {
    // التحقق من أن الرابط يحتوي على http أو https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

// تنسيق الرابط لإضافة https إذا لم يكن موجوداً
exports.formatUrl = (url) => {
  if (!url) return url;
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  
  return url;
};