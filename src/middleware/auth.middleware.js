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
  
