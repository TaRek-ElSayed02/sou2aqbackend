const express = require('express');
const router = express.Router();
const mapsController = require('../controllers/maps.controller');
const { requireAuth, requireSiteOwnershipOrSuperAdmin } = require('../middleware/auth.middleware');
const mapsService = require('../services/maps.service');

// GET /api/maps/public/:siteId - Get all maps for a site (public)
router.get('/public/:siteId', mapsController.getMapsBySiteIdPublic);

// GET /api/maps/site/:siteId - Get all maps for a site (authenticated)
router.get('/site/:siteId', requireAuth, mapsController.getMapsBySiteId);

// GET /api/maps/:id - Get single map by ID
router.get('/:id', mapsController.getMapById);

// POST /api/maps - Create new map (site owner or superAdmin)
router.post('/', 
  requireAuth,
  mapsController.createMap
);

// PATCH /api/maps/:id - Update map (owner or superAdmin)
router.patch('/:id', 
  requireAuth,
  mapsController.updateMap
);

// DELETE /api/maps/:id - Delete map (owner or superAdmin)
router.delete('/:id', 
  requireAuth,
  mapsController.deleteMap
);

module.exports = router;