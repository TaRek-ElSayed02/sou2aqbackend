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
  },
    checkUserOnly: (req, res, next) => {
    const userRole = req.user?.role;

    if (userRole === 'user') {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'هذا الإجراء متاح للمستخدمين فقط'
      });
    }
  },

  requireOwnershipOrSuperAdmin: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (req.user.role === 'superAdmin') {
      return next();
    }

    const requestedUserId = req.params.user_id;
    const currentUserId = req.user.id.toString();

    if (requestedUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only access your own wishlist'
      });
    }

    next();
  }
};

module.exports = auth;