const siteService = require('../services/site.service');

// إنشاء موقع جديد
exports.createSite = async (req, res) => {
  try {
    console.log('🚀 Starting site creation process...');
    console.log('📦 Request body:', req.body);
    console.log('👤 User from token:', req.user);
    console.log('📸 Image URL (if any):', req.imageUrl);
    
    // التأكد من وجود req.body
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: 'Request body is required'
      });
    }
    
    // التحقق من البيانات المطلوبة
    const requiredFields = ['name', 'subdomain'];
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
    
    // التحقق من أن user_id موجود
    if (!req.body.user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // إعداد بيانات الموقع
    const siteData = {
      name: req.body.name.trim(),
      subdomain: req.body.subdomain.trim().toLowerCase(),
      description: req.body.description || null,
      phone: req.body.phone || null,
      user_id: req.body.user_id,
      about: req.body.about || null,
      whyUs: req.body.whyUs || null,
      QandA: req.body.QandA || null,
      privacy_policy: req.body.privacy_policy || null,
      termsOfUse: req.body.termsOfUse || null,
      returning: req.body.returning || null,
      email: req.body.email || null,
      isActive: req.body.isActive || 'no',
      imageAlt: req.body.imageAlt || null
    };
    
    // إضافة رابط الصورة إذا تم رفعها
    if (req.imageUrl) {
      siteData.image = req.imageUrl;
      console.log('✅ Added image to site data:', req.imageUrl);
    }
    
    console.log('📄 Final site data to insert:', siteData);
    
    // التحقق من أن subdomain فريد
    const existingSite = await siteService.getSiteBySubdomain(siteData.subdomain);
    if (existingSite) {
      // حذف الصورة المرفوعة إذا كان هناك خطأ
      if (req.file) {
        siteService.deleteUploadedImage(req.file.filename);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Subdomain already exists'
      });
    }
    
    // إنشاء الموقع مع تمرير role اليوزر
    const newSite = await siteService.createSite(siteData, req.user.role);
    
    // إذا حاول الأدمن إدخال isActive = 'yes'، نرسل تحذير
    let warning = '';
    if (req.user.role !== 'superAdmin' && req.body.isActive === 'yes') {
      warning = 'Note: Only superAdmin can activate sites. Site is created as inactive.';
    }
    
    console.log('🎉 Site created successfully:', newSite);
    
    res.status(201).json({
      success: true,
      message: 'Site created successfully',
      warning: warning || undefined,
      data: newSite
    });
    
  } catch (error) {
    console.error('❌ Error creating site:', error);
    
    // حذف الصورة المرفوعة إذا كان هناك خطأ
    if (req.file) {
      siteService.deleteUploadedImage(req.file.filename);
    }
    
    const statusCode = error.message.includes('already exists') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error creating site',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// الحصول على موقع بواسطة ID
exports.getSiteById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Getting site by ID:', id);
    
    const site = await siteService.getSiteById(id);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    console.log('✅ Site found:', site.name);
    
    res.json({
      success: true,
      data: site
    });
    
  } catch (error) {
    console.error('❌ Error getting site:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting site'
    });
  }
};

// الحصول على موقع بواسطة subdomain (عام)
exports.getSiteBySubdomain = async (req, res) => {
  try {
    const { subdomain } = req.params;
    console.log('🔍 Getting site by subdomain:', subdomain);
    
    const site = await siteService.getSiteBySubdomain(subdomain);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found or not active'
      });
    }
    
    console.log('✅ Site found:', site.name);
    
    res.json({
      success: true,
      data: site
    });
    
  } catch (error) {
    console.error('❌ Error getting site by subdomain:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting site'
    });
  }
};

// الحصول على جميع المواقع (مع الصلاحيات)
exports.getSites = async (req, res) => {
  try {
    console.log('👤 User requesting sites:', req.user.id, req.user.role);
    
    let sites;
    
    // السوبر أدمن بيشوف كل المواقع
    if (req.user.role === 'superAdmin') {
      console.log('👑 SuperAdmin getting all sites');
      sites = await siteService.getAllSites();
    } 
    // الأدمن واليوزر بيشوفوا المواقع الخاصة بهم فقط
    else {
      console.log('👤 User getting their own sites');
      sites = await siteService.getUserSites(req.user.id);
    }
    
    console.log(`📊 Found ${sites.length} sites`);
    
    res.json({
      success: true,
      count: sites.length,
      data: sites
    });
    
  } catch (error) {
    console.error('❌ Error getting sites:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting sites'
    });
  }
};

