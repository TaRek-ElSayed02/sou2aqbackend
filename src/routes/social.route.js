const express = require('express');
const router = express.Router();
const socialController = require('../controllers/social.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// GET /api/social/public/:siteId - Get all social media for a site (public)
router.get('/public/:siteId', socialController.getSocialBySiteIdPublic);

// GET /api/social/site/:siteId - Get all social media for a site (authenticated)
router.get('/site/:siteId', requireAuth, socialController.getSocialBySiteId);

// GET /api/social/:id - Get single social media by ID
router.get('/:id', socialController.getSocialById);

// POST /api/social - Create new social media (site owner or superAdmin)
router.post('/', 
  requireAuth,
  socialController.createSocial
);

// PATCH /api/social/:id - Update social media (owner or superAdmin)
router.patch('/:id', 
  requireAuth,
  socialController.updateSocial
);

// DELETE /api/social/:id - Delete social media (owner or superAdmin)
router.delete('/:id', 
  requireAuth,
  socialController.deleteSocial
);

module.exports = router;