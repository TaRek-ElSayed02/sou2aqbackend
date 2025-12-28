const auth = {
  checkSuperAdmin: (req, res, next) => {
    // هذا الميدل وير للتحقق من أن المستخدم هو superAdmin فقط
    // سيتم استخدامه في المسارات التي تحتاج صلاحيات superAdmin
    const userRole = req.user?.role || req.body?.role;
    
    if (userRole === 'superAdmin') {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحيات للقيام بهذا الإجراء'
      });
    }
  },

  checkAdminOrSuper: (req, res, next) => {
    const userRole = req.user?.role || req.body?.role;
    
    if (userRole === 'admin' || userRole === 'superAdmin') {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'صلاحيات غير كافية'
      });
    }
  }
};

module.exports = auth;