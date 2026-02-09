const express = require('express');
const router = express.Router();
const siteController = require('../controllers/site.controller');
const { 
  requireAuth, 
  requireOwnershipOrSuperAdmin,
  requireSiteOwnershipOrSuperAdmin,
  requireSuperAdmin 
} = require('../middleware/auth.middleware');
const { 
  validateUserIsAdmin, 
  uploadSiteImage 
} = require('../services/site.service');

// Middleware للتأكد من معالجة البيانات بشكل صحيح
router.use((req, res, next) => {
  console.log('📥 Site route request:', {
    method: req.method,
    url: req.url,
    contentType: req.get('Content-Type'),
    hasBody: !!req.body,
    user: req.user ? { id: req.user.id, role: req.user.role } : 'No user'
  });
  
  // تأكد من وجود body لطلبات POST و PATCH
  if ((req.method === 'POST' || req.method === 'PATCH') && !req.body) {
    console.log('⚠️ No body detected, initializing empty object');
    req.body = {};
  }
  
  next();
});

// ========== PUBLIC ROUTES ==========

// GET /api/sites/public/:subdomain - Public access to site by subdomain
router.get('/public/:subdomain', siteController.getSiteBySubdomain);

// GET /api/sites/:id - Get site by ID (public or authorized)
router.get('/:id', siteController.getSiteById);

// GET /api/sites/:id/user - Get user_id by site_id
router.get('/:id/user', 
  siteController.getUserIdBySiteId
);

// ========== PROTECTED ROUTES ==========

// GET /api/sites - Get all sites (for superAdmin) or user's own sites
router.get('/', requireAuth, siteController.getSites);

// POST /api/sites - Create site (admin only)
router.post('/', 
  requireAuth, 
  validateUserIsAdmin,
  uploadSiteImage,
  siteController.createSite
);

// PATCH /api/sites/:id - Update site (owner or superAdmin)
router.patch('/:id', 
  requireAuth, 
  requireSiteOwnershipOrSuperAdmin,
  uploadSiteImage,
  siteController.updateSite
);

// PATCH /api/sites/:id/activate - Activate/deactivate site (superAdmin only)
router.patch('/:id/activate', 
  requireAuth, 
  requireSuperAdmin,
  siteController.toggleSiteActivation
);

// DELETE /api/sites/:id - Delete site (owner or superAdmin)
router.delete('/:id', 
  requireAuth, 
  requireSiteOwnershipOrSuperAdmin,
  siteController.deleteSite
);


// GET /api/sites/id-by-subdomain/:subdomain - Get site ID by subdomain
router.get('/idBySubdomain/:subdomain', siteController.getSiteIdBySubdomain);

module.exports = router;