const socialService = require('../services/social.service');

// إنشاء سوشيال ميديا جديد
exports.createSocial = async (req, res) => {
  try {
    console.log('🚀 Starting social media creation process...');
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
    const requiredFields = ['siteId', 'name', 'link'];
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
    const siteExists = await socialService.checkSiteExists(req.body.siteId);
    if (!siteExists) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    // تنسيق الرابط
    const formattedLink = socialService.formatUrl(req.body.link);
    
    // إعداد بيانات السوشيال ميديا
    const socialData = {
      siteId: req.body.siteId.trim(),
      name: req.body.name.trim(),
      icon: req.body.icon || null,
      link: formattedLink
    };
    
    console.log('📄 Final social media data to insert:', socialData);
    
    // إنشاء السوشيال ميديا
    const newSocial = await socialService.createSocial(socialData, req.user.id, req.user.role);
    
    console.log('🎉 Social media created successfully:', newSocial);
    
    res.status(201).json({
      success: true,
      message: 'Social media created successfully',
      data: newSocial
    });
    
  } catch (error) {
    console.error('❌ Error creating social media:', error);
    
    const statusCode = error.message.includes('not found') || 
                      error.message.includes('do not own') || 
                      error.message.includes('Invalid') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error creating social media',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// الحصول على سوشيال ميديا بواسطة ID
exports.getSocialById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Getting social media by ID:', id);
    
    const social = await socialService.getSocialById(id);
    
    if (!social) {
      return res.status(404).json({
        success: false,
        message: 'Social media not found'
      });
    }
    
    console.log('✅ Social media found:', social.name);
    
    res.json({
      success: true,
      data: social
    });
    
  } catch (error) {
    console.error('❌ Error getting social media:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting social media'
    });
  }
};

// الحصول على السوشيال ميديا لموقع معين (عام)
exports.getSocialBySiteIdPublic = async (req, res) => {
  try {
    const { siteId } = req.params;
    console.log('🔍 Getting public social media for site:', siteId);
    
    const socials = await socialService.getSocialBySiteIdPublic(siteId);
    
    console.log(`📊 Found ${socials.length} public social media`);
    
    res.json({
      success: true,
      count: socials.length,
      data: socials
    });
    
  } catch (error) {
    console.error('❌ Error getting public social media:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting social media'
    });
  }
};

// الحصول على السوشيال ميديا لموقع معين (مصادقة)
exports.getSocialBySiteId = async (req, res) => {
  try {
    const { siteId } = req.params;
    console.log('🔍 Getting social media for site (auth):', siteId);
    console.log('👤 User:', req.user);
    
    const socials = await socialService.getSocialBySiteId(siteId, req.user.id, req.user.role);
    
    console.log(`📊 Found ${socials.length} social media`);
    
    res.json({
      success: true,
      count: socials.length,
      data: socials
    });
    
  } catch (error) {
    console.error('❌ Error getting social media:', error);
    
    const statusCode = error.message.includes('do not own') ? 403 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error getting social media'
    });
  }
};

// تحديث سوشيال ميديا
exports.updateSocial = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Updating social media:', id);
    console.log('📦 Update data:', req.body);
    console.log('👤 User:', req.user);
    
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }
    
    // تنسيق الرابط إذا كان موجوداً
    let updateData = { ...req.body };
    if (updateData.link) {
      updateData.link = socialService.formatUrl(updateData.link);
    }
    
    // تنظيف البيانات - إزالة الحقول الفارغة
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
    const updated = await socialService.updateSocial(id, updateData, req.user.id, req.user.role);
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update social media'
      });
    }
    
    // جلب البيانات المحدثة
    const updatedSocial = await socialService.getSocialById(id);
    
    console.log('✅ Social media updated successfully');
    
    res.json({
      success: true,
      message: 'Social media updated successfully',
      data: updatedSocial
    });
    
  } catch (error) {
    console.error('❌ Error updating social media:', error);
    
    const statusCode = error.message.includes('not found') || 
                      error.message.includes('do not own') || 
                      error.message.includes('Invalid') ? 
                      (error.message.includes('not found') ? 404 : 400) : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error updating social media'
    });
  }
};

// حذف سوشيال ميديا
exports.deleteSocial = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting social media:', id);
    console.log('👤 User:', req.user);
    
    // الحذف
    const deleted = await socialService.deleteSocial(id, req.user.id, req.user.role);
    
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete social media'
      });
    }
    
    console.log('✅ Social media deleted successfully');
    
    res.json({
      success: true,
      message: 'Social media deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting social media:', error);
    
    const statusCode = error.message.includes('not found') || 
                      error.message.includes('do not own') ? 
                      (error.message.includes('not found') ? 404 : 403) : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error deleting social media'
    });
  }
};