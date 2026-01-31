const db = require('../config/database');

// ========== SERVICE FUNCTIONS ==========

// إنشاء خريطة جديدة
exports.createMap = async (mapData, userId, userRole) => {
  console.log('🗺️ Creating map with data:', mapData);
  console.log('👤 User:', { userId, role: userRole });
  
  // التحقق من أن الموقع موجود وأن المستخدم مالكه أو سوبر أدمن
  const siteCheck = await this.checkSiteOwnership(mapData.siteId, userId, userRole);
  if (!siteCheck.allowed) {
    throw new Error(siteCheck.message);
  }
  
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  
  const sql = `
    INSERT INTO maps (
      id, siteId, url, address, phone, email, periodOpen,
       createdAt, modifiedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  
  const values = [
    id,
    mapData.siteId,
    mapData.url || null,
    mapData.address || null,
    mapData.phone || null,
    mapData.email || null,
    mapData.periodOpen || null
  ];
  
  console.log('📊 SQL Values for map:', values);
  
  try {
    const [result] = await db.query(sql, values);
    console.log('✅ Map created successfully, ID:', id);
    
    // جلب الخريطة المنشأة
    const newMap = await this.getMapById(id);
    return newMap;
    
  } catch (error) {
    console.error('❌ Error creating map:', error);
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new Error('Site not found');
    }
    
    throw new Error(error.message || 'Database error');
  }
};

// الحصول على خريطة بواسطة ID
exports.getMapById = async (id) => {
  const sql = 'SELECT * FROM maps WHERE id = ?';
  try {
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting map by ID:', error);
    throw error;
  }
};

// الحصول على جميع خرائط موقع معين (عام)
exports.getMapsBySiteIdPublic = async (siteId) => {
  const sql = `
    SELECT * FROM maps 
    WHERE siteId = ? AND isActive = 'yes'
    ORDER BY createdAt DESC
  `;
  try {
    const [rows] = await db.query(sql, [siteId]);
    return rows;
  } catch (error) {
    console.error('Error getting maps by site ID (public):', error);
    throw error;
  }
};

// الحصول على جميع خرائط موقع معين (مع الصلاحيات)
exports.getMapsBySiteId = async (siteId, userId, userRole) => {
  console.log('🔍 Getting maps for site:', { siteId, userId, userRole });
  
  // التحقق من الملكية
  const siteCheck = await this.checkSiteOwnership(siteId, userId, userRole);
  if (!siteCheck.allowed && userRole !== 'superAdmin') {
    throw new Error(siteCheck.message);
  }
  
  let sql = 'SELECT * FROM maps WHERE siteId = ? ORDER BY createdAt DESC';
  const params = [siteId];
  
  // إذا كان يوزر عادي (ليس صاحب الموقع ولا سوبر أدمن)، يعرض فقط النشطة
  if (!siteCheck.allowed && userRole !== 'superAdmin') {
    sql = 'SELECT * FROM maps WHERE siteId = ? AND isActive = "yes" ORDER BY createdAt DESC';
  }
  
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (error) {
    console.error('Error getting maps by site ID:', error);
    throw error;
  }
};

// تحديث خريطة
exports.updateMap = async (id, updateData, userId, userRole) => {
  console.log('🔄 Updating map:', id, 'with data:', updateData);
  
  // التحقق من أن الخريطة موجودة
  const existingMap = await this.getMapById(id);
  if (!existingMap) {
    throw new Error('Map not found');
  }
  
  // التحقق من ملكية الموقع
  const siteCheck = await this.checkSiteOwnership(existingMap.siteId, userId, userRole);
  if (!siteCheck.allowed) {
    throw new Error(siteCheck.message);
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
  
  const sql = `UPDATE maps SET ${fields.join(', ')} WHERE id = ?`;
  
  console.log('📝 Update SQL:', sql);
  console.log('📊 Update values:', values);
  
  try {
    const [result] = await db.query(sql, values);
    console.log('✅ Map updated, affected rows:', result.affectedRows);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating map:', error);
    throw error;
  }
};

// حذف خريطة
exports.deleteMap = async (id, userId, userRole) => {
  console.log('🗑️ Deleting map:', id);
  
  // التحقق من أن الخريطة موجودة
  const existingMap = await this.getMapById(id);
  if (!existingMap) {
    throw new Error('Map not found');
  }
  
  // التحقق من ملكية الموقع
  const siteCheck = await this.checkSiteOwnership(existingMap.siteId, userId, userRole);
  if (!siteCheck.allowed) {
    throw new Error(siteCheck.message);
  }
  
  const sql = 'DELETE FROM maps WHERE id = ?';
  
  try {
    const [result] = await db.query(sql, [id]);
    console.log('✅ Map deleted, affected rows:', result.affectedRows);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting map:', error);
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

// دالة لتفعيل/تعطيل خريطة
exports.toggleMapActivation = async (id, isActive, userId, userRole) => {
  const sql = 'UPDATE maps SET isActive = ?, modifiedAt = NOW() WHERE id = ?';
  
  // التحقق من الملكية
  const existingMap = await this.getMapById(id);
  if (!existingMap) {
    throw new Error('Map not found');
  }
  
  const siteCheck = await this.checkSiteOwnership(existingMap.siteId, userId, userRole);
  if (!siteCheck.allowed) {
    throw new Error(siteCheck.message);
  }
  
  try {
    const [result] = await db.query(sql, [isActive, id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error toggling map activation:', error);
    throw error;
  }
};