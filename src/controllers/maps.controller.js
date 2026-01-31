const mapsService = require('../services/maps.service');

// إنشاء خريطة جديدة
exports.createMap = async (req, res) => {
  try {
    console.log('🚀 Starting map creation process...');
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
    const requiredFields = ['siteId'];
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
    const siteExists = await mapsService.checkSiteExists(req.body.siteId);
    if (!siteExists) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    // إعداد بيانات الخريطة
    const mapData = {
      siteId: req.body.siteId.trim(),
      name: req.body.name || null,
      url: req.body.url || null,
      address: req.body.address || null,
      phone: req.body.phone || null,
      email: req.body.email || null,
      periodOpen: req.body.periodOpen || null,
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null,
      isActive: req.body.isActive || 'yes'
    };
    
    console.log('📄 Final map data to insert:', mapData);
    
    // إنشاء الخريطة
    const newMap = await mapsService.createMap(mapData, req.user.id, req.user.role);
    
    console.log('🎉 Map created successfully:', newMap);
    
    res.status(201).json({
      success: true,
      message: 'Map created successfully',
      data: newMap
    });
    
  } catch (error) {
    console.error('❌ Error creating map:', error);
    
    const statusCode = error.message.includes('not found') || 
                      error.message.includes('do not own') ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error creating map',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// الحصول على خريطة بواسطة ID
exports.getMapById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Getting map by ID:', id);
    
    const map = await mapsService.getMapById(id);
    
    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'Map not found'
      });
    }
    
    // التحقق من أن الخريطة نشطة للعامة
    if (!req.user && map.isActive !== 'yes') {
      return res.status(404).json({
        success: false,
        message: 'Map not found'
      });
    }
    
    console.log('✅ Map found:', map.name || 'Unnamed map');
    
    res.json({
      success: true,
      data: map
    });
    
  } catch (error) {
    console.error('❌ Error getting map:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting map'
    });
  }
};

// الحصول على خرائط موقع معين (عام)
exports.getMapsBySiteIdPublic = async (req, res) => {
  try {
    const { siteId } = req.params;
    console.log('🔍 Getting public maps for site:', siteId);
    
    const maps = await mapsService.getMapsBySiteIdPublic(siteId);
    
    console.log(`📊 Found ${maps.length} public maps`);
    
    res.json({
      success: true,
      count: maps.length,
      data: maps
    });
    
  } catch (error) {
    console.error('❌ Error getting public maps:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting maps'
    });
  }
};

// الحصول على خرائط موقع معين (مصادقة)
exports.getMapsBySiteId = async (req, res) => {
  try {
    const { siteId } = req.params;
    console.log('🔍 Getting maps for site (auth):', siteId);
    console.log('👤 User:', req.user);
    
    const maps = await mapsService.getMapsBySiteId(siteId, req.user.id, req.user.role);
    
    console.log(`📊 Found ${maps.length} maps`);
    
    res.json({
      success: true,
      count: maps.length,
      data: maps
    });
    
  } catch (error) {
    console.error('❌ Error getting maps:', error);
    
    const statusCode = error.message.includes('do not own') ? 403 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error getting maps'
    });
  }
};

// تحديث خريطة
exports.updateMap = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Updating map:', id);
    console.log('📦 Update data:', req.body);
    console.log('👤 User:', req.user);
    
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
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
    const updated = await mapsService.updateMap(id, updateData, req.user.id, req.user.role);
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update map'
      });
    }
    
    // جلب البيانات المحدثة
    const updatedMap = await mapsService.getMapById(id);
    
    console.log('✅ Map updated successfully');
    
    res.json({
      success: true,
      message: 'Map updated successfully',
      data: updatedMap
    });
    
  } catch (error) {
    console.error('❌ Error updating map:', error);
    
    const statusCode = error.message.includes('not found') || 
                      error.message.includes('do not own') ? 
                      (error.message.includes('not found') ? 404 : 403) : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error updating map'
    });
  }
};

// حذف خريطة
exports.deleteMap = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting map:', id);
    console.log('👤 User:', req.user);
    
    // الحذف
    const deleted = await mapsService.deleteMap(id, req.user.id, req.user.role);
    
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete map'
      });
    }
    
    console.log('✅ Map deleted successfully');
    
    res.json({
      success: true,
      message: 'Map deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting map:', error);
    
    const statusCode = error.message.includes('not found') || 
                      error.message.includes('do not own') ? 
                      (error.message.includes('not found') ? 404 : 403) : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error deleting map'
    });
  }
};