// تحديث موقع
exports.updateSite = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 Updating site:', id);
    console.log('📦 Update data:', req.body);
    
    // التحقق من أن الموقع موجود
    const existingSite = await siteService.getSiteById(id);
    if (!existingSite) {
      // حذف الصورة المرفوعة إذا كان هناك خطأ
      if (req.file) {
        siteService.deleteUploadedImage(req.file.filename);
      }
      
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    console.log('📋 Existing site:', existingSite.name, 'Owner:', existingSite.user_id);
    
    // التحقق من الملكية (ما عدا السوبر أدمن)
    if (req.user.role !== 'superAdmin' && existingSite.user_id !== req.user.id) {
      // حذف الصورة المرفوعة إذا كان هناك خطأ
      if (req.file) {
        siteService.deleteUploadedImage(req.file.filename);
      }
      
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update your own sites'
      });
    }
    
    // التحقق من أن subdomain فريد (إذا تم تحديثه)
    if (req.body.subdomain && req.body.subdomain !== existingSite.subdomain) {
      const siteWithSubdomain = await siteService.getSiteBySubdomain(req.body.subdomain);
      if (siteWithSubdomain) {
        // حذف الصورة المرفوعة إذا كان هناك خطأ
        if (req.file) {
          siteService.deleteUploadedImage(req.file.filename);
        }
        
        return res.status(400).json({
          success: false,
          message: 'Subdomain already exists'
        });
      }
    }
    
    // التحقق من صلاحية تغيير isActive
    const validation = siteService.validateIsActiveUpdate(
      req.body, 
      req.user.role, 
      existingSite
    );
    
    let warning = '';
    if (!validation.allowed) {
      warning = validation.message;
    }
    
    // تجهيز البيانات للتحديث
    const updateData = { ...validation.correctedData };
    
    // تنظيف البيانات - إزالة الحقول الفارغة
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === null) {
        updateData[key] = null;
      }
    });
    
    // إضافة رابط الصورة الجديدة إذا تم رفعها
    if (req.imageUrl) {
      updateData.image = req.imageUrl;
      
      // حذف الصورة القديمة إذا كانت موجودة
      if (existingSite.image) {
        siteService.deleteUploadedImage(existingSite.image);
      }
    }
    
    console.log('📤 Final update data:', updateData);
    
    // التحديث
    const updated = await siteService.updateSite(id, updateData);
    
    if (!updated) {
      if (req.file) {
        siteService.deleteUploadedImage(req.file.filename);
      }
      return res.status(400).json({
        success: false,
        message: 'Failed to update site'
      });
    }
    
    // جلب البيانات المحدثة
    const updatedSite = await siteService.getSiteById(id);
    
    console.log('✅ Site updated successfully');
    
    res.json({
      success: true,
      message: 'Site updated successfully',
      warning: warning || undefined,
      data: updatedSite
    });
    
  } catch (error) {
    console.error('❌ Error updating site:', error);
    
    if (req.file) {
      siteService.deleteUploadedImage(req.file.filename);
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating site'
    });
  }
};

// حذف موقع
exports.deleteSite = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting site:', id);
    
    // التحقق من أن الموقع موجود
    const existingSite = await siteService.getSiteById(id);
    if (!existingSite) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    console.log('📋 Site to delete:', existingSite.name, 'Owner:', existingSite.user_id);
    
    // التحقق من الملكية (ما عدا السوبر أدمن)
    if (req.user.role !== 'superAdmin' && existingSite.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only delete your own sites'
      });
    }
    
    // حذف الصورة المرتبطة بالموقع إذا كانت موجودة
    if (existingSite.image) {
      siteService.deleteUploadedImage(existingSite.image);
    }
    
    // حذف الموقع
    const deleted = await siteService.deleteSite(id);
    
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete site'
      });
    }
    
    console.log('✅ Site deleted successfully');
    
    res.json({
      success: true,
      message: 'Site deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting site:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting site'
    });
  }
};

// تفعيل/تعطيل الموقع (superAdmin only)
exports.toggleSiteActivation = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    console.log('🔧 Toggling site activation:', { id, isActive });
    
    if (!['yes', 'no'].includes(isActive)) {
      return res.status(400).json({
        success: false,
        message: 'isActive must be either "yes" or "no"'
      });
    }
    
    // التحقق من أن الموقع موجود
    const existingSite = await siteService.getSiteById(id);
    if (!existingSite) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    console.log('📋 Site found:', existingSite.name);
    
    // التحديث
    const updated = await siteService.toggleSiteActivation(id, isActive);
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update site activation'
      });
    }
    
    // جلب البيانات المحدثة
    const updatedSite = await siteService.getSiteById(id);
    
    console.log('✅ Site activation updated to:', isActive);
    
    res.json({
      success: true,
      message: `Site ${isActive === 'yes' ? 'activated' : 'deactivated'} successfully`,
      data: updatedSite
    });
    
  } catch (error) {
    console.error('❌ Error toggling site activation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating site activation'
    });
  }
};

exports.getSiteIdBySubdomain = async (req, res) => {
  try {
    const { subdomain } = req.params;
    console.log('🔍 Getting site ID by subdomain:', subdomain);
    
    const siteId = await siteService.getSiteIdBySubdomain(subdomain);
    
    if (!siteId) {
      return res.status(404).json({
        success: false,
        message: 'Site not found or not active'
      });
    }
    
    console.log('✅ Site ID found:', siteId);
    
    res.json({
      success: true,
      data: {
        id: siteId
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting site ID by subdomain:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting site ID'
    });
  }
};

// الحصول على user_id بواسطة site_id
exports.getUserIdBySiteId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Getting user ID for site:', id);
    
    const userId = await siteService.getUserIdBySiteId(id);
    
    if (!userId) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }
    
    console.log('✅ User ID found:', userId);
    
    res.json({
      success: true,
      data: {
        site_id: id,
        user_id: userId
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting user ID:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting user ID'
    });
  }
};
