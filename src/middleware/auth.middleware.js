//middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

exports.requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Token missing'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // نخزن بيانات المستخدم عشان اللي بعده يستخدمها
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid token'
    });
  }
};


exports.requireOwnershipOrSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  // السوبر أدمن عنده صلاحية لأي يوزر
  if (req.user.role === 'superAdmin') {
    return next();
  }

  // اليوزر العادي مسموح له يتعدل على نفسه بس
  const requestedUserId = req.params.id;
  const currentUserId = req.user.id.toString(); // تأكد من النوع

  if (requestedUserId !== currentUserId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only modify your own profile'
    });
  }

  next();
};

exports.requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  if (req.user.role !== 'superAdmin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: SuperAdmin only'
    });
  }

  next();
};


// أضف هذا بعد middleware requireSuperAdmin

exports.requireSiteOwnershipOrSuperAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  // السوبر أدمن عنده صلاحية لأي سايت
  if (req.user.role === 'superAdmin') {
    return next();
  }

  // جلب الموقع للتحقق من الملكية
  try {
    const db = require('../config/database');
    const [rows] = await db.query('SELECT user_id FROM site WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    const site = rows[0];
    const requestedUserId = site.user_id;
    const currentUserId = req.user.id.toString();

    if (requestedUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only modify your own sites'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking site ownership:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// أضف هذا في auth.middleware.js
exports.requireMapOwnershipOrSuperAdmin = async (req, res, next) => {
  console.log('🔐 Checking map ownership...');
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  // السوبر أدمن عنده صلاحية لأي شيء
  if (req.user.role === 'superAdmin') {
    console.log('👑 SuperAdmin bypasses ownership check');
    return next();
  }

  try {
    const db = require('../config/database');
    const mapId = req.params.id;

    // جلب الخريطة مع معلومات الموقع
    const [mapRows] = await db.query(`
      SELECT m.*, s.user_id as site_owner_id 
      FROM maps m
      JOIN site s ON m.siteId = s.id
      WHERE m.id = ?
    `, [mapId]);
    
    if (mapRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Map not found'
      });
    }

    const map = mapRows[0];
    const currentUserId = req.user.id;

    console.log(`🔍 Map ownership check - Site Owner: ${map.site_owner_id}, Current: ${currentUserId}`);
    
    if (map.site_owner_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only modify maps for your own sites'
      });
    }
    
    console.log('✅ User owns this site, can modify map');
    next();
    
  } catch (error) {
    console.error('❌ Error checking map ownership:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